import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';

import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Companies from '@/pages/Companies';
import CompanyNew from '@/pages/CompanyNew';
import CompanyDetail from '@/pages/CompanyDetail';
import Employees from '@/pages/Employees';
import EmployeeUpload from '@/pages/EmployeeUpload';
import Users from '@/pages/Users';
import Profile from '@/pages/Profile';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function AppRouter() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/companies" component={Companies} />
            <Route path="/companies/new" component={CompanyNew} />
            <Route path="/companies/:id" component={CompanyDetail} />
            <Route path="/employees" component={Employees} />
            <Route path="/employees/upload" component={EmployeeUpload} />
            <Route path="/users" component={Users} />
            <Route path="/profile" component={Profile} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AppRouter />
        </WouterRouter>
        <Toaster position="top-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
