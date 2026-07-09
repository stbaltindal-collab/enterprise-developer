import { useState, useRef, useEffect } from 'react';
import { useRoute, useLocation, Link } from 'wouter';
import { useGetCompany, useUpdateCompany, useListEmployees, useListUsers, getGetCompanyQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Building2, MapPin, Mail, Phone, Calendar, Users, ShieldAlert, CheckCircle2, Save, Loader2, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function CompanyDetail() {
  const [match, params] = useRoute('/companies/:id');
  const companyId = match && params.id ? parseInt(params.id, 10) : 0;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: company, isLoading, isError } = useGetCompany(companyId, { query: { enabled: !!companyId, queryKey: getGetCompanyQueryKey(companyId) } });
  const { data: employeesData, isLoading: employeesLoading } = useListEmployees({ companyId, limit: 10 });
  const { data: usersData, isLoading: usersLoading } = useListUsers({ companyId, limit: 10 });
  
  const updateCompany = useUpdateCompany();

  // Local state for editing
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '', taxId: '', contactEmail: '', contactPhone: '', address: '', isActive: true
  });

  const initializedRef = useRef(false);

  useEffect(() => {
    if (company && !initializedRef.current) {
      setFormData({
        name: company.name,
        taxId: company.taxId || '',
        contactEmail: company.contactEmail || '',
        contactPhone: company.contactPhone || '',
        address: company.address || '',
        isActive: company.isActive ?? true
      });
      initializedRef.current = true;
    }
  }, [company]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Company Not Found</h2>
        <p className="text-muted-foreground">The requested company does not exist or you don't have access.</p>
        <Button onClick={() => setLocation('/companies')}>Return to Companies</Button>
      </div>
    );
  }

  if (isLoading || !company) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex gap-4 items-center">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-[250px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  const handleSave = () => {
    updateCompany.mutate({ id: companyId, data: formData }, {
      onSuccess: (data) => {
        toast.success('Company updated successfully');
        setIsEditing(false);
        queryClient.setQueryData(getGetCompanyQueryKey(companyId), data);
      },
      onError: (err: any) => toast.error(err.error || 'Failed to update company')
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/companies')} className="shrink-0 mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">{company.name}</h2>
              <Badge variant={company.isActive ? "default" : "secondary"} className={company.isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : ""}>
                {company.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> ID: {company.id}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Added {format(parseISO(company.createdAt), 'MMM d, yyyy')}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                setFormData({
                  name: company.name, taxId: company.taxId || '', contactEmail: company.contactEmail || '', 
                  contactPhone: company.contactPhone || '', address: company.address || '', isActive: company.isActive ?? true
                });
              }}>Cancel</Button>
              <Button onClick={handleSave} disabled={updateCompany.isPending} className="gap-2">
                {updateCompany.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Company</Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Employees ({company.employeeCount || 0})</TabsTrigger>
          <TabsTrigger value="users">Admin Users</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-border/50 shadow-sm">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="text-lg">Company Profile</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tax ID</Label>
                        <Input value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} />
                      </div>
                      <div className="space-y-2 flex items-center justify-between pt-6 border rounded-md px-4 pb-2">
                        <div>
                          <Label>Active Status</Label>
                          <p className="text-xs text-muted-foreground">Allow login and access</p>
                        </div>
                        <Switch checked={formData.isActive} onCheckedChange={c => setFormData({...formData, isActive: c})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Contact Email</Label>
                        <Input type="email" value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Contact Phone</Label>
                        <Input value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="h-20 resize-none" />
                    </div>
                  </div>
                ) : (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4" /> Legal Name & Tax ID
                      </dt>
                      <dd className="text-base">{company.name} <span className="text-muted-foreground ml-2 text-sm">({company.taxId || 'No Tax ID'})</span></dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                        <Mail className="h-4 w-4" /> Contact Email
                      </dt>
                      <dd className="text-base">{company.contactEmail || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                        <Phone className="h-4 w-4" /> Contact Phone
                      </dt>
                      <dd className="text-base">{company.contactPhone || '-'}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                        <MapPin className="h-4 w-4" /> Address
                      </dt>
                      <dd className="text-base whitespace-pre-wrap">{company.address || '-'}</dd>
                    </div>
                  </dl>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-border/50 shadow-sm bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Employees
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold tracking-tight text-primary">{company.employeeCount || 0}</div>
                  <p className="text-sm text-muted-foreground mt-2">Registered personnel</p>
                  <Button variant="default" className="w-full mt-4" asChild>
                    <Link href={`/employees/upload?companyId=${company.id}`}>Upload Data</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="employees" className="mt-6">
          <Card className="border-border/50 shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Hire Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeesLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : employeesData?.data.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No employees found for this company.</TableCell></TableRow>
                ) : (
                  employeesData?.data.map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                      <TableCell>{emp.department || '-'}</TableCell>
                      <TableCell>{emp.position || '-'}</TableCell>
                      <TableCell>{emp.hireDate ? format(parseISO(emp.hireDate), 'MMM d, yyyy') : '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {employeesData && employeesData.total > 10 && (
              <div className="p-4 border-t text-center">
                <Button variant="outline" asChild size="sm"><Link href={`/employees?companyId=${company.id}`}>View All {employeesData.total} Employees</Link></Button>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card className="border-border/50 shadow-sm">
            <div className="p-4 border-b flex justify-between items-center bg-muted/10">
              <div>
                <h3 className="font-medium text-sm">Company Administrators</h3>
                <p className="text-xs text-muted-foreground">Users who can manage this company's data.</p>
              </div>
              <Button size="sm" variant="outline" asChild><Link href={`/users?companyId=${company.id}`}>Manage Users</Link></Button>
            </div>
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  <TableRow><TableCell colSpan={3} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : usersData?.data.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No admin users assigned.</TableCell></TableRow>
                ) : (
                  usersData?.data.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-secondary-foreground">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{u.name}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{u.role.replace('_', ' ')}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={u.isActive ? "default" : "secondary"} className={u.isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : ""}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
