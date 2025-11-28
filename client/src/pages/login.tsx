import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/mock-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

// Icons for social providers
function LineIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.6 9c0-3.9-3.9-7-8.6-7s-8.6 3.1-8.6 7c0 3.5 2.8 6.4 6.9 6.9.3 0 .7.1.8.4 0 .2-.1.8-.2 1.3-.1.4-.4 1.5 1.3.8 5.3-2.4 8.4-5.5 8.4-9.4" />
    </svg>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .533 5.333.533 12S5.867 24 12.48 24c3.44 0 6.013-1.133 8.053-3.24 2.08-2.08 2.72-5.2 2.72-7.613 0-.787-.08-1.52-.24-2.227h-10.533z" />
    </svg>
  );
}

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function AppleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24.02-1.44.58-2.52-.02-3.45-.95-4.73-4.85-3.93-11.68 1.63-11.98 1.51-.09 2.64.84 3.47.87.86 0 2.46-1.05 4.12-.9 1.75.16 3.07.87 3.92 2.15-3.54 1.86-2.97 5.76.26 7.08-.61 1.6-1.47 3.16-2.63 4.31zm-1.73-16.6c.55-2.36 2.72-3.68 4.96-3.68.2.57-.66 2.96-2.46 4.24-1.71 1.18-4.17 1.07-4.5-.56z" />
    </svg>
  );
}

export default function LoginPage() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await login();
      setLocation('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
          {/* LINE Login - Prioritized as requested */}
          <Button 
            className="w-full bg-[#00B900] hover:bg-[#009900] text-white h-11 text-base font-medium" 
            onClick={handleLogin}
            disabled={isLoading}
            data-testid="button-login-line"
          >
            <LineIcon className="mr-2 h-5 w-5" />
            {t('auth.continue_line')}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button variant="outline" className="h-11" onClick={handleLogin} disabled={isLoading} title={t('auth.continue_google')} data-testid="button-login-google">
              <GoogleIcon className="h-5 w-5" />
            </Button>
            <Button variant="outline" className="h-11" onClick={handleLogin} disabled={isLoading} title={t('auth.continue_facebook')} data-testid="button-login-facebook">
              <FacebookIcon className="h-5 w-5 text-[#1877F2]" />
            </Button>
            <Button variant="outline" className="h-11" onClick={handleLogin} disabled={isLoading} title={t('auth.continue_apple')} data-testid="button-login-apple">
              <AppleIcon className="h-5 w-5" />
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
