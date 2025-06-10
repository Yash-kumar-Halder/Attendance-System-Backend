import express from "express";
import { isAuthenticated } from "../middleware/IsAuthenticate.js";
import { getAttendanceByScheduleAndDate, getStudentsPresentInClass, isMarkedAttendance, markAttendance, totalAttendance } from "../controllers/attendance.controller.js";

const router = express.Router();

// Route to set a weekly schedule
router.post("/mark", isAuthenticated, markAttendance);
router.get("/is-marked", isAuthenticated, isMarkedAttendance);
router.post("/attendance", isAuthenticated, totalAttendance);
router.get("/present-students", isAuthenticated, getStudentsPresentInClass);
router.post("/present-subject", getAttendanceByScheduleAndDate);

// Export the router to be used in the main app
export default router;
