import Attendance from "../models/attendance.model.js";
import User from "../models/user.model.js";
import WeeklySchedule from "../models/weeklyShedule.model.js";
import mongoose from "mongoose";

export const markAttendance = async (req, res) => {
	if (!req.user) {
		return res.status(401).json({ message: "Unauthorized" });
	}
	if (req.user.role === "teacher") {
		return res.status(403).json({ message: "Access denied" });
	}

	const { subjectId, scheduleSlot } = req.body;
	if (!subjectId || !scheduleSlot) {
		return res.status(400).json({
			success: false,
			message: "Not given all fields.",
		});
	}

	try {
		// Option 1: Store the date as the beginning of the current day in UTC
		// This is generally the most consistent approach if you only care about the calendar day.
		const todayUTC = new Date();
		todayUTC.setUTCHours(0, 0, 0, 0); // Sets to 00:00:00.000Z for the current UTC day

		// Option 2 (Less common if you want consistent 'day' values): Store the exact time attendance was marked
		// const now = new Date(); // This would store the exact timestamp

		const newAttendance = new Attendance({
			student: req.user.userId,
			subject: subjectId,
			scheduleSlot,
			status: "present",
			date: todayUTC, // Use the UTC normalized date
		});

		await newAttendance.save();

		res.status(201).json({
			success: true,
			message: "Marked attendance successfully",
		});
	} catch (error) {
		console.error("Error marking attendance:", error);

		// Check for duplicate key error (if you have a unique index on student, date, scheduleSlot, etc.)
		if (error.code === 11000) {
			return res.status(409).json({
				success: false,
				message: "Attendance already marked for today's slot.",
			});
		}

		res.status(500).json({
			success: false,
			message: "Internal server error",
		});
	}
};

// attendance.controller.js (add this function)
export const isMarkedAttendance = async (req, res) => {
	// 1. Authorization Check
	if (!req.user) {
		return res.status(401).json({ message: "Unauthorized" });
	}
	// Students should be able to check their own attendance.
	// If you only want teachers to use this, keep this line:
	if (req.user.role === "teacher") {
		return res
			.status(403)
			.json({
				message:
					"Access denied: Teachers cannot check their own attendance status here.",
			});
	}

	const { scheduleSlot } = req.query; // Use req.query for GET requests

	// 2. Input Validation
	if (!scheduleSlot) {
		return res.status(400).json({
			success: false,
			message: "Schedule slot ID is required.",
		});
	}

	// Validate scheduleSlot as a valid ObjectId
	if (!mongoose.Types.ObjectId.isValid(scheduleSlot)) {
		return res.status(400).json({
			success: false,
			message: "Invalid scheduleSlot ID format.",
		});
	}

	try {
		// 3. Define the date range for the current calendar day in local time
		// This will find any record for the student for the given schedule slot on today's calendar day.
		const today = new Date();
		const startOfDay = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate()
		);
		const endOfDay = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate() + 1 // Start of the next day
		);

		console.log(
			`Checking attendance for student: ${req.user.userId}, ` +
				`scheduleSlot: ${scheduleSlot}, ` +
				`between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`
		);

		// 4. Query the Attendance collection
		const attendanceRecord = await Attendance.findOne({
			student: new mongoose.Types.ObjectId(req.user.userId), // Convert to ObjectId
			scheduleSlot: new mongoose.Types.ObjectId(scheduleSlot), // Convert to ObjectId
			date: {
				$gte: startOfDay, // Greater than or equal to the start of today
				$lt: endOfDay, // Less than the start of tomorrow
			},
		});

		// 5. Send Response
		if (attendanceRecord) {
			return res.status(200).json({
				success: true,
				isMarked: true,
				status: attendanceRecord.status, // "present" or "absent" etc.
				message: `Attendance already marked as '${attendanceRecord.status}'.`,
			});
		} else {
			return res.status(200).json({
				success: false,
				isMarked: false,
				message: "Attendance not marked yet for this schedule today.",
			});
		}
	} catch (error) {
		console.error("Error checking attendance status:", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error while checking attendance status.",
			error: error.message,
		});
	}
};

// Also, let's add a backend endpoint to check for cancelled classes for today.
// For simplicity, we'll add it in the attendance controller for now,
// but you might consider a separate 'class' or 'schedule' controller for this.

export const totalAttendance = async (req, res) => {
	try {
		const attendance = await Attendance.find({ student: req.user.userId })
			.populate("student") // optional: populate student details
			.populate("subject") // optional: populate subject details
			.populate("scheduleSlot"); // optional: if needed

		return res.status(200).json({
			success: true,
			message: "Attendance fetched successfully",
			data: attendance,
		});
	} catch (error) {
		console.error("Error: ", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error",
		});
	}
};

// export const getTodayAttendance = async (req, res) => {
// 	try {
// 		const today = new Date();
// 		today.setHours(0, 0, 0, 0);

// 		const attendance = await Attendance.find({
// 			student: req.user.userId,
// 			date: today,
// 		}).select("scheduleSlot");

// 		const attendanceMarked = attendance.map((a) =>
// 			a.scheduleSlot.toString()
// 		);

// 		res.status(200).json({ success: true, attendanceMarked });
// 	} catch (error) {
// 		console.error("Error fetching today's attendance:", error);
// 		res.status(500).json({ message: "Failed to fetch attendance." });
// 	}
// };
// No changes needed for getStudentsPresentInClass, it seems correct for its purpose.
export const getStudentsPresentInClass = async (req, res) => {
	// Only allow teachers to access this endpoint
	if (!req.user || req.user.role !== "teacher") {
		return res.status(403).json({
			success: false,
			message:
				"Access denied. Only teachers can view class attendance details.",
		});
	}

	const { scheduleSlotId, date } = req.query;
	console.log(date)

	if (!scheduleSlotId || !date) {
		return res.status(400).json({
			success: false,
			message:
				"Schedule slot ID and date are required to fetch attendance details.",
		});
	}

	const queryDate = new Date(date);
	const startOfDay = new Date(
		queryDate.getFullYear(),
		queryDate.getMonth(),
		queryDate.getDate()
	);
	const endOfDay = new Date(
		queryDate.getFullYear(),
		queryDate.getMonth(),
		queryDate.getDate() + 1
	);

	try {
		const presentStudents = await Attendance.find({
			scheduleSlot: scheduleSlotId,
			date: {
				$gte: startOfDay,
				$lt: endOfDay,
			},
			status: "present",
		}).populate({
			path: "student",
			model: "User",
			select: "fullName email",
		});

		const studentsList = presentStudents.map((att) => att.student);

		return res.status(200).json({
			success: true,
			message: "Students present in this class fetched successfully.",
			data: studentsList,
		});
	} catch (error) {
		console.error("Error fetching students present in class:", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error while fetching attendance details.",
			error: error.message,
		});
	}
};

export const getAttendanceByScheduleAndDate = async (req, res) => {
	const { scheduleSlotId, date } = req.body; // Changed from req.query to req.body as per your frontend

	// 1. Input Validation
	if (!scheduleSlotId || !date) {
		return res.status(400).json({
			message:
				"Both scheduleSlotId and date are required in the request body.",
		});
	}

	if (!mongoose.Types.ObjectId.isValid(scheduleSlotId)) {
		return res
			.status(400)
			.json({ message: "Invalid scheduleSlotId format." });
	}

	try {
		const incomingDate = new Date(date);

		if (isNaN(incomingDate.getTime())) {
			return res
				.status(400)
				.json({ message: "Invalid date format provided." });
		}

		// 2. Define the date range for querying (start of the day to start of the next day)
		// This is crucial for matching any time on the specified day.
		const startOfDay = new Date(
			incomingDate.getFullYear(),
			incomingDate.getMonth(),
			incomingDate.getDate()
		);
		const endOfDay = new Date(
			incomingDate.getFullYear(),
			incomingDate.getMonth(),
			incomingDate.getDate() + 1 // Add one day to get the start of the next day
		);

		console.log(
			`Querying attendance for scheduleSlotId: ${scheduleSlotId} ` +
				`between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`
		);

		// 3. Query the Attendance collection using the date range
		const attendanceRecords = await Attendance.find({
			scheduleSlot: new mongoose.Types.ObjectId(scheduleSlotId),
			date: {
				$gte: startOfDay, // Greater than or equal to the start of the day
				$lt: endOfDay, // Less than the start of the next day
			},
			// status: "present" // Uncomment this line if you only want 'present' students
		})
			.populate("student", "name email") // Populate 'student' from 'User' model
			.populate("subject", "name")
			.populate("scheduleSlot", "day startTime endTime");

		// 4. Handle Results
		if (!attendanceRecords || attendanceRecords.length === 0) {
			return res.status(404).json({
				message:
					"No attendance records found for this schedule and date.",
			});
		}

		res.status(200).json(attendanceRecords);
	} catch (error) {
		console.error("Error fetching attendance by schedule and date:", error);
		res.status(500).json({
			message: "Server error.",
			error: error.message,
		});
	}
};
