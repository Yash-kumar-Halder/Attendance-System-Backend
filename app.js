import cookieParser from "cookie-parser";
import express, { urlencoded } from "express";
import authRoutes from "./routes/auth.route.js";
import weeklyScheduleRoutes from "./routes/shedule.route.js";
import subjectRoutes from "./routes/subject.route.js";
import userRoutes from "./routes/user.route.js";
import attendanceRoute from "./routes/attendance.route.js";
import dotenv from "dotenv";
import cors from "cors";

const app = express();

dotenv.config();
// Enable CORS for all routes
app.use(
	cors({
		origin: "http://localhost:5173", // ✅ your frontend URL
		credentials: true,
	})
);

app.use(cookieParser());
app.use(express.json({ limit: "16kb" }));
app.use(urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/shedule", weeklyScheduleRoutes);
app.use("/api/v1/subject", subjectRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/attendance", attendanceRoute);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the backend API",
  });
});

export default app;
