import { Router, type IRouter } from "express";
import { eq, sql, gte, and } from "drizzle-orm";
import { db, companiesTable, usersTable, employeesTable, uploadLogsTable } from "@workspace/db";
import { GetRecentUploadsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const role = req.session.role!;
  const sessionCompanyId = req.session.companyId;

  if (role === "super_admin") {
    const [totalEmployeesRes] = await db.select({ count: sql<number>`count(*)::int` }).from(employeesTable);
    const [totalCompaniesRes] = await db.select({ count: sql<number>`count(*)::int` }).from(companiesTable);
    const [totalUsersRes] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
    const [activeEmployeesRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeesTable)
      .where(eq(employeesTable.isActive, true));
    const [totalUploadsRes] = await db.select({ count: sql<number>`count(*)::int` }).from(uploadLogsTable);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const [newThisMonthRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeesTable)
      .where(gte(employeesTable.createdAt, startOfMonth));

    res.json({
      totalEmployees: totalEmployeesRes.count,
      totalCompanies: totalCompaniesRes.count,
      totalUsers: totalUsersRes.count,
      activeEmployees: activeEmployeesRes.count,
      totalUploads: totalUploadsRes.count,
      newEmployeesThisMonth: newThisMonthRes.count,
    });
  } else {
    const whereCompany = eq(employeesTable.companyId, sessionCompanyId!);
    const [totalEmployeesRes] = await db.select({ count: sql<number>`count(*)::int` }).from(employeesTable).where(whereCompany);
    const [activeEmployeesRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeesTable)
      .where(and(eq(employeesTable.companyId, sessionCompanyId!), eq(employeesTable.isActive, true)));
    const [totalUsersRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(eq(usersTable.companyId, sessionCompanyId!));
    const [totalUploadsRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(uploadLogsTable)
      .where(eq(uploadLogsTable.companyId, sessionCompanyId!));

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const [newThisMonthRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeesTable)
      .where(and(eq(employeesTable.companyId, sessionCompanyId!), gte(employeesTable.createdAt, startOfMonth)));

    res.json({
      totalEmployees: totalEmployeesRes.count,
      totalCompanies: 1,
      totalUsers: totalUsersRes.count,
      activeEmployees: activeEmployeesRes.count,
      totalUploads: totalUploadsRes.count,
      newEmployeesThisMonth: newThisMonthRes.count,
    });
  }
});

router.get("/dashboard/department-breakdown", requireAuth, async (req, res): Promise<void> => {
  const role = req.session.role!;
  const sessionCompanyId = req.session.companyId;

  const whereClause = role !== "super_admin" && sessionCompanyId
    ? eq(employeesTable.companyId, sessionCompanyId)
    : undefined;

  const rows = await db
    .select({
      department: employeesTable.department,
      count: sql<number>`count(*)::int`,
    })
    .from(employeesTable)
    .where(whereClause)
    .groupBy(employeesTable.department);

  const result = rows.map((r) => ({
    department: r.department ?? "Belirtilmemiş",
    count: r.count,
  }));

  res.json(result);
});

router.get("/dashboard/recent-uploads", requireAuth, async (req, res): Promise<void> => {
  const query = GetRecentUploadsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { limit = 10 } = query.data;
  const role = req.session.role!;
  const sessionCompanyId = req.session.companyId;

  const whereClause = role !== "super_admin" && sessionCompanyId
    ? eq(uploadLogsTable.companyId, sessionCompanyId)
    : undefined;

  const logs = await db
    .select({
      id: uploadLogsTable.id,
      companyId: uploadLogsTable.companyId,
      importedCount: uploadLogsTable.importedCount,
      failedCount: uploadLogsTable.failedCount,
      uploadedBy: uploadLogsTable.uploadedBy,
      uploadedAt: uploadLogsTable.uploadedAt,
      companyName: companiesTable.name,
    })
    .from(uploadLogsTable)
    .leftJoin(companiesTable, eq(uploadLogsTable.companyId, companiesTable.id))
    .where(whereClause)
    .orderBy(sql`${uploadLogsTable.uploadedAt} DESC`)
    .limit(limit);

  const result = logs.map((l) => ({
    ...l,
    companyName: l.companyName ?? "Unknown",
  }));

  res.json(result);
});

export default router;
