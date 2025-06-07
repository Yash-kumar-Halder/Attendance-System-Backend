import mongoose from "mongoose";
import WeeklySchedule from "../models/weeklyShedule.model.js";
import { timeToNumber } from "../utils/TimeToNumber.js";
import User from "../models/user.model.js";

export const setWeeklyShedule = (req, res) => {
	const { day, startTime, endTime, subject } = req.body;

	// Validate input
	if (!day || !startTime || !endTime || !subject) {
		return res.status(400).json({
			success: false,
			message: "All credentials are required",
		});
	}

	// Convert startTime and endTime to Number format to validate time
	const newStartTime = timeToNumber(startTime);
	const newEndTime = timeToNumber(endTime);

	// Create a new weekly schedule entry
	const newWeeklySchedule = {
		day,
		startTime: newStartTime,
		endTime: newEndTime,
		subject,
	};
	// Save the new entry to the database
	WeeklySchedule.create(newWeeklySchedule)
		.then((schedule) => {
			res.status(201).json({
				success: true,
				message: "Weekly schedule created successfully",
				schedule,
			});
		})
		.catch((error) => {
			console.error("Error creating weekly schedule:", error);
			res.status(500).json({ error: "Internal server error" });
		});
};

export const getAllScheduleSubjects = async (req, res) => {
	try {
		// if (req.user.role !== "teacher") {
		// 	return res.status(403).json({ message: "Access denied" });
		// }

		const scheduleClasses = await WeeklySchedule.find().populate("subject");

		res.status(200).json({
			success: true,
			scheduleClasses,
		});
	} catch (error) {
		console.error("Error setting schedule:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};
export const getStudentScheduleSubjects = async (req, res) => {
	if (!req.user) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	const { userId, role } = req.user;

	if (role === "teacher") {
		return res.status(403).json({
			message:
				"Access denied: Teachers are not allowed to access this resource.",
		});
	}

	try {
		const user = await User.findOne({ _id: userId });
		const { department, semester } = user;

		if (!department || !semester) {
			return res
				.status(400)
				.json({ message: "Department and semester are required." });
		}

		const scheduleClasses = await WeeklySchedule.find().populate({
			path: "subject",
			match: { department, semester }, // filter inside populated subject
		});

		// Remove entries where subject didn't match (null after population)
		const filteredSchedules = scheduleClasses.filter(
			(s) => s.subject !== null
		);

		res.status(200).json({
			success: true,
			scheduleClasses: filteredSchedules,
		});
	} catch (error) {
		console.error("Error fetching student schedule:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};
