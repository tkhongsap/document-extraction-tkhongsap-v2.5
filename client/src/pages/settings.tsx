import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useLanguageSync } from "@/hooks/useLanguageSync";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
<<<<<<< HEAD
import { Globe, User, Crown, Zap, Rocket } from "lucide-react";
=======
import { Globe, User, Crown, Zap, Rocket, Key, ChevronRight } from "lucide-react";
>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { changeTier } from "@/lib/api";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Lock } from "lucide-react";
import { Link } from "wouter";

export default function SettingsPage() {
  const { t } = useLanguage();
  const { language, syncLanguage } = useLanguageSync();
  const { user, refetch } = useAuth();
  const { toast } = useToast();
  const [isChangingTier, setIsChangingTier] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'free' | 'pro' | 'enterprise' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const tierPrices = {
    free: 0,
    pro: 299,
    enterprise: 999,
  };

  const handleSelectTier = (newTier: 'free' | 'pro' | 'enterprise') => {
    if (user?.tier === newTier) return;
    
    setSelectedTier(newTier);
    
    // If downgrading to free, no payment needed
    if (newTier === 'free') {
      // Direct tier change without payment
      handleChangeTierDirect(newTier);
    } else {
      // Show payment dialog for paid tiers
      setShowPaymentDialog(true);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTier) {
      toast({
        title: "Error",
        description: "Please select a tier",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Process tier change after successful payment
      await handleChangeTierDirect(selectedTier);
      
      // Close dialog only on success
      setShowPaymentDialog(false);
      setSelectedTier(null);
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangeTierDirect = async (newTier: 'free' | 'pro' | 'enterprise') => {
    setIsChangingTier(true);
    try {
      const result = await changeTier(newTier);
      toast({
        title: "Success",
        description: result.message,
      });
      await refetch();
      // Reset state only on success
      setSelectedTier(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change tier",
        variant: "destructive",
      });
      throw error; // Re-throw for handlePayment to catch
    } finally {
      setIsChangingTier(false);
    }
  };

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user?.firstName || user?.email || 'User';
  
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.settings')}</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Language</CardTitle>
              <CardDescription>Choose your preferred language</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto">
                <Globe className="mr-2 h-4 w-4" />
                {language === 'en' ? 'English' : 'ไทย (Thai)'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => syncLanguage('en')}>
                English {language === 'en' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => syncLanguage('th')}>
                ไทย (Thai) {language === 'th' && '✓'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.profileImageUrl || undefined} alt={displayName} className="object-cover" />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{displayName}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Separator />
          <div>
            <label className="text-sm font-medium text-muted-foreground">Plan</label>
            <p className="text-sm mt-1 capitalize">{user?.tier || 'Free'} Plan</p>
          </div>
          <Separator />
          <div>
            <label className="text-sm font-medium text-muted-foreground">Monthly Usage</label>
            <p className="text-sm mt-1">
              {user?.monthlyUsage || 0} / {user?.monthlyLimit || 100} pages
            </p>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ 
                  width: `${Math.min(((user?.monthlyUsage || 0) / (user?.monthlyLimit || 100)) * 100, 100)}%` 
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

<<<<<<< HEAD
=======
      {/* API Keys */}
      <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
        <Link href="/settings/api-keys">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>Manage your API keys for programmatic access</CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </CardHeader>
        </Link>
      </Card>

>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd
      {/* Subscription Plans */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Subscription Plans</CardTitle>
              <CardDescription>Choose the plan that fits your needs</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Free Tier */}
          <div className={`border rounded-lg p-4 ${user?.tier === 'free' ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Free Plan</h3>
                  <p className="text-sm text-muted-foreground">100 pages/month</p>
                </div>
              </div>
              <Button
                size="sm"
                variant={user?.tier === 'free' ? 'secondary' : 'outline'}
                disabled={user?.tier === 'free' || isChangingTier || isProcessing}
                onClick={() => handleSelectTier('free')}
              >
                {user?.tier === 'free' ? 'Current Plan' : 'Switch to Free'}
              </Button>
            </div>
          </div>

          {/* Pro Tier */}
          <div className={`border rounded-lg p-4 ${user?.tier === 'pro' ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Rocket className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Pro Plan</h3>
                  <p className="text-sm text-muted-foreground">1,000 pages/month</p>
                </div>
              </div>
              <Button
                size="sm"
                variant={user?.tier === 'pro' ? 'secondary' : 'default'}
                disabled={user?.tier === 'pro' || isChangingTier || isProcessing}
                onClick={() => handleSelectTier('pro')}
              >
                {user?.tier === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
              </Button>
            </div>
          </div>

          {/* Enterprise Tier */}
          <div className={`border rounded-lg p-4 ${user?.tier === 'enterprise' ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">Enterprise Plan</h3>
                  <p className="text-sm text-muted-foreground">10,000 pages/month</p>
                </div>
              </div>
              <Button
                size="sm"
                variant={user?.tier === 'enterprise' ? 'secondary' : 'default'}
                disabled={user?.tier === 'enterprise' || isChangingTier || isProcessing}
                onClick={() => handleSelectTier('enterprise')}
              >
                {user?.tier === 'enterprise' ? 'Current Plan' : 'Upgrade to Enterprise'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Complete Your Upgrade
            </DialogTitle>
            <DialogDescription>
              Upgrade to {selectedTier?.toUpperCase()} plan for ฿{selectedTier ? tierPrices[selectedTier] : 0}/month
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handlePayment}>
            <div className="space-y-4 py-4">
              {/* Mock Credit Card Form */}
              <div className="space-y-2">
                <Label htmlFor="card-number">Card Number</Label>
                <Input
                  id="card-number"
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  required
                  disabled={isProcessing}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/YY"
                    maxLength={5}
                    required
                    disabled={isProcessing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    placeholder="123"
                    maxLength={3}
                    required
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Cardholder Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  required
                  disabled={isProcessing}
                />
              </div>

              {/* Security Notice */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Lock className="h-4 w-4" />
                <span>This is a demo payment. No actual charges will be made.</span>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPaymentDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Processing...
                  </>
                ) : (
                  `Pay ฿${selectedTier ? tierPrices[selectedTier] : 0}`
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}



