import { useLocation } from 'wouter';
import { useCreateCompany } from '@workspace/api-client-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const companySchema = z.object({
  name: z.string().min(1, 'Company name is required.'),
  taxId: z.string().optional(),
  contactEmail: z.string().email('Invalid email address.').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export default function CompanyNew() {
  const [location, setLocation] = useLocation();
  const createCompany = useCreateCompany();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      taxId: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
    },
  });

  const onSubmit = (values: CompanyFormValues) => {
    createCompany.mutate({ data: values }, {
      onSuccess: (data) => {
        toast.success('Company created successfully');
        setLocation(`/companies/${data.id}`);
      },
      onError: (error: any) => {
        toast.error(error.error || 'Failed to create company');
      }
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/companies')} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Add New Company
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Register a new tenant organization in the platform.
          </p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="text-lg">Company Details</CardTitle>
          <CardDescription>Enter the legal and contact information for the organization.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corporation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID / EIN</FormLabel>
                      <FormControl>
                        <Input placeholder="XX-XXXXXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="billing@acme.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Business Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="123 Corporate Blvd, Suite 400&#10;San Francisco, CA 94107" 
                          className="resize-none h-24"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4 border-t pt-6">
                <Button variant="outline" type="button" onClick={() => setLocation('/companies')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCompany.isPending} className="hover-elevate min-w-[140px]">
                  {createCompany.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Company'
                  )}
                </Button>
              </div>

            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
