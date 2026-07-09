import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import { db, usersTable, companiesTable } from "@workspace/db";
import {
  ListUsersQueryParams,
  CreateUserBody,
  UpdateUserParams,
  UpdateUserBody,
  DeleteUserParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";

const SALT_ROUNDS = 10;

const router: IRouter = Router();

router.get("/users", requireRole("super_admin", "company_admin"), async (req, res): Promise<void> => {
  const query = ListUsersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { page = 1, limit = 20, companyId } = query.data;
  const offset = (page - 1) * limit;

  const role = req.session.role!;
  const sessionCompanyId = req.session.companyId;

  // Company admins can only see users in their own company
  const effectiveCompanyId = role === "super_admin" ? (companyId ?? undefined) : (sessionCompanyId ?? undefined);

  const whereClause = effectiveCompanyId != null
    ? eq(usersTable.companyId, effectiveCompanyId)
    : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(whereClause);

  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      companyId: usersTable.companyId,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(whereClause)
    .orderBy(usersTable.createdAt)
    .limit(limit)
    .offset(offset);

  // Attach company names
  const companyIds = [...new Set(users.map((u) => u.companyId).filter(Boolean))] as number[];
  let companyMap = new Map<number, string>();
  if (companyIds.length > 0) {
    const comps = await db
      .select({ id: companiesTable.id, name: companiesTable.name })
      .from(companiesTable);
    companyMap = new Map(comps.map((c) => [c.id, c.name]));
  }

  const result = users.map((u) => ({
    ...u,
    companyName: u.companyId ? (companyMap.get(u.companyId) ?? null) : null,
  }));

  res.json({ data: result, total: count, page, limit });
});

router.post("/users", requireRole("super_admin", "company_admin"), async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const role = req.session.role!;
  const sessionCompanyId = req.session.companyId;

  // Company admins can only create users in their own company
  const effectiveCompanyId =
    role === "super_admin" ? (parsed.data.companyId ?? undefined) : (sessionCompanyId ?? undefined);

  const passwordHash = await bcrypt.hash(parsed.data.password, SALT_ROUNDS);

  const [user] = await db
    .insert(usersTable)
    .values({
      email: parsed.data.email.toLowerCase(),
      name: parsed.data.name,
      passwordHash,
      role: parsed.data.role as "company_admin" | "employee",
      companyId: effectiveCompanyId,
    })
    .returning();

  let companyName: string | null = null;
  if (user.companyId) {
    const [company] = await db
      .select({ name: companiesTable.name })
      .from(companiesTable)
      .where(eq(companiesTable.id, user.companyId))
      .limit(1);
    companyName = company?.name ?? null;
  }

  res.status(201).json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    companyName,
    isActive: user.isActive,
    createdAt: user.createdAt,
  });
});

router.patch("/users/:id", requireRole("super_admin", "company_admin"), async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Verify tenant ownership before mutation
  const sessionRole = req.session.role!;
  const sessionCompanyId = req.session.companyId;
  const [existing] = await db.select({ companyId: usersTable.companyId }).from(usersTable).where(eq(usersTable.id, params.data.id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (sessionRole !== "super_admin" && existing.companyId !== sessionCompanyId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.role != null) updateData.role = parsed.data.role;
  if (parsed.data.isActive != null) updateData.isActive = parsed.data.isActive;
  if (parsed.data.password) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.password, SALT_ROUNDS);
  }

  const [user] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let companyName: string | null = null;
  if (user.companyId) {
    const [company] = await db
      .select({ name: companiesTable.name })
      .from(companiesTable)
      .where(eq(companiesTable.id, user.companyId))
      .limit(1);
    companyName = company?.name ?? null;
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    companyName,
    isActive: user.isActive,
    createdAt: user.createdAt,
  });
});

router.delete("/users/:id", requireRole("super_admin", "company_admin"), async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Verify tenant ownership before deletion
  const sessionRole = req.session.role!;
  const sessionCompanyId = req.session.companyId;
  const [existing] = await db.select({ companyId: usersTable.companyId }).from(usersTable).where(eq(usersTable.id, params.data.id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (sessionRole !== "super_admin" && existing.companyId !== sessionCompanyId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [user] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
