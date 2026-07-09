import { useGetCurrentUser } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Profile() {
  const { data: user } = useGetCurrentUser();

  if (!user) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Your Profile</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your personal account settings.
        </p>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/80 to-primary w-full" />
        <CardContent className="px-6 pb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-16 sm:-mt-12 mb-8">
            <Avatar className="h-32 w-32 rounded-full border-4 border-card shadow-lg bg-card">
              <AvatarFallback className="text-4xl text-primary font-bold bg-primary/10">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left flex-1 mb-2">
              <h1 className="text-2xl font-bold">{user.name}</h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
            <div className="mb-2">
              <Badge variant="outline" className="px-4 py-1.5 text-sm uppercase tracking-wider font-semibold shadow-sm border-primary/20 bg-primary/5 text-primary">
                {user.role.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-3">
                  <User className="h-4 w-4" /> Personal Information
                </h3>
                <div className="space-y-4 p-4 rounded-xl border border-border/50 bg-muted/20">
                  <div>
                    <p className="text-xs text-muted-foreground">Full Name</p>
                    <p className="font-medium text-sm mt-0.5">{user.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email Address</p>
                    <p className="font-medium text-sm mt-0.5">{user.email}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4" /> Organization
                </h3>
                <div className="space-y-4 p-4 rounded-xl border border-border/50 bg-muted/20">
                  <div>
                    <p className="text-xs text-muted-foreground">Company Name</p>
                    <p className="font-medium text-sm mt-0.5">{user.companyName || 'Platform Administration'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Access Level</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Shield className="h-4 w-4 text-primary" />
                      <p className="font-medium text-sm capitalize">{user.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t flex justify-end">
            <Button variant="outline" disabled className="opacity-50" title="Contact an administrator to change password">
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
