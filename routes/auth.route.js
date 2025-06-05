import express from "express";
import { isAuthenticated } from "../middleware/IsAuthenticate.js";
import { refreshTokenController } from "../controllers/RenewAccessToken.controller.js";

import {
	registerUser,
	loginUser,
	logoutUser,
} from "../controllers/auth.controller.js";

const router = express.Router();
// Route to register a new user
router.route("/register").post(registerUser);
// Route to login a user
router.post("/login", loginUser);
// Route to logout a user
router.post("/logout", isAuthenticated, logoutUser);
router.get("/refresh-token", refreshTokenController);

// Export the router to be used in the main app
export default router;
