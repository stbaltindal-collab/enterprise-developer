import { useState, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import { useGetCurrentUser, useListCompanies, getListCompaniesQueryKey, EmployeeUploadResult } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, UploadCloud, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EmployeeUpload() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialCompanyId = searchParams.get('companyId');
  
  const { data: user } = useGetCurrentUser();
  const isSuperAdmin = user?.role === 'super_admin';

  const [companyId, setCompanyId] = useState<string>(initialCompanyId || (user?.companyId ? String(user.companyId) : ''));
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<EmployeeUploadResult | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: companiesData } = useListCompanies(
    { limit: 100 }, 
    { query: { enabled: isSuperAdmin, queryKey: getListCompaniesQueryKey({ limit: 100 }) } }
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
      } else {
        toast.error('Please upload an Excel or CSV file');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    if (isSuperAdmin && !companyId) {
      toast.error('Please select a company');
      return;
    }

    setIsUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('companyId', companyId);

    try {
      toast.loading('Uploading and processing data...', { id: 'upload-toast' });
      
      const response = await fetch('/api/employees/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || 'Upload failed');
      }

      const data: EmployeeUploadResult = await response.json();
      setResult(data);
      
      if (data.failed === 0) {
        toast.success(`Successfully imported ${data.imported} employees`, { id: 'upload-toast' });
      } else {
        toast.warning(`Imported ${data.imported} employees with ${data.failed} errors`, { id: 'upload-toast' });
      }
      
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred', { id: 'upload-toast' });
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/employees')} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Upload Employees</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Bulk import personnel records via Excel or CSV.
          </p>
        </div>
      </div>

      {!result ? (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-lg">Data Import</CardTitle>
            <CardDescription>
              Upload a .xlsx or .csv file containing employee records. Required columns: First Name, Last Name.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            
            {isSuperAdmin && companiesData && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Company</label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue placeholder="Select a company..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companiesData.data.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div 
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors ${
                file ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileChange}
              />
              
              {file ? (
                <>
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                    <FileSpreadsheet className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold text-lg">{file.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={resetUpload} disabled={isUploading}>
                    Choose a different file
                  </Button>
                </>
              ) : (
                <>
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
                    <UploadCloud className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold text-lg">Drag & drop your file here</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-6">Supports .xlsx, .xls, and .csv files</p>
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    Browse Files
                  </Button>
                </>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button 
                onClick={handleUpload} 
                disabled={!file || (isSuperAdmin && !companyId) || isUploading}
                className="w-full sm:w-auto min-w-[150px] hover-elevate"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Upload Data
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/50 shadow-sm bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/50">
              <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{result.imported}</h3>
                <p className="font-medium text-emerald-600 dark:text-emerald-500">Successfully Imported</p>
              </CardContent>
            </Card>
            
            <Card className={`border-border/50 shadow-sm ${result.failed > 0 ? 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/50' : ''}`}>
              <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
                <AlertCircle className={`h-10 w-10 mb-2 ${result.failed > 0 ? 'text-rose-500' : 'text-muted-foreground'}`} />
                <h3 className={`text-2xl font-bold ${result.failed > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-muted-foreground'}`}>{result.failed}</h3>
                <p className={`font-medium ${result.failed > 0 ? 'text-rose-600 dark:text-rose-500' : 'text-muted-foreground'}`}>Failed Rows</p>
              </CardContent>
            </Card>
          </div>

          {result.failed > 0 && result.errors && result.errors.length > 0 && (
            <Card className="border-border/50 shadow-sm border-rose-100 dark:border-rose-900/50">
              <CardHeader className="bg-rose-50/50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/50">
                <CardTitle className="text-lg text-rose-800 dark:text-rose-300">Error Details</CardTitle>
                <CardDescription className="text-rose-600/80 dark:text-rose-400/80">
                  Please fix these errors in your file and re-upload the failed rows.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[100px]">Row</TableHead>
                      <TableHead>Error Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.errors.map((error, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{error.row}</TableCell>
                        <TableCell className="text-rose-600 dark:text-rose-400 text-sm">{error.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4">
            <Button onClick={resetUpload} variant="outline" className="flex-1">
              Upload Another File
            </Button>
            <Button asChild className="flex-1">
              <Link href="/employees">View Employee Roster</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
