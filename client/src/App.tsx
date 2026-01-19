import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/Register";
import EmailVerification from "@/pages/EmailVerification";
import Pricing from "@/pages/pricing";
import UseCases from "@/pages/use-cases";
import Security from "@/pages/security";
import Capabilities from "@/pages/capabilities";
import Dashboard from "@/pages/dashboard";
import Extraction from "@/pages/extraction";
import History from "@/pages/history";
import ExtractionDetail from "@/pages/extraction-detail";
import Templates from "@/pages/templates";
import Settings from "@/pages/settings";
import ApiKeysSettings from "@/pages/settings/api-keys";
import ApiDocsPage from "@/pages/settings/api-docs";
import ResumeSearch from "@/pages/resume-search";
import NotFound from "@/pages/not-found";

function PrivateRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }
  
  return <Component {...rest} />;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Layout>
      <Switch>
        {isLoading || !isAuthenticated ? (
          <Route path="/" component={Home} />
        ) : (
          <Route path="/">
            <Redirect to="/dashboard" />
          </Route>
        )}

        <Route path="/pricing" component={Pricing} />
        <Route path="/use-cases" component={UseCases} />
        <Route path="/security" component={Security} />
        <Route path="/capabilities" component={Capabilities} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/verify-email" component={EmailVerification} />

        {/* Protected Routes */}
        <Route path="/dashboard">
          {() => <PrivateRoute component={Dashboard} />}
        </Route>
        
        <Route path="/extraction/:type">
          {() => <PrivateRoute component={Extraction} />}
        </Route>

        <Route path="/history">
          {() => <PrivateRoute component={History} />}
        </Route>

        <Route path="/history/:id">
          {() => <PrivateRoute component={ExtractionDetail} />}
        </Route>

        <Route path="/templates">
          {() => <PrivateRoute component={Templates} />}
        </Route>

        <Route path="/settings">
          {() => <PrivateRoute component={Settings} />}
        </Route>

        <Route path="/settings/api-keys">
          {() => <PrivateRoute component={ApiKeysSettings} />}
        </Route>

        {/* Legacy route redirect: /api-keys -> /settings/api-keys */}
        <Route path="/api-keys">
          <Redirect to="/settings/api-keys" />
        </Route>

        <Route path="/settings/api-docs">
          {() => <PrivateRoute component={ApiDocsPage} />}
        </Route>

        <Route path="/resume-search">
          {() => <PrivateRoute component={ResumeSearch} />}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
