import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import {
  DocumentsPage,
  ForgotPasswordPage,
  HowItWorksPage,
  LandingPage,
  LoginPage,
  NewDocumentPage,
  ProcessingPage,
  RegisterPage,
  ResultsPage,
  SettingsPage,
} from '@/components/documind';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

/**
 * Gates a route behind an authenticated session.
 *
 * While the session check (/api/auth/me) is in flight, we show a neutral
 * loading state rather than redirecting -- redirecting before we know the
 * answer would bounce a legitimately logged-in user back to /login on every
 * page refresh. Once resolved, unauthenticated visitors are redirected to
 * /login with a `from` query param so the login page can send them back
 * afterward.
 */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-paper text-sm text-ink/55">
        <div className="flex items-center gap-3">
          <LoaderCircle size={18} className="animate-spin text-terracotta" />
          Checking your session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation(`/login?from=${encodeURIComponent(location)}`);
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/how-it-works" component={HowItWorksPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/documents">
          <ProtectedRoute><DocumentsPage /></ProtectedRoute>
        </Route>
        <Route path="/documents/new">
          <ProtectedRoute><NewDocumentPage /></ProtectedRoute>
        </Route>
        <Route path="/documents/:id/processing">
          {(params) => <ProtectedRoute><ProcessingPage id={params.id} /></ProtectedRoute>}
        </Route>
        <Route path="/documents/:id">
          {(params) => <ProtectedRoute><ResultsPage id={params.id} /></ProtectedRoute>}
        </Route>
        <Route path="/settings">
          <ProtectedRoute><SettingsPage /></ProtectedRoute>
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
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;