import express from "express";
import { isAuthenticated } from "../middleware/IsAuthenticate.js";
import {
	deleteSchedule,
	getAllScheduleSubjects,
	getStudentScheduleSubjects,
	getSubjectSchedules,
	setWeeklyShedule,
} from "../controllers/weeklyShedule.controller.js";

const router = express.Router();

// Route to set a weekly schedule
router.post("/set", setWeeklyShedule);
router.post("/get", isAuthenticated, getAllScheduleSubjects);
router.post("/student/get", isAuthenticated, getStudentScheduleSubjects);
router.post("/subject/schedule", isAuthenticated, getSubjectSchedules);
router.post("/subject/delete", isAuthenticated, deleteSchedule);

// Export the router to be used in the main app
export default router;
