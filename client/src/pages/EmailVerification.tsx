import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link, useSearch } from "wouter";
import { verifyEmail } from "@/lib/api";

export default function EmailVerificationPage() {
  const { t } = useLanguage();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, authLoading, setLocation]);

  useEffect(() => {
    // Get token from URL parameters
    const urlParams = new URLSearchParams(searchParams);
    const token = urlParams.get('token');
    
    if (token) {
      handleVerification(token);
    } else {
      setError("No verification token found in URL");
    }
  }, [searchParams]);

  const handleVerification = async (token: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await verifyEmail(token);
      setSuccess(response.message);
      setVerifiedEmail(response.email);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        setLocation('/login');
      }, 3000);
      
    } catch (err: any) {
      console.log('Verification error:', err);
      setError(err.response?.data?.message || err.message || "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            Email Verification
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isLoading ? "Verifying your email address..." : "Email verification status"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center space-y-4">
              <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
              <p className="text-sm text-muted-foreground">
                Please wait while we verify your email address...
              </p>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
                  Email Verified Successfully!
                </h3>
                {verifiedEmail && (
                  <p className="text-sm text-muted-foreground mb-4">
                    <strong className="text-foreground">{verifiedEmail}</strong> has been verified.
                  </p>
                )}
                <p className="text-sm text-muted-foreground mb-4">
                  Your account is now active. You will be redirected to the login page in a few seconds.
                </p>
              </div>
              
              <div className="space-y-3">
                <Link href="/login">
                  <Button className="w-full">
                    Continue to Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
                  Verification Failed
                </h3>
              </div>

              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  The verification link may be expired or invalid.
                </p>
                
                <Link href="/register">
                  <Button variant="outline" className="w-full">
                    Try Registering Again
                  </Button>
                </Link>
                
                <div className="text-center">
                  <Link href="/login">
                    <Button variant="ghost" className="text-sm">
                      Back to Login
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No verification token found. Please check your email for the verification link.
              </p>
              
              <div className="mt-4">
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}