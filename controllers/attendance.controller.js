import Attendance from "../models/attendance.model.js";
import User from "../models/user.model.js";
import WeeklySchedule from "../models/weeklyShedule.model.js";

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
		const newAttendance = new Attendance({
			student: req.user.userId,
			subject: subjectId,
			scheduleSlot,
			status: "present", // <-- Add status here explicitly
		});

		await newAttendance.save();

		res.status(201).json({
			success: true,
			message: "Marked attendance successfully",
		});
	} catch (error) {
		console.error("Error marking attendance:", error);

		if (error.code === 11000) {
			return res.status(409).json({
				success: false,
				message: "Attendance already marked.",
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
	if (!req.user) {
		return res.status(401).json({ message: "Unauthorized" });
	}
	if (req.user.role === "teacher") {
		return res.status(403).json({ message: "Access denied" });
	}

	const { scheduleSlot } = req.query; // Use req.query for GET requests
	const today = new Date();
	const date = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate()
	); // Normalize date to compare

	if (!scheduleSlot) {
		return res.status(400).json({
			success: false,
			message: "Schedule slot ID is required.",
		});
	}

	try {
		const attendanceRecord = await Attendance.findOne({
			student: req.user.userId,
			scheduleSlot: scheduleSlot,
			date: date,
		});

		if (attendanceRecord) {
			return res.status(200).json({
				success: true,
				isMarked: true,
				status: attendanceRecord.status, // "present"
				message: "Attendance already marked.",
			});
		} else {
			return res.status(200).json({
				success: false, // Indicate that no record was found for this criteria
				isMarked: false,
				message: "Attendance not marked yet.",
			});
		}
	} catch (error) {
		console.error("Error checking attendance status:", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error",
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

export const getStudentsPresentInClass = async (req, res) => {
	// Only allow teachers to access this endpoint
	if (!req.user || req.user.role !== "teacher") {
		return res.status(403).json({
			success: false,
			message:
				"Access denied. Only teachers can view class attendance details.",
		});
	}

	const { scheduleSlotId, date } = req.query; // Get scheduleSlotId and date from query parameters

	if (!scheduleSlotId || !date) {
		return res.status(400).json({
			success: false,
			message:
				"Schedule slot ID and date are required to fetch attendance details.",
		});
	}

	// Normalize the date to the start of the day
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
		// Optional: Verify if the scheduleSlotId exists and belongs to the teacher (if you want stricter checks)
		// const scheduleSlot = await WeeklySchedule.findById(scheduleSlotId);
		// if (!scheduleSlot) {
		//     return res.status(404).json({ success: false, message: "Schedule slot not found." });
		// }
		// // Add logic here to ensure this schedule slot is taught by the requesting teacher
		// // if (scheduleSlot.teacher.toString() !== req.user.userId.toString()) {
		// //     return res.status(403).json({ success: false, message: "Unauthorized to view this class's attendance." });
		// // }

		const presentStudents = await Attendance.find({
			scheduleSlot: scheduleSlotId,
			date: {
				$gte: startOfDay,
				$lt: endOfDay,
			},
			status: "present", // Assuming 'present' is the status for marked attendance
		}).populate({
			path: "student", // Populate the 'student' field
			model: "User", // Reference the User model
			select: "fullName email", // Select relevant fields for student
		});

		// Extract just the student information
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
