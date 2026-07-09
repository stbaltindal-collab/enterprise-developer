import { Router, type IRouter } from "express";
import { eq, ilike, sql, and } from "drizzle-orm";
import multer from "multer";
import * as XLSX from "xlsx";
import { db, employeesTable, uploadLogsTable, companiesTable } from "@workspace/db";
import {
  ListEmployeesQueryParams,
  CreateEmployeeBody,
  GetEmployeeParams,
  UpdateEmployeeParams,
  UpdateEmployeeBody,
  DeleteEmployeeParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/employees", requireAuth, async (req, res): Promise<void> => {
  const query = ListEmployeesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { page = 1, limit = 20, search, department, companyId } = query.data;
  const offset = (page - 1) * limit;

  const role = req.session.role!;
  const sessionCompanyId = req.session.companyId;

  // Scope to company for non-super-admins
  const effectiveCompanyId = role === "super_admin" ? (companyId ?? undefined) : (sessionCompanyId ?? undefined);

  const conditions = [];
  if (effectiveCompanyId != null) conditions.push(eq(employeesTable.companyId, effectiveCompanyId));
  if (search) conditions.push(ilike(employeesTable.firstName, `%${search}%`));
  if (department) conditions.push(eq(employeesTable.department, department));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(employeesTable)
    .where(whereClause);

  const employees = await db
    .select()
    .from(employeesTable)
    .where(whereClause)
    .orderBy(employeesTable.createdAt)
    .limit(limit)
    .offset(offset);

  res.json({ data: employees, total: count, page, limit });
});

router.post("/employees/upload", requireRole("super_admin", "company_admin"), upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const role = req.session.role!;
  const sessionCompanyId = req.session.companyId;
  const bodyCompanyId = req.body.companyId ? parseInt(req.body.companyId, 10) : null;

  const effectiveCompanyId = role === "super_admin" ? bodyCompanyId : sessionCompanyId;
  if (!effectiveCompanyId) {
    res.status(400).json({ error: "companyId is required" });
    return;
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(req.file.buffer, { type: "buffer" });
  } catch {
    res.status(400).json({ error: "Could not parse Excel file" });
    return;
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const errors: { row: number; message: string; rawData?: string }[] = [];
  const toInsert: typeof employeesTable.$inferInsert[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header

    const firstName = String(row["Ad"] ?? row["Adı"] ?? row["FirstName"] ?? row["first_name"] ?? "").trim();
    const lastName = String(row["Soyad"] ?? row["Soyadı"] ?? row["LastName"] ?? row["last_name"] ?? "").trim();

    if (!firstName || !lastName) {
      errors.push({ row: rowNum, message: "Ad ve Soyad alanları zorunludur (FirstName/LastName required)", rawData: JSON.stringify(row) });
      continue;
    }

    toInsert.push({
      companyId: effectiveCompanyId,
      firstName,
      lastName,
      nationalId: String(row["TC Kimlik No"] ?? row["TCKimlikNo"] ?? row["NationalId"] ?? row["national_id"] ?? "").trim() || null,
      registrationNo: String(row["Sicil No"] ?? row["SicilNo"] ?? row["RegistrationNo"] ?? row["registration_no"] ?? "").trim() || null,
      department: String(row["Departman"] ?? row["Department"] ?? row["department"] ?? "").trim() || null,
      position: String(row["Pozisyon"] ?? row["Unvan"] ?? row["Position"] ?? row["position"] ?? "").trim() || null,
      email: String(row["Email"] ?? row["E-posta"] ?? row["email"] ?? "").trim() || null,
      phone: String(row["Telefon"] ?? row["Phone"] ?? row["phone"] ?? "").trim() || null,
      hireDate: null,
      isActive: true,
    });
  }

  let imported = 0;
  if (toInsert.length > 0) {
    await db.insert(employeesTable).values(toInsert);
    imported = toInsert.length;
  }

  // Log the upload
  const uploadedBy = req.session.userId ? String(req.session.userId) : "unknown";
  await db.insert(uploadLogsTable).values({
    companyId: effectiveCompanyId,
    importedCount: imported,
    failedCount: errors.length,
    uploadedBy,
  });

  res.json({ imported, failed: errors.length, errors });
});

router.post("/employees", requireRole("super_admin", "company_admin"), async (req, res): Promise<void> => {
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const role = req.session.role!;
  const sessionCompanyId = req.session.companyId;
  const effectiveCompanyId = role === "super_admin" ? (parsed.data.companyId ?? sessionCompanyId!) : sessionCompanyId!;

  const [employee] = await db
    .insert(employeesTable)
    .values({ ...parsed.data, companyId: effectiveCompanyId })
    .returning();

  res.status(201).json(employee);
});

router.get("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [employee] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.id, params.data.id))
    .limit(1);

  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const role = req.session.role!;
  const sessionCompanyId = req.session.companyId;
  if (role !== "super_admin" && employee.companyId !== sessionCompanyId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(employee);
});

router.patch("/employees/:id", requireRole("super_admin", "company_admin"), async (req, res): Promise<void> => {
  const params = UpdateEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Verify tenant ownership before mutation
  const sessionRole = req.session.role!;
  const sessionCompanyId = req.session.companyId;
  const [existing] = await db.select({ companyId: employeesTable.companyId }).from(employeesTable).where(eq(employeesTable.id, params.data.id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  if (sessionRole !== "super_admin" && existing.companyId !== sessionCompanyId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [employee] = await db
    .update(employeesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(employeesTable.id, params.data.id))
    .returning();

  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  res.json(employee);
});

router.delete("/employees/:id", requireRole("super_admin", "company_admin"), async (req, res): Promise<void> => {
  const params = DeleteEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Verify tenant ownership before deletion
  const sessionRole = req.session.role!;
  const sessionCompanyId = req.session.companyId;
  const [existing] = await db.select({ companyId: employeesTable.companyId }).from(employeesTable).where(eq(employeesTable.id, params.data.id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  if (sessionRole !== "super_admin" && existing.companyId !== sessionCompanyId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [employee] = await db
    .delete(employeesTable)
    .where(eq(employeesTable.id, params.data.id))
    .returning();

  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
