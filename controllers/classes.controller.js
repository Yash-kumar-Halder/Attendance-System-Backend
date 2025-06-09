// backend/controllers/class.controller.js
import WeeklySchedule from "../models/weeklyShedule.model.js";
import CancelledClass from "../models/cancelledClass.model.js";
import User from "../models/user.model.js";
import Subject from "../models/subject.model.js";
import Attendance from "../models/attendance.model.js";

export const getClassHistory = async (req, res) => {
	const { userId } = req.user;

	try {
		const user = await User.findById(userId);
		if (!user) {
			return res
				.status(404)
				.json({ success: false, message: "User not found" });
		}

		let schedules = await WeeklySchedule.find().populate("subject");

		// Filter schedules by department/semester if student
		if (user.role === "student") {
			schedules = schedules.filter(
				(s) =>
					s.subject.department === user.department &&
					s.subject.semester === user.semester
			);
		}

		const today = new Date();
		// Set today's date to the beginning of the day for accurate comparison
		today.setHours(0, 0, 0, 0);

		// --- START OF CHANGE ---
		// Updated CLASS_START_DATE to June 7, 2025
		const CLASS_START_DATE = new Date("2025-06-07");
		// --- END OF CHANGE ---

		CLASS_START_DATE.setHours(0, 0, 0, 0); // Set to beginning of the day

		const THIRTY_DAYS_AGO = new Date(
			today.getTime() - 30 * 24 * 60 * 60 * 1000
		);
		THIRTY_DAYS_AGO.setHours(0, 0, 0, 0); // Set to beginning of the day

		// The logic for effectiveStartDate remains the same,
		// it picks the later of CLASS_START_DATE or THIRTY_DAYS_AGO
		const effectiveStartDate =
			CLASS_START_DATE > THIRTY_DAYS_AGO
				? CLASS_START_DATE
				: THIRTY_DAYS_AGO;

		const cancellations = await CancelledClass.find({
			date: {
				$gte: effectiveStartDate,
				$lte: today,
			},
		}).populate("cancelledBy");

		const cancelledMap = new Map();
		cancellations.forEach((c) => {
			// Use ISO date string without time for the key to match `dateStr`
			cancelledMap.set(
				`${c.scheduleSlot.toString()}_${c.date
					.toISOString()
					.slice(0, 10)}`,
				c
			);
		});

		const attendanceRecords = await Attendance.find({
			student: userId,
			date: { $gte: effectiveStartDate, $lte: today },
		});

		const attendanceMap = new Map();
		attendanceRecords.forEach((a) => {
			// Use ISO date string without time for the key to match `dateStr`
			attendanceMap.set(
				`${a.scheduleSlot.toString()}_${a.date
					.toISOString()
					.slice(0, 10)}`,
				a.status
			);
		});

		const pastClasses = [];

		let currentDate = new Date(today);
		currentDate.setHours(0, 0, 0, 0); // Ensure consistent daily iteration

		while (currentDate >= effectiveStartDate) {
			const dayName = currentDate.toLocaleDateString("en-US", {
				weekday: "long",
			});
			const dateStr = currentDate.toISOString().slice(0, 10);

			const dailySchedules = schedules.filter((s) => s.day === dayName);

			dailySchedules.forEach((slot) => {
				const key = `${slot._id.toString()}_${dateStr}`;
				const cancel = cancelledMap.get(key);

				// Get attendance status directly from the map
				const attendanceStatus = attendanceMap.get(key);
				const isPresent = attendanceStatus === "present";

				pastClasses.push({
					date: dateStr,
					day: dayName,
					startTime: slot.startTime,
					endTime: slot.endTime,
					subject: slot.subject.subject,
					code: slot.subject.code,
					teacher: slot.subject.teacher,
					department: slot.subject.department,
					semester: slot.subject.semester,
					scheduleSlotId: slot._id,
					isCancelled: !!cancel,
					reason: cancel?.reason || null,
					cancelledBy: cancel?.cancelledBy?.name || null,
					isPresent: isPresent, // Pass the determined isPresent value
				});
			});

			currentDate.setDate(currentDate.getDate() - 1);
		}

		// Sort pastClasses from newest to oldest for better display in the frontend
		pastClasses.sort((a, b) => {
			const dateA = new Date(a.date);
			const dateB = new Date(b.date);
			if (dateA.getTime() === dateB.getTime()) {
				return a.startTime - b.startTime;
			}
			return dateB.getTime() - dateA.getTime(); // Newest first
		});

		return res.status(200).json({ success: true, pastClasses });
	} catch (err) {
		console.error(err);
		return res
			.status(500)
			.json({ success: false, message: "Server Error" });
	}
};

const getUpcomingClassesInternal = async () => {
	const schedules = await WeeklySchedule.find().populate("subject");

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const THIRTY_DAYS_LATER = new Date(
		today.getTime() + 7 * 24 * 60 * 60 * 1000
	);

	const cancellations = await CancelledClass.find({
		date: {
			$gte: today,
			$lte: THIRTY_DAYS_LATER,
		},
	}).populate("cancelledBy");

	// Create a dictionary for quick access by key
	const cancelledDict = {};
	cancellations.forEach((c) => {
		// Use consistent date string format (UTC date only)
		const dateKey = c.date.toISOString().slice(0, 10);
		const key = `${c.scheduleSlot.toString()}_${dateKey}`;
		cancelledDict[key] = c;
	});

	console.log(cancelledDict);

	const upcomingClasses = [];
	let currentDate = new Date(today);

	while (currentDate <= THIRTY_DAYS_LATER) {
		const dayName = currentDate.toLocaleDateString("en-US", {
			weekday: "long",
		});
		const dateStr = currentDate.toISOString().slice(0, 10);

		const dailySchedules = schedules.filter((s) => s.day === dayName);

		dailySchedules.forEach((slot) => {
			const key = `${slot._id.toString()}_${dateStr}`;
			const cancel = cancelledDict[key];

			// console.log(cancel);

			upcomingClasses.push({
				date: dateStr,
				day: dayName,
				startTime: slot.startTime,
				endTime: slot.endTime,
				subject: slot.subject.subject,
				code: slot.subject.code,
				teacher: slot.subject.teacher,
				department: slot.subject.department,
				semester: slot.subject.semester,
				scheduleSlotId: slot._id,
				isCancelled: cancel ? true : false,
				reason: cancel?.reason || null,
				cancelledBy: cancel?.cancelledBy?.name || null,
			});
		});

		currentDate.setDate(currentDate.getDate() + 1);
	}

	return upcomingClasses;
};

export const cancelClass = async (req, res) => {
	try {
		const { scheduleSlotId, date, reason } = req.body;

		const [year, month, day] = date.split("-");
		const formattedDate = new Date(Date.UTC(year, month - 1, day)); // Safe UTC date

		const alreadyCancelled = await CancelledClass.findOne({
			scheduleSlot: scheduleSlotId,
			date: formattedDate,
		});

		if (alreadyCancelled) {
			return res.status(400).json({
				success: false,
				message: "Class already cancelled for this date.",
			});
		}

		await CancelledClass.create({
			scheduleSlot: scheduleSlotId,
			date: formattedDate,
			reason,
			cancelledBy: req.user.userId,
		});

		const upcomingClasses = await getUpcomingClassesInternal();

		res.status(200).json({
			success: true,
			message: "Class cancelled successfully.",
			upcomingClasses,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			success: false,
			message: "Internal Server Error",
			error: err.message,
		});
	}
};

// Get upcoming classes endpoint
export const getUpcomingClasses = async (req, res) => {
	try {
		const { userId } = req.user;
		const user = await User.findById(userId);

		if (!user) {
			return res
				.status(404)
				.json({ success: false, message: "User not found" });
		}

		let allUpcoming = await getUpcomingClassesInternal();

		// Filter based on student role
		if (user.role === "student") {
			allUpcoming = allUpcoming.filter(
				(cls) =>
					cls.department === user.department &&
					cls.semester === user.semester
			);
		}

		return res
			.status(200)
			.json({ success: true, upcomingClasses: allUpcoming });
	} catch (err) {
		console.error(err);
		return res
			.status(500)
			.json({ success: false, message: "Server Error" });
	}
};

export const totalClassesTaken = async (req, res) => {
	console.log("Hited");
	try {
		const user = await User.findById(req.user.userId);
		if (!user) {
			return res
				.status(404)
				.json({ success: false, message: "User not found" });
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

		// Determine the weekly schedules relevant to the current user (student or teacher)
		let relevantSchedules = [];
		if (user.role === "student") {
			// Students see schedules for subjects in their department and semester
			const subjects = await Subject.find({
				department: user.department,
				semester: user.semester,
			});
			const subjectIds = subjects.map((sub) => sub._id);
			relevantSchedules = await WeeklySchedule.find({
				subject: { $in: subjectIds },
			});
		} else if (user.role === "teacher") {
			// Teachers see only the schedules they are assigned to teach
			// IMPORTANT: Ensure your WeeklySchedule schema has a 'teacher' field
			// that stores the ObjectId of the User who is the teacher for that slot.
			relevantSchedules = await WeeklySchedule.find({
				teacher: req.user.userId,
			});
		} else {
			// If there are other roles not covered, you might want to return an error
			return res.status(403).json({
				success: false,
				message: "Access denied. Role not authorized for this action.",
			});
		}

		// Fetch all cancellations within the effective date range
		// We only need the scheduleSlot ID and the date to check for cancellations
		const cancellations = await CancelledClass.find({
			date: {
				$gte: effectiveStartDate,
				$lte: today,
			},
		});

		// Create a map for quick lookup of cancelled classes by scheduleSlotId and date
		const cancelledMap = new Map();
		cancellations.forEach((c) => {
			const dateStr = c.date.toISOString().slice(0, 10); // Format date to YYYY-MM-DD
			const key = `${c.scheduleSlot.toString()}_${dateStr}`;
			cancelledMap.set(key, true); // Value can be anything, we just need the key's presence
		});

		let totalScheduledOccurrences = 0; // Counts every potential class instance in the range
		let totalClassesActuallyTaken = 0; // Counts classes that were scheduled AND not cancelled

		// Loop through each day from effectiveStartDate to today to count class occurrences
		let currentDate = new Date(effectiveStartDate);
		// Loop condition: `currentDate <= today` ensures today's classes are included
		while (currentDate <= today) {
			const dayName = currentDate.toLocaleDateString("en-US", {
				weekday: "long",
			});
			const dateStr = currentDate.toISOString().slice(0, 10);

			// Find which relevant weekly schedules fall on the current day of the week
			const dailySchedules = relevantSchedules.filter(
				(s) => s.day === dayName
			);

			dailySchedules.forEach((slot) => {
				const key = `${slot._id.toString()}_${dateStr}`;
				totalScheduledOccurrences++; // Increment for every potential class occurrence

				// Check if this specific occurrence (scheduleSlotId on this date) was cancelled
				if (!cancelledMap.has(key)) {
					totalClassesActuallyTaken++; // If not cancelled, it was "taken"
				}
			});

			// Move to the next day
			currentDate.setDate(currentDate.getDate() + 1);
		}

		// Calculate total classes cancelled within this range
		const totalCancelledOccurrences =
			totalScheduledOccurrences - totalClassesActuallyTaken;

		return res.status(200).json({
			success: true,
			data: {
				totalScheduled: totalScheduledOccurrences, // Total potential class occurrences in the range
				totalCancelled: totalCancelledOccurrences, // Total actual cancelled occurrences in the range
				totalTaken: totalClassesActuallyTaken, // Total actual classes that occurred (not cancelled) in the range
			},
		});
	} catch (error) {
		console.error("Error in totalClassesTaken: ", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error while calculating total classes.",
			error: error.message,
		});
	}
};

export const getCancelledClassesForToday = async (req, res) => {
	if (!req.user) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	const today = new Date();
	const startOfToday = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate()
	);
	const endOfToday = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate() + 1
	);

	try {
		const cancelledClasses = await CancelledClass.find({
			date: {
				$gte: startOfToday,
				$lt: endOfToday,
			},
		}).populate("scheduleSlot"); // Populate scheduleSlot to get class details

		return res.status(200).json({
			success: true,
			message: "Cancelled classes fetched successfully",
			data: cancelledClasses,
		});
	} catch (error) {
		console.error("Error fetching cancelled classes:", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error",
		});
	}
};
