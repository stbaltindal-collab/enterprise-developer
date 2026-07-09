import { Router, type IRouter } from "express";
import { eq, ilike, sql, and } from "drizzle-orm";
import { db, companiesTable, employeesTable } from "@workspace/db";
import {
  ListCompaniesQueryParams,
  CreateCompanyBody,
  GetCompanyParams,
  UpdateCompanyParams,
  UpdateCompanyBody,
  DeleteCompanyParams,
} from "@workspace/api-zod";
import { requireAuth, requireSuperAdmin, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/companies", requireSuperAdmin, async (req, res): Promise<void> => {
  const query = ListCompaniesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { page = 1, limit = 20, search } = query.data;
  const offset = (page - 1) * limit;

  const whereClause = search ? ilike(companiesTable.name, `%${search}%`) : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(companiesTable)
    .where(whereClause);

  const companies = await db
    .select({
      id: companiesTable.id,
      name: companiesTable.name,
      taxId: companiesTable.taxId,
      contactEmail: companiesTable.contactEmail,
      contactPhone: companiesTable.contactPhone,
      address: companiesTable.address,
      isActive: companiesTable.isActive,
      createdAt: companiesTable.createdAt,
    })
    .from(companiesTable)
    .where(whereClause)
    .orderBy(companiesTable.createdAt)
    .limit(limit)
    .offset(offset);

  const employeeCounts = await db
    .select({
      companyId: employeesTable.companyId,
      count: sql<number>`count(*)::int`,
    })
    .from(employeesTable)
    .groupBy(employeesTable.companyId);

  const countMap = new Map(employeeCounts.map((e) => [e.companyId, e.count]));

  const result = companies.map((c) => ({
    ...c,
    employeeCount: countMap.get(c.id) ?? 0,
  }));

  res.json({ data: result, total: count, page, limit });
});

router.post("/companies", requireSuperAdmin, async (req, res): Promise<void> => {
  const parsed = CreateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [company] = await db
    .insert(companiesTable)
    .values(parsed.data)
    .returning();

  res.status(201).json({ ...company, employeeCount: 0 });
});

router.get("/companies/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetCompanyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const role = req.session.role!;
  const sessionCompanyId = req.session.companyId;

  // Company admins and employees can only view their own company
  if (role !== "super_admin" && sessionCompanyId !== params.data.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, params.data.id))
    .limit(1);

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(employeesTable)
    .where(eq(employeesTable.companyId, company.id));

  res.json({ ...company, employeeCount: count });
});

router.patch("/companies/:id", requireRole("super_admin", "company_admin"), async (req, res): Promise<void> => {
  const params = UpdateCompanyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const role = req.session.role!;
  const sessionCompanyId = req.session.companyId;

  if (role !== "super_admin" && sessionCompanyId !== params.data.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = UpdateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [company] = await db
    .update(companiesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(companiesTable.id, params.data.id))
    .returning();

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(employeesTable)
    .where(eq(employeesTable.companyId, company.id));

  res.json({ ...company, employeeCount: count });
});

router.delete("/companies/:id", requireSuperAdmin, async (req, res): Promise<void> => {
  const params = DeleteCompanyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [company] = await db
    .delete(companiesTable)
    .where(eq(companiesTable.id, params.data.id))
    .returning();

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
