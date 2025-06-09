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

		return res.status(200).json({
			success: true,
			scheduleClasses: filteredSchedules,
		});
	} catch (error) {
		console.error("Error fetching student schedule:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

export const getSubjectSchedules = async (req, res) => {
	try {
		const { subjectId } = req.body;

		// Validate subjectId
		if (!subjectId) {
			return res
				.status(400)
				.json({ success: false, message: "Subject ID is required" });
		}

		const schedules = await WeeklySchedule.find({ subject: subjectId })
			.sort({ day: 1, startTime: 1 })
			.populate("subject", "subject code teacher department semester");

		const formattedSchedules = schedules.map((schedule) => ({
			scheduleId: schedule._id, // ✅ Include the schedule ID
			day: schedule.day,
			startTime: `${Math.floor(schedule.startTime / 60)}:${String(
				schedule.startTime % 60
			).padStart(2, "0")}`,
			endTime: `${Math.floor(schedule.endTime / 60)}:${String(
				schedule.endTime % 60
			).padStart(2, "0")}`,
			duration: `${Math.floor(
				(schedule.endTime - schedule.startTime) / 60
			)}h ${(schedule.endTime - schedule.startTime) % 60}m`,
			subject: schedule.subject,
		}));

		return res.status(200).json({
			success: true,
			message: "Schedule fetched successfully",
			schedules: formattedSchedules,
		});
	} catch (error) {
		console.error("Get Subject Schedules Error:", error);
		return res.status(500).json({
			success: false,
			message: "Something went wrong while fetching subject schedules",
		});
	}
};

export const deleteSchedule = async (req, res) => {
	try {
		const { scheduleId } = req.body;

		// Validate
		if (!scheduleId) {
			return res.status(400).json({
				success: false,
				message: "Schedule ID is required",
			});
		}

		// Attempt to delete
		const deleted = await WeeklySchedule.findByIdAndDelete(scheduleId);

		if (!deleted) {
			return res.status(404).json({
				success: false,
				message: "Schedule not found or already deleted",
			});
		}

		return res.status(200).json({
			success: true,
			message: "Schedule deleted successfully",
			deletedScheduleId: scheduleId,
		});
	} catch (error) {
		console.error("Delete Schedule Error:", error);
		return res.status(500).json({
			success: false,
			message: "Something went wrong while deleting the schedule",
		});
	}
};