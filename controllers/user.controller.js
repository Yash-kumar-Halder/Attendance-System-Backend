import { timeToNumber } from "../utils/TimeToNumber.js";
import WeeklySchedule from "../models/weeklyShedule.model.js";
import User from "../models/user.model.js";
import Subject from "../models/subject.model.js"
import CancelledClass from "../models/cancelledClass.model.js";
import Attendance from "../models/attendance.model.js";

export const getActiveClasses = async (req, res) => {
	try {
		const { day, time } = req.body;
		if(!day || !time) {
			return res.status(400).json({ message: "Please provide all credentials." });
		}

		const timeValue = timeToNumber(time);
		console.log(timeValue);
		
		const activeClasses = await WeeklySchedule.find({
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

const totalClassesTaken = async (userId) => {
	try {
		const user = await User.findById(userId);
		if (!user) {
			// Throw an error instead of sending a response
			throw new Error("User not found");
		}

		// --- Date Range Logic (aligned with getClassHistory) ---
		const today = new Date();
		today.setHours(0, 0, 0, 0); // Normalize to start of today

		const CLASS_START_DATE = new Date("2025-06-07"); // As requested: June 7, 2025
		CLASS_START_DATE.setHours(0, 0, 0, 0); // Normalize to start of the date

		const THIRTY_DAYS_AGO = new Date(
			today.getTime() - 30 * 24 * 60 * 60 * 1000
		);
		THIRTY_DAYS_AGO.setHours(0, 0, 0, 0); // Normalize to start of the date

		// The effective start date is the later of CLASS_START_DATE or 30 days ago
		const effectiveStartDate =
			CLASS_START_DATE > THIRTY_DAYS_AGO
				? CLASS_START_DATE
				: THIRTY_DAYS_AGO;
		// --- End Date Range Logic ---

		let relevantSchedules = [];
		if (user.role === "student") {
			const subjects = await Subject.find({
				department: user.department,
				semester: user.semester,
			});
			const subjectIds = subjects.map((sub) => sub._id);
			relevantSchedules = await WeeklySchedule.find({
				subject: { $in: subjectIds },
			});
		} else if (user.role === "teacher") {
			// Use the userId parameter, which is the ID of the teacher being processed
			relevantSchedules = await WeeklySchedule.find({
				teacher: userId,
			});
		} else {
			// Throw an error for unauthorized roles
			throw new Error(
				"Access denied. Role not authorized for this action."
			);
		}

		const cancellations = await CancelledClass.find({
			date: {
				$gte: effectiveStartDate,
				$lte: today,
			},
		});

		const cancelledMap = new Map();
		cancellations.forEach((c) => {
			const dateStr = c.date.toISOString().slice(0, 10); // Format date to YYYY-MM-DD
			const key = `${c.scheduleSlot.toString()}_${dateStr}`;
			cancelledMap.set(key, true);
		});

		let totalScheduledOccurrences = 0;
		let totalClassesActuallyTaken = 0;

		let currentDate = new Date(effectiveStartDate);
		while (currentDate <= today) {
			const dayName = currentDate.toLocaleDateString("en-US", {
				weekday: "long",
			});
			const dateStr = currentDate.toISOString().slice(0, 10);

			const dailySchedules = relevantSchedules.filter(
				(s) => s.day === dayName
			);

			dailySchedules.forEach((slot) => {
				const key = `${slot._id.toString()}_${dateStr}`;
				totalScheduledOccurrences++;

				if (!cancelledMap.has(key)) {
					totalClassesActuallyTaken++;
				}
			});

			currentDate.setDate(currentDate.getDate() + 1);
		}

		const totalCancelledOccurrences =
			totalScheduledOccurrences - totalClassesActuallyTaken;

		// Return the data directly
		return {
			totalScheduled: totalScheduledOccurrences,
			totalCancelled: totalCancelledOccurrences,
			totalTaken: totalClassesActuallyTaken,
		};
	} catch (error) {
		console.error("Error in totalClassesTaken: ", error);
		// Rethrow the error to be handled by the calling function
		throw error;
	}
};

const totalAttendance = async (userId) => {
	try {
		const attendance = await Attendance.find({ student: userId })
			.populate("student") // optional: populate student details
			.populate("subject") // optional: populate subject details
			.populate("scheduleSlot") // optional: if needed
			.lean(); // Use .lean() for plain JavaScript objects, improves performance

		// Return the attendance data directly
		return attendance;
	} catch (error) {
		console.error("Error in totalAttendance: ", error);
		// Rethrow the error to be handled by the calling function
		throw error;
	}
};

export const getAllStudent = async (req, res) => {
	try {
		if (req.user.role !== "teacher") {
			return res.status(403).json({ message: "Access denied" });
		}

		const students = await User.find({ role: "student" })
			.sort({
				createdAt: -1,
			})
			.lean(); // Use .lean() for plain JavaScript objects, improves performance if not modifying Mongoose documents

		// Use Promise.all to wait for all asynchronous totalClassesTaken calls to complete
		const studentsWithClassCounts = await Promise.all(
			students.map(async (student) => {
				try {
					const classCounts = await totalClassesTaken(student._id);
					const totalAttentClass = await totalAttendance(student._id);
					// console.log(totalAttentClass.length);
					// console.log(classCounts);
					return {
						...student,
						totalClass: classCounts,
						totalAttent: totalAttentClass.length,
					};
				} catch (error) {
					console.error(
						`Error calculating classes for student ${student._id}:`,
						error.message
					);
					// Return the student with a default or error value for totalClass
					return {
						...student,
						totalClass: {
							totalScheduled: 0,
							totalCancelled: 0,
							totalTaken: 0,
							error: error.message,
						},
					};
				}
			})
		);

		res.status(200).json({
			success: true,
			students: studentsWithClassCounts,
		});
	} catch (error) {
		console.error("Error in getAllStudent:", error);
		res.status(500).json({
			message: "Internal server error",
			error: error.message,
		});
	}
};