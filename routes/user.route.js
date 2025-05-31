import express from "express";
import { isAuthenticated } from "../middleware/IsAuthenticate.js";
import { getActiveClasses } from "../controllers/user.controller.js";

const router = express.Router();

// Route to set a weekly schedule
router.post("/get-classes", isAuthenticated, getActiveClasses);

// Export the router to be used in the main app
export default router;
