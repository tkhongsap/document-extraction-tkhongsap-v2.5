import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/mock-auth";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  Files,
  History,
  Settings,
  LogOut,
  Globe,
  Menu,
  X,
  Check,
  Lock,
  ShieldCheck,
  ArrowRight,
  Plus
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { progressAnimation } from "@/lib/animations";

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
  }

  return <PublicLayout>{children}</PublicLayout>;
}

function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLanguage('en')}>
          English {language === 'en' && '✓'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage('th')}>
          ไทย (Thai) {language === 'th' && '✓'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const { login } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b transition-all duration-200",
          isScrolled
            ? "bg-background/95 backdrop-blur-md border-border shadow-sm"
            : "bg-transparent border-transparent"
        )}
      >
        <div className="container flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-xl text-foreground">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white">
              <FileText className="h-5 w-5" />
            </div>
            <span className="tracking-tight">DocExtract</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="/" className="text-muted-foreground transition-colors hover:text-foreground">{t('nav.home')}</Link>
            <Link href="/#pricing" className="text-muted-foreground transition-colors hover:text-foreground">{t('nav.pricing')}</Link>
            <Link href="/#about" className="text-muted-foreground transition-colors hover:text-foreground">{t('nav.about')}</Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" onClick={() => login()}>{t('nav.signin')}</Button>
            <Button onClick={() => login()}>
              {t('hero.cta_primary')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-4 md:hidden">
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <motion.div
            className="md:hidden border-t p-6 space-y-4 bg-background"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Link href="/" className="block text-sm font-medium py-2" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.home')}</Link>
            <Link href="/#pricing" className="block text-sm font-medium py-2" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.pricing')}</Link>
            <Link href="/#about" className="block text-sm font-medium py-2" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.about')}</Link>
            <div className="pt-4 space-y-3">
              <Button variant="outline" className="w-full" onClick={() => login()}>{t('nav.signin')}</Button>
              <Button className="w-full" onClick={() => login()}>{t('hero.cta_primary')}</Button>
            </div>
          </motion.div>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t py-16 bg-muted/20">
      <div className="container px-6 mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-semibold text-lg">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white">
                <FileText className="h-4 w-4" />
              </div>
              DocExtract
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Secure document extraction for Thai businesses. Extract structured data in seconds.
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Product</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/#about" className="hover:text-foreground transition-colors">Features</Link></li>
              <li><Link href="/#pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Company</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/#about" className="hover:text-foreground transition-colors">About</Link></li>
            </ul>
          </div>

          {/* Security Trust Indicators */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Security</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                Bank-grade Encryption
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                PDPA Compliant
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                Auto-delete in 24hrs
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                SOC 2 Type II
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© 2024 DocExtract. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const { logout, user } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { href: '/extraction/general', icon: Plus, label: t('nav.general'), isPrimary: true },
    { href: '/templates', icon: Files, label: t('nav.templates') },
    { href: '/history', icon: History, label: t('nav.history') },
    { href: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  const usagePercent = (user!.monthlyUsage / user!.monthlyLimit) * 100;

  // Mobile nav items (simplified for bottom bar)
  const mobileNavItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { href: '/extraction/general', icon: Plus, label: t('nav.general') },
    { href: '/history', icon: History, label: t('nav.history') },
    { href: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg text-sidebar-foreground">
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-white">
              <FileText className="h-4 w-4" />
            </div>
            DocExtract
          </Link>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== '/dashboard' && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70",
                  item.isPrimary && "bg-sidebar-primary/10 text-sidebar-primary hover:bg-sidebar-primary/20 font-semibold"
                )}>
                  {/* Active indicator bar */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-sidebar-primary"
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  <item.icon className="h-4 w-4 ml-1" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-4">
          {/* Usage Widget */}
          <div className="p-4 rounded-xl bg-sidebar-accent/50">
            <div className="flex justify-between mb-2 text-xs">
              <span className="text-sidebar-foreground/70">{t('common.usage')}</span>
              <span className="font-medium text-sidebar-foreground">
                {user?.monthlyUsage} / {user?.monthlyLimit}
              </span>
            </div>
            <div className="h-2 w-full bg-sidebar-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-sidebar-primary to-sidebar-primary/70 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${usagePercent}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              />
            </div>
            {usagePercent > 80 && (
              <div className="mt-3">
                <Button size="sm" variant="outline" className="w-full text-xs bg-sidebar-accent border-sidebar-border hover:bg-sidebar-accent/80">
                  {t('common.upgrade')}
                </Button>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-medium">
                {user?.name.charAt(0)}
              </div>
              <div className="text-sm">
                <div className="font-medium truncate max-w-[100px] text-sidebar-foreground">{user?.name}</div>
                <div className="text-xs text-sidebar-foreground/50">Pro Plan</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex h-16 items-center justify-between border-b bg-background px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-white">
              <FileText className="h-4 w-4" />
            </div>
            <span className="tracking-tight">DocExtract</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex h-16 items-center justify-between border-b bg-background px-6">
          <h1 className="text-lg font-semibold tracking-tight">
            {navItems.find(i => location === i.href || (i.href !== '/dashboard' && location.startsWith(i.href)))?.label || 'DocExtract'}
          </h1>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <motion.div
            className="md:hidden fixed inset-0 z-50 bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex flex-col h-full">
              <div className="flex h-16 items-center justify-between border-b px-4">
                <span className="font-semibold text-lg">Menu</span>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <X />
                </Button>
              </div>
              <nav className="flex-1 py-6 px-4 space-y-2">
                {navItems.map((item) => {
                  const isActive = location === item.href || (item.href !== '/dashboard' && location.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                      <div className={cn(
                        "flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-all",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/70 hover:bg-muted"
                      )}>
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </div>
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t p-4 space-y-4">
                <div className="p-4 rounded-xl bg-muted/50">
                  <div className="flex justify-between mb-2 text-xs">
                    <span className="text-muted-foreground">{t('common.usage')}</span>
                    <span className="font-medium">
                      {user?.monthlyUsage} / {user?.monthlyLimit}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${usagePercent}%` }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                      {user?.name.charAt(0)}
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{user?.name}</div>
                      <div className="text-xs text-muted-foreground">Pro Plan</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={logout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <main className="flex-1 overflow-auto p-6 bg-muted/20 pb-20 md:pb-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background z-40">
          <div className="grid grid-cols-4 h-16">
            {mobileNavItems.map((item) => {
              const isActive = location === item.href || (item.href !== '/dashboard' && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex flex-col items-center justify-center gap-1 h-full transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}>
                    <item.icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
