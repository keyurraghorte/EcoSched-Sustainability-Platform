import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ecoschedRouter from "./ecosched";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ecoschedRouter);

export default router;
