import express from "express";
import { isAuthenticated } from "../middleware/IsAuthenticate.js";
import { markAttendance } from "../controllers/attendance.controller.js";

const router = express.Router();

// Route to set a weekly schedule
router.post("/mark", isAuthenticated, markAttendance);

// Export the router to be used in the main app
export default router;
