import express from "express";
import { isAuthenticated } from "../middleware/IsAuthenticate.js";
import {
	getAllScheduleSubjects,
	setWeeklyShedule,
} from "../controllers/weeklyShedule.controller.js";

const router = express.Router();

// Route to set a weekly schedule
router.post("/set", setWeeklyShedule);
router.post("/get", isAuthenticated, getAllScheduleSubjects);

// Export the router to be used in the main app
export default router;
