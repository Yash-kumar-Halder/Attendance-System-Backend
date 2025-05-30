import cookieParser from "cookie-parser";
import express, { urlencoded } from "express";
import authRoutes from "./routes/auth.route.js";
import weeklyScheduleRoutes from "./routes/shedule.route.js";
import subjectRoutes from "./routes/subject.route.js";

const app = express();

app.use(express.json({ limit: "16kb" }));
app.use(urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(express.static("public"));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/shedule", weeklyScheduleRoutes);
app.use("/api/v1/subject", subjectRoutes);

export default app;
