import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();

  const handleLogin = async () => {
    // Use mock login in development
    if (import.meta.env.DEV) {
      try {
        const res = await fetch('/api/auth/mock-login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          window.location.href = '/dashboard';
        } else {
          console.error('Mock login failed');
          window.location.href = "/api/login";
        }
      } catch (error) {
        console.error('Mock login error:', error);
        window.location.href = "/api/login";
      }
    } else {
      window.location.href = "/api/login";
    }
  };

  const handleHashLink = (hash: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (location !== '/') {
      // Navigate to home first, then scroll after navigation
      window.location.href = `/${hash}`;
    } else {
      // Already on home page, scroll directly
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          const headerOffset = 80; // Account for sticky header
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 0);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle hash navigation when on home page
  useEffect(() => {
    if (location === '/' && window.location.hash) {
      const hash = window.location.hash;
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [location]);

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
            <Link href="/capabilities" className="text-muted-foreground transition-colors hover:text-foreground">{t('nav.capabilities')}</Link>
            <Link href="/use-cases" className="text-muted-foreground transition-colors hover:text-foreground">{t('nav.usecases')}</Link>
            <Link href="/pricing" className="text-muted-foreground transition-colors hover:text-foreground">{t('nav.pricing')}</Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" onClick={handleLogin} data-testid="button-signin">{t('nav.signin')}</Button>
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
            <Link href="/capabilities" className="block text-sm font-medium py-2" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.capabilities')}</Link>
            <Link href="/use-cases" className="block text-sm font-medium py-2" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.usecases')}</Link>
            <Link href="/pricing" className="block text-sm font-medium py-2" onClick={() => setIsMobileMenuOpen(false)}>{t('nav.pricing')}</Link>
            <div className="pt-4 space-y-3">
              <Button variant="outline" className="w-full" onClick={handleLogin}>{t('nav.signin')}</Button>
            </div>
          </motion.div>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <Footer handleHashLink={handleHashLink} />
    </div>
  );
}

function Footer({ handleHashLink }: { handleHashLink: (hash: string, e: React.MouseEvent) => void }) {
  const { t } = useLanguage();
  
  return (
    <footer className="relative border-t bg-gradient-to-b from-cream via-cream/95 to-cream/90 overflow-hidden">
      {/* Decorative gold accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/40 to-transparent" />
      
      {/* Subtle background glow effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[hsl(var(--gold))]/3 rounded-full blur-3xl opacity-50" />
      
      <div className="container relative px-6 mx-auto py-20 lg:py-24">
        <div className="grid md:grid-cols-3 gap-16 lg:gap-20 mb-16">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-5"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center gap-3 group"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300 group-hover:scale-105">
                <FileText className="h-5 w-5" />
              </div>
              <span className="font-display font-semibold text-xl tracking-tight text-foreground">DocExtract</span>
            </motion.div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {t('footer.description')}
            </p>
          </motion.div>

          {/* Product Links Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-5"
          >
            <h4 className="font-semibold text-sm uppercase tracking-wider text-foreground/90">
              {t('footer.product')}
            </h4>
            <ul className="space-y-3.5">
              <li>
                <Link 
                  href="/use-cases" 
                  className="group inline-flex items-center text-sm text-muted-foreground hover:text-[hsl(var(--gold))] transition-all duration-300 hover:translate-x-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--gold))]/0 group-hover:bg-[hsl(var(--gold))] mr-2 transition-all duration-300" />
                  {t('nav.usecases')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/security" 
                  className="group inline-flex items-center text-sm text-muted-foreground hover:text-[hsl(var(--gold))] transition-all duration-300 hover:translate-x-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--gold))]/0 group-hover:bg-[hsl(var(--gold))] mr-2 transition-all duration-300" />
                  {t('nav.security')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/pricing" 
                  className="group inline-flex items-center text-sm text-muted-foreground hover:text-[hsl(var(--gold))] transition-all duration-300 hover:translate-x-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--gold))]/0 group-hover:bg-[hsl(var(--gold))] mr-2 transition-all duration-300" />
                  {t('nav.pricing')}
                </Link>
              </li>
            </ul>
          </motion.div>

          {/* Security Trust Indicators Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-5"
          >
            <h4 className="font-semibold text-sm uppercase tracking-wider text-foreground/90">
              {t('footer.security')}
            </h4>
            <ul className="space-y-3.5">
              {[
                { key: 'footer.security_encryption', icon: Check },
                { key: 'footer.security_pdpa', icon: Check },
                { key: 'footer.security_autodelete', icon: Check },
                { key: 'footer.security_soc2', icon: Check },
              ].map((item, i) => (
                <motion.li
                  key={item.key}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.05 }}
                  className="flex items-center gap-3 group"
                >
                  <div className="h-5 w-5 rounded-md bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/20 flex items-center justify-center group-hover:bg-[hsl(var(--gold))]/20 group-hover:border-[hsl(var(--gold))]/30 transition-all duration-300">
                    <item.icon className="h-3 w-3 text-[hsl(var(--gold))]" />
                  </div>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                    {t(item.key)}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Copyright Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="pt-8 border-t border-border/50"
        >
          <p className="text-center text-sm text-muted-foreground/80">
            {t('footer.copyright')}
          </p>
        </motion.div>
      </div>
    </footer>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user?.firstName || user?.email?.split('@')[0] || 'User';
  
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { href: '/extraction/general', icon: Plus, label: t('nav.general'), isPrimary: true },
    { href: '/templates', icon: Files, label: t('nav.templates') },
    { href: '/history', icon: History, label: t('nav.history') },
    { href: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  const usagePercent = user ? (user.monthlyUsage / user.monthlyLimit) * 100 : 0;

  const mobileNavItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { href: '/extraction/general', icon: Plus, label: t('nav.general') },
    { href: '/history', icon: History, label: t('nav.history') },
    { href: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-16 px-4 border-b border-sidebar-border flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg text-sidebar-foreground">
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-white">
              <FileText className="h-4 w-4" />
            </div>
            <span className="group-data-[collapsible=icon]:hidden">DocExtract</span>
          </Link>
          <SidebarTrigger />
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== '/dashboard' && location.startsWith(item.href));
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.label}
                    className={cn(
                      item.isPrimary && !isActive && "font-semibold",
                      isActive && item.isPrimary && "font-semibold"
                    )}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-4 space-y-4">
          {/* Usage Widget */}
          <div className="p-4 rounded-xl bg-sidebar-accent/50 group-data-[collapsible=icon]:hidden">
            <div className="flex justify-between mb-2 text-xs">
              <span className="text-sidebar-foreground/70">{t('common.usage')}</span>
              <span className="font-medium text-sidebar-foreground">
                {user?.monthlyUsage || 0} / {user?.monthlyLimit || 100}
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
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.profileImageUrl || undefined} alt={displayName} className="object-cover" />
                <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary font-medium">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-sm group-data-[collapsible=icon]:hidden">
                <div className="font-medium truncate max-w-[100px] text-sidebar-foreground">{displayName}</div>
                <div className="text-xs text-sidebar-foreground/50 capitalize">{user?.tier || 'Free'} Plan</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              data-testid="button-sidebar-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col overflow-hidden h-screen">
        <div className="flex flex-col flex-1 overflow-hidden">
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
              <SidebarTrigger />
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
                        {user?.monthlyUsage || 0} / {user?.monthlyLimit || 100}
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
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user?.profileImageUrl || undefined} alt={displayName} className="object-cover" />
                        <AvatarFallback className="bg-primary/20 text-primary font-medium">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="text-sm">
                        <div className="font-medium">{displayName}</div>
                        <div className="text-xs text-muted-foreground capitalize">{user?.tier || 'Free'} Plan</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex-1 overflow-auto p-6 bg-muted/20 pb-20 md:pb-6">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </div>
        </div>

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
      </SidebarInset>
    </SidebarProvider>
  );
}
