import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export default function LoginPage() {
  const { t } = useLanguage();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white">
              <FileText className="h-7 w-7" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-primary">DocExtract</CardTitle>
          <CardDescription className="text-base">
            {t('auth.login_subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            className="w-full h-11 text-base font-medium" 
            onClick={handleLogin}
            data-testid="button-login"
          >
            Sign In
          </Button>

          <div className="text-center text-xs text-muted-foreground mt-6">
            Sign in with Google, GitHub, or other providers
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
