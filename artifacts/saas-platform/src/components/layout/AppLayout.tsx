import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useGetCurrentUser, useLogout, AuthUser, getGetCurrentUserQueryKey } from '@workspace/api-client-react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarTrigger } from '@/components/ui/sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Building2, Users, Upload, User, LogOut, Loader2, ChevronDown } from 'lucide-react';
import { Link } from 'wouter';

function AppSidebar({ user }: { user: AuthUser }) {
  const [location] = useLocation();

  const navItems = [
    { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['super_admin', 'company_admin', 'employee'] },
    { title: 'Companies', icon: Building2, href: '/companies', roles: ['super_admin'] },
    { title: 'Employees', icon: Users, href: '/employees', roles: ['super_admin', 'company_admin'] },
    { title: 'Users', icon: User, href: '/users', roles: ['super_admin', 'company_admin'] },
    { title: 'Excel Upload', icon: Upload, href: '/employees/upload', roles: ['super_admin', 'company_admin'] },
    { title: 'Profile', icon: User, href: '/profile', roles: ['super_admin', 'company_admin', 'employee'] },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="h-16 flex items-center justify-center border-b px-4 border-sidebar-border">
        <div className="flex w-full items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold shadow-sm">
            N
          </div>
          <span className="font-semibold text-lg tracking-tight truncate">Nexus</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {visibleItems.map((item) => {
              const isActive = location === item.href || location.startsWith(`${item.href}/`);
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function TopNav({ user }: { user: AuthUser }) {
  const logout = useLogout();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
        setLocation('/login');
      },
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <div className="h-4 w-px bg-border hidden sm:block mx-2" />
        <span className="text-sm font-medium text-muted-foreground hidden sm:block">
          {user.companyName || 'Administration Console'}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 p-1 pl-2 gap-2 pr-2 hover:bg-muted rounded-full">
              <div className="flex flex-col items-end text-right hidden sm:flex">
                <span className="text-sm font-medium leading-none">{user.name}</span>
                <span className="text-xs text-muted-foreground leading-none mt-1">
                  {user.role.replace('_', ' ')}
                </span>
              </div>
              <Avatar className="h-8 w-8 rounded-full border shadow-sm">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer flex items-center w-full">
                <User className="mr-2 h-4 w-4" />
                <span>Profile Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } = useGetCurrentUser({
    query: { retry: false, queryKey: getGetCurrentUserQueryKey() },
  });
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Only redirect after loading settles — never redirect while a refetch is in-flight
    if (!isLoading && isError) {
      setLocation('/login');
    }
  }, [isLoading, isError, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // isError → useEffect will redirect to /login; show spinner so there's no blank flash
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground selection:bg-primary/20">
        <AppSidebar user={user} />
        <main className="flex-1 flex flex-col min-w-0">
          <TopNav user={user} />
          <div className="flex-1 p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
