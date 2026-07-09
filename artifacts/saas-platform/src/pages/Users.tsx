import { useState } from 'react';
import { useListUsers, useDeleteUser, useGetCurrentUser, useCreateUser, useListCompanies, getListUsersQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, MoreHorizontal, User as UserIcon, Trash2, Shield, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const userSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  role: z.enum(['company_admin', 'employee']),
  companyId: z.number().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function Users() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useGetCurrentUser();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [page, setPage] = useState(1);
  const [companyIdFilter, setCompanyIdFilter] = useState<string>(currentUser?.companyId ? String(currentUser.companyId) : 'all');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: companiesData } = useListCompanies(
    { limit: 100 }, 
    { query: { enabled: isSuperAdmin } }
  );

  const { data, isLoading } = useListUsers({ 
    page, 
    limit: 10,
    companyId: companyIdFilter !== 'all' ? parseInt(companyIdFilter, 10) : undefined
  });

  const deleteUser = useDeleteUser();
  const createUser = useCreateUser();

  const handleDelete = () => {
    if (!deleteId) return;
    deleteUser.mutate({ id: deleteId }, {
      onSuccess: () => {
        toast.success('User deleted successfully');
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setDeleteId(null);
      },
      onError: (error: any) => {
        toast.error(error.error || 'Failed to delete user');
        setDeleteId(null);
      }
    });
  };

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '', email: '', password: '', role: 'employee', 
      companyId: isSuperAdmin ? undefined : currentUser?.companyId || undefined
    },
  });

  const onSubmit = (values: UserFormValues) => {
    if (isSuperAdmin && !values.companyId) {
      form.setError('companyId', { message: 'Required for Super Admins' });
      return;
    }
    
    createUser.mutate({ data: values }, {
      onSuccess: () => {
        toast.success('User created successfully');
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setIsCreateOpen(false);
        form.reset();
      },
      onError: (error: any) => {
        toast.error(error.error || 'Failed to create user');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Users</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage account access and administrative roles.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="hover-elevate">
                <Plus className="mr-2 h-4 w-4" />
                New User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user account with login access to the console.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl><Input type="email" placeholder="jane@company.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temporary Password</FormLabel>
                      <FormControl><Input type="password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="company_admin">Company Admin</SelectItem>
                          <SelectItem value="employee">Standard Employee</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {isSuperAdmin && (
                    <FormField control={form.control} name="companyId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Company</FormLabel>
                        <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? String(field.value) : undefined}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {companiesData?.data.map(c => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                  <DialogFooter className="pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createUser.isPending}>
                      {createUser.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Create User
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        {isSuperAdmin && companiesData && (
          <Select value={companyIdFilter} onValueChange={(v) => { setCompanyIdFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[220px] bg-card">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companiesData.data.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="rounded-md border border-border/50 bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[300px]">User</TableHead>
              <TableHead>Role</TableHead>
              {isSuperAdmin && <TableHead>Company</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[100px] rounded-full" /></TableCell>
                  {isSuperAdmin && <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>}
                  <TableCell><Skeleton className="h-6 w-[70px] rounded-full" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 6 : 5} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <UserIcon className="h-8 w-8 mb-2 opacity-20" />
                    <p>No users found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((u) => (
                <TableRow key={u.id} className="group hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-sm font-semibold shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{u.name}</span>
                        <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${u.role === 'super_admin' ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                      {u.role === 'super_admin' && <Shield className="mr-1 h-3 w-3" />}
                      {u.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  {isSuperAdmin && (
                    <TableCell className="text-sm text-muted-foreground">
                      {u.companyName || '-'}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant={u.isActive ? "default" : "secondary"} className={u.isActive ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400" : ""}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {format(parseISO(u.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => setDeleteId(u.id)}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                          disabled={u.id === currentUser?.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.total > data.limit && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{(page - 1) * data.limit + 1}</span> to <span className="font-medium">{Math.min(page * data.limit, data.total)}</span> of <span className="font-medium">{data.total}</span> users
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * data.limit >= data.total}>Next</Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove their access to the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
