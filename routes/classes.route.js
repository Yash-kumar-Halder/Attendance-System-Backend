import express from "express";
import { isAuthenticated } from "../middleware/IsAuthenticate.js";
import {
	cancelClass,
	getCancelledClassesForToday,
	getClassHistory,
	getUpcomingClasses,
	totalClassesTaken,
} from "../controllers/classes.controller.js";

const router = express.Router();

router.post("/history", isAuthenticated, getClassHistory);
router.get("/upcoming", isAuthenticated, getUpcomingClasses);
router.post("/cancel-classes", isAuthenticated, cancelClass);
router.get(
	"/cancelled-classes/today",
	isAuthenticated,
	getCancelledClassesForToday
);
router.post("/total-class", isAuthenticated, totalClassesTaken);

export default router;
