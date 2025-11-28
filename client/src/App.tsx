import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/mock-auth";
import { Layout } from "@/components/layout";
import { useEffect } from "react";

import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Extraction from "@/pages/extraction";
import History from "@/pages/history";
import Templates from "@/pages/templates";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";

function PrivateRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <Component {...rest} /> : <Redirect to="/login" />;
}

function Router() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={LoginPage} />
        
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
