import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ecoschedRouter from "./ecosched";
import workloadsRouter from "./workloads";
import schedulerRouter from "./scheduler";
import cronRouter from "./cron";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ecoschedRouter);
router.use("/workloads", workloadsRouter);
router.use("/schedule", schedulerRouter);
router.use("/cron", cronRouter);

export default router;


