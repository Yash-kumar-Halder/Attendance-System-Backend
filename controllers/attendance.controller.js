import Attendance from "../models/attendance.model.js";

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

export const isMarkedAttendance = async (req, res) => {};
