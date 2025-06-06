import { timeToNumber } from "../utils/TimeToNumber.js";
import Schedule from "../models/weeklyShedule.model.js";
import User from "../models/user.model.js";

export const getActiveClasses = async (req, res) => {
	try {
		const { day, time } = req.body;
		if(!day || !time) {
			return res.status(400).json({ message: "Please provide all credentials." });
		}

		const timeValue = timeToNumber(time);
		console.log(timeValue);
		
		const activeClasses = await Schedule.find({
			startTime: { $lt: timeValue },
			endTime: { $gt: timeValue },
			day: day,
		});

		return res.status(200).json(activeClasses);
	} catch (error) {
		console.error("Error fetching active classes:", error);
		res.status(500).json({ message: "Internal Server Error" });
	}
};

export const getAllStudent = async (req, res) => {
	try {
		if (req.user.role !== "teacher") {
			return res.status(403).json({ message: "Access denied" });
		}

		const students = await User.find({ role: "student" }).sort({
			createdAt: -1,
		}); // newest first and  fetches all documents
		res.status(200).json({
			success: true,
			students,
		});
	} catch (error) {
		console.error("Error setting subject:", error);
		res.status(500).json({ message: "Internal server error" });
	}
}