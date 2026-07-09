import { Router, type IRouter } from "express";
import authRouter from "./auth";
import companiesRouter from "./companies";
import usersRouter from "./users";
import employeesRouter from "./employees";
import dashboardRouter from "./dashboard";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(companiesRouter);
router.use(usersRouter);
router.use(employeesRouter);
router.use(dashboardRouter);

export default router;
