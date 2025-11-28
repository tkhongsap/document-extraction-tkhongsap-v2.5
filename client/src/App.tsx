import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout";

import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Extraction from "@/pages/extraction";
import History from "@/pages/history";
import Templates from "@/pages/templates";
import Settings from "@/pages/settings";
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
    window.location.href = "/api/login";
    return null;
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

        <Route path="/templates">
          {() => <PrivateRoute component={Templates} />}
        </Route>

        <Route path="/settings">
          {() => <PrivateRoute component={Settings} />}
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
