import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import locationsRouter from "./locations.js";
import vehiclesRouter from "./vehicles.js";
import tripsRouter from "./trips.js";
import ratesRouter from "./rates.js";
import invoicesRouter from "./invoices.js";

const router: IRouter = Router();

router.use("/healthz", healthRouter);
router.use("/locations", locationsRouter);
router.use("/vehicles", vehiclesRouter);
router.use("/trips", tripsRouter);
router.use("/rates", ratesRouter);
router.use("/invoices", invoicesRouter);

export default router;
