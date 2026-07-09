import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useListEmployees, useDeleteEmployee, useGetCurrentUser, useListCompanies, getListCompaniesQueryKey, getListEmployeesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Plus, MoreHorizontal, Users, Trash2, Mail, Briefcase, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function Employees() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user } = useGetCurrentUser();
  const isSuperAdmin = user?.role === 'super_admin';

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState<string>('all');
  const [companyId, setCompanyId] = useState<string>(user?.companyId ? String(user.companyId) : 'all');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: companiesData } = useListCompanies(
    { limit: 100 }, 
    { query: { enabled: isSuperAdmin, queryKey: getListCompaniesQueryKey({ limit: 100 }) } }
  );

  const { data, isLoading } = useListEmployees({ 
    page, 
    limit: 10, 
    search: search || undefined,
    department: department !== 'all' ? department : undefined,
    companyId: companyId !== 'all' ? parseInt(companyId, 10) : undefined
  });

  const deleteEmployee = useDeleteEmployee();

  const handleDelete = () => {
    if (!deleteId) return;
    deleteEmployee.mutate({ id: deleteId }, {
      onSuccess: () => {
        toast.success('Employee deleted successfully');
        queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
        setDeleteId(null);
      },
      onError: (error: any) => {
        toast.error(error.error || 'Failed to delete employee');
        setDeleteId(null);
      }
    });
  };

  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Customer Support'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage personnel records and access details.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="hover-elevate">
            <Link href="/employees/upload">
              <Plus className="mr-2 h-4 w-4" />
              Upload Roster
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, email, or ID..."
            className="pl-8 bg-card"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        
        <div className="flex w-full sm:w-auto gap-2">
          {isSuperAdmin && companiesData && (
            <Select value={companyId} onValueChange={(v) => { setCompanyId(v); setPage(1); }}>
              <SelectTrigger className="w-[180px] bg-card">
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

          <Select value={department} onValueChange={(v) => { setDepartment(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] bg-card">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border border-border/50 bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[250px]">Employee</TableHead>
              <TableHead>IDs</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-[150px]" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[70px] rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Users className="h-8 w-8 mb-2 opacity-20" />
                    <p>No employees found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((employee) => (
                <TableRow key={employee.id} className="group hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-primary/5 text-primary text-xs font-semibold shrink-0">
                        {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{employee.firstName} {employee.lastName}</span>
                        {isSuperAdmin && (
                          <span className="text-xs text-muted-foreground truncate">
                            Co ID: {employee.companyId}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {employee.nationalId && <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded w-max">NID: {employee.nationalId}</span>}
                      {employee.registrationNo && <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded w-max">REG: {employee.registrationNo}</span>}
                      {!employee.nationalId && !employee.registrationNo && <span className="text-sm text-muted-foreground">-</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        {employee.position || 'Unknown Role'}
                      </span>
                      <span className="text-xs text-muted-foreground">{employee.department || 'No Department'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col">
                      {employee.email && <span className="flex items-center gap-1 text-sm"><Mail className="h-3 w-3 text-muted-foreground" /> {employee.email}</span>}
                      {employee.phone && <span className="text-xs text-muted-foreground mt-0.5">{employee.phone}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={employee.isActive ? "default" : "secondary"} className={employee.isActive ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400" : ""}>
                      {employee.isActive ? 'Active' : 'Inactive'}
                    </Badge>
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
                          onClick={() => setDeleteId(employee.id)}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Record
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
            Showing <span className="font-medium">{(page - 1) * data.limit + 1}</span> to <span className="font-medium">{Math.min(page * data.limit, data.total)}</span> of <span className="font-medium">{data.total}</span> employees
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page * data.limit >= data.total}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the employee from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
