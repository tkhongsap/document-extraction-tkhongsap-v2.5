import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook that syncs language preference to database
 * - Initializes language from user.language on auth
 * - Syncs language changes to database via API
 */
export function useLanguageSync() {
  const { language, setLanguage, initializeLanguage } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Initialize language from user data on mount/auth
  // Note: Intentionally excluding 'language' from deps to prevent reset loop
  // when user manually changes language via UI
  useEffect(() => {
    if (user?.language) {
      const userLang = user.language as 'en' | 'th';
      initializeLanguage(userLang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.language, initializeLanguage]);

  // Mutation to update language in database
  const updateLanguageMutation = useMutation({
    mutationFn: async (newLanguage: 'en' | 'th') => {
      const res = await fetch('/api/user/language', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ language: newLanguage }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update language');
      }

      return res.json();
    },
    onSuccess: () => {
      // Invalidate user query to refetch with new language
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  // Wrapper function that updates both local state and database
  const syncLanguage = (newLanguage: 'en' | 'th') => {
    setLanguage(newLanguage);
    // Only persist to database if user is authenticated
    if (user) {
      updateLanguageMutation.mutate(newLanguage);
    }
  };

  return {
    language,
    syncLanguage,
    isUpdating: updateLanguageMutation.isPending,
  };
}

