import express from "express";
import { setSubject, getAllSubject } from "../controllers/subject.controller.js";
import { isAuthenticated } from "../middleware/IsAuthenticate.js";

const router = express.Router();

// Route to set a weekly schedule
router.post("/set", isAuthenticated, setSubject);
router.get("/get", isAuthenticated, getAllSubject);

// Export the router to be used in the main app
export default router;
