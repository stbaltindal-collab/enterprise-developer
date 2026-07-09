import { useGetDashboardStats, useGetDepartmentBreakdown, useGetRecentUploads, useGetCurrentUser } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Building2, Upload, UserPlus, Activity, Briefcase } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const { data: user } = useGetCurrentUser();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: departments, isLoading: deptLoading } = useGetDepartmentBreakdown();
  const { data: uploads, isLoading: uploadsLoading } = useGetRecentUploads({ limit: 5 });

  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of your organization's personnel data and activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Employees" 
          value={stats?.totalEmployees} 
          icon={Users} 
          loading={statsLoading} 
        />
        {isSuperAdmin && (
          <StatCard 
            title="Total Companies" 
            value={stats?.totalCompanies} 
            icon={Building2} 
            loading={statsLoading} 
          />
        )}
        <StatCard 
          title="Active Employees" 
          value={stats?.activeEmployees} 
          icon={Activity} 
          loading={statsLoading} 
          description={`${stats?.totalEmployees ? Math.round((stats.activeEmployees / stats.totalEmployees) * 100) : 0}% of total`}
        />
        <StatCard 
          title="New This Month" 
          value={stats?.newEmployeesThisMonth} 
          icon={UserPlus} 
          loading={statsLoading} 
        />
        <StatCard 
          title="Total Uploads" 
          value={stats?.totalUploads} 
          icon={Upload} 
          loading={statsLoading} 
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Chart */}
        <Card className="col-span-4 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5 text-primary" />
              Department Breakdown
            </CardTitle>
            <CardDescription>
              Distribution of employees across departments
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {deptLoading ? (
              <div className="h-[300px] w-full flex items-end gap-2 px-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="w-full" style={{ height: `${Math.max(20, Math.random() * 100)}%` }} />
                ))}
              </div>
            ) : departments && departments.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departments} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis 
                      dataKey="department" 
                      stroke="var(--muted-foreground)" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="var(--muted-foreground)" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `${value}`} 
                    />
                    <RechartsTooltip 
                      cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {departments.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                No department data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="col-span-3 shadow-sm border-border/50 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Recent Uploads
            </CardTitle>
            <CardDescription>
              Latest personnel data imports
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {uploadsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[80%]" />
                      <Skeleton className="h-3 w-[40%]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : uploads && uploads.length > 0 ? (
              <div className="space-y-6">
                {uploads.map((upload) => (
                  <div key={upload.id} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">
                        {isSuperAdmin ? upload.companyName : upload.uploadedBy}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(upload.uploadedAt), 'MMM d, yyyy • h:mm a')}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                          {upload.importedCount} imported
                        </Badge>
                        {upload.failedCount > 0 && (
                          <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200 dark:border-rose-800">
                            {upload.failedCount} failed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground pb-8">
                <Upload className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No recent uploads</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  loading, 
  description 
}: { 
  title: string; 
  value?: number; 
  icon: any; 
  loading: boolean;
  description?: string;
}) {
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-primary opacity-80" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-[100px] mt-1" />
        ) : (
          <>
            <div className="text-3xl font-bold tracking-tight">{value?.toLocaleString() || 0}</div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
