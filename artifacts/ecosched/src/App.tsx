import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { AppShell } from '@/components/shell';
import { BeforeAfterPage, Dashboard, DataCenterPage, Landing, ResultsPage, SchedulingPage, WeatherEnergyPage, WorkloadsPage } from '@/pages/ecosched-pages';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/dashboard">
          <AppShell><Dashboard /></AppShell>
        </Route>
        <Route path="/data-center">
          <AppShell><DataCenterPage /></AppShell>
        </Route>
        <Route path="/workloads">
          <AppShell><WorkloadsPage /></AppShell>
        </Route>
        <Route path="/weather-energy">
          <AppShell><WeatherEnergyPage /></AppShell>
        </Route>
        <Route path="/scheduling">
          <AppShell><SchedulingPage /></AppShell>
        </Route>
        <Route path="/before-after">
          <AppShell><BeforeAfterPage /></AppShell>
        </Route>
        <Route path="/results">
          <AppShell><ResultsPage /></AppShell>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
