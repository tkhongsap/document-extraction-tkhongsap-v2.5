/**
 * Security utilities for DevTools protection
 * 
 * Controlled by VITE_DISABLE_DEVTOOLS environment variable:
 * - Set to 'true' to enable protection
 * - Set to 'false' or omit to disable (default for development)
 * 
 * Also automatically enables protection when:
 * - Running on non-localhost domains (production)
 */

// Check if DevTools protection should be enabled
const shouldDisableDevTools = (): boolean => {
  // Check environment variable first
  const envDisable = import.meta.env.VITE_DISABLE_DEVTOOLS === 'true';
  
  // If explicitly set to true, enable protection
  if (envDisable) return true;
  
  // Auto-enable on production (non-localhost)
  const isLocalhost = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('192.168.');
    
  // In production mode and not localhost, enable protection
  if (import.meta.env.PROD && !isLocalhost) return true;
  
  return false;
};

/**
 * Initialize DevTools protection
 * Call this once at app startup
 */
export function initSecurityProtection(): void {
  if (!shouldDisableDevTools()) {
    console.log('[Security] DevTools protection disabled (development mode)');
    return;
  }

  console.log('[Security] DevTools protection enabled');

  // Disable right-click context menu
  document.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
    return false;
  });

  // Disable keyboard shortcuts for DevTools
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+I (Inspect)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+C (Element selector)
    if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+U (View source)
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
      e.preventDefault();
      return false;
    }
  });

  // Console warning message
  console.log(
    '%c⚠️ Warning!', 
    'color: #ff6b6b; font-size: 40px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);'
  );
  console.log(
    '%cThis is a protected application. Unauthorized access is prohibited.', 
    'color: #495057; font-size: 16px;'
  );
  console.log(
    '%cIf you were directed here by someone, it may be an attempt to compromise your account.', 
    'color: #868e96; font-size: 14px;'
  );
}

/**
 * Clear all sensitive data from browser storage
 * Call this on logout
 */
export function clearSensitiveStorage(): void {
  // Clear localStorage
  localStorage.clear();
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  console.log('[Security] Browser storage cleared');
}
