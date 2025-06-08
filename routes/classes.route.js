import express from "express";
import { isAuthenticated } from "../middleware/IsAuthenticate.js";
import {
	cancelClass,
	getClassHistory,
	getUpcomingClasses,
} from "../controllers/classes.controller.js";

const router = express.Router();

router.post("/history", isAuthenticated, getClassHistory);
router.get("/upcoming", isAuthenticated, getUpcomingClasses);
router.post("/cancel-class", isAuthenticated, cancelClass);

export default router;
