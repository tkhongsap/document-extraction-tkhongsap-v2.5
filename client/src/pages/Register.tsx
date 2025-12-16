import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { register, verifyEmail, resendVerification } from "@/lib/api";

interface PasswordValidationErrors {
  type: string;
  message: string;
  errors?: string[];
}

export default function RegisterPage() {
  const { t } = useLanguage();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: ""
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | PasswordValidationErrors | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  // Password strength validation
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, authLoading, setLocation]);

  useEffect(() => {
    // Validate password strength in real-time
    if (formData.password) {
      const errors: string[] = [];
      
      if (formData.password.length < 8) {
        errors.push("Must be at least 8 characters long");
      }
      if (!/[a-z]/.test(formData.password)) {
        errors.push("Must contain at least one lowercase letter");
      }
      if (!/[A-Z]/.test(formData.password)) {
        errors.push("Must contain at least one uppercase letter");
      }
      if (!/\d/.test(formData.password)) {
        errors.push("Must contain at least one digit");
      }
      if (!/[!@#$%^&*(),.?\":{}|<>]/.test(formData.password)) {
        errors.push("Must contain at least one special character");
      }
      
      setPasswordErrors(errors);
    } else {
      setPasswordErrors([]);
    }
  }, [formData.password]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client-side validations
    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
      setError("All fields are required");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (passwordErrors.length > 0) {
      setError("Please fix password requirements");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await register({
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name
      });
      
      setSuccess(response.message);
      setRegistrationComplete(true);
      setRegisteredEmail(formData.email);
      
    } catch (err: any) {
      console.log('Registration error:', err);
      setError(err.response?.data || err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      const response = await resendVerification(registeredEmail);
      setSuccess(response.message);
    } catch (err: any) {
      setError(err.response?.data || err.message || "Failed to resend verification");
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
            {registrationComplete ? "Check Your Email" : "Create your account"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {registrationComplete 
              ? "We've sent a verification link to your email address"
              : "Join DocExtract to process your documents"
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          {registrationComplete ? (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  A verification email has been sent to:
                  <br />
                  <strong className="text-foreground">{registeredEmail}</strong>
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Please click the verification link in your email to complete your registration.
                </p>
              </div>
              
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  onClick={handleResendVerification}
                  className="w-full"
                >
                  Resend Verification Email
                </Button>
                
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
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
                {passwordErrors.length > 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p className="font-medium mb-1">Password requirements:</p>
                    <ul className="space-y-1">
                      {passwordErrors.map((error, index) => (
                        <li key={index} className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {typeof error === "string" ? error : (
                      <div>
                        <p>{error.message}</p>
                        {error.errors && (
                          <ul className="mt-2 space-y-1">
                            {error.errors.map((err, index) => (
                              <li key={index}>• {err}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>

              <Separator />

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Already have an account?{" "}
                  <Link href="/login">
                    <Button variant="ghost" className="p-0 h-auto font-semibold">
                      Sign in
                    </Button>
                  </Link>
                </p>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}