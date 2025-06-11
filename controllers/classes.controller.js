// backend/controllers/class.controller.js
import WeeklySchedule from "../models/weeklyShedule.model.js";
import CancelledClass from "../models/cancelledClass.model.js";
import User from "../models/user.model.js";
import Subject from "../models/subject.model.js";
import Attendance from "../models/attendance.model.js";

// ... (previous imports and code)

// Make sure you have imported your models:
// import WeeklySchedule from '../models/WeeklySchedule';
// import CancelledClass from '../models/CancelledClass';
// import Attendance from '../models/Attendance';
// import User from '../models/User';

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

		if (user.role === "student") {
			schedules = schedules.filter(
				(s) =>
					s.subject.department === user.department &&
					s.subject.semester === user.semester
			);
		}

		const now = new Date();
		const todayStart = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate()
		);

		const CLASS_START_DATE = new Date("2025-06-05");

		const THIRTY_DAYS_AGO = new Date(
			now.getTime() - 30 * 24 * 60 * 60 * 1000
		);

		const effectiveStartDate =
			CLASS_START_DATE > THIRTY_DAYS_AGO
				? CLASS_START_DATE
				: THIRTY_DAYS_AGO;

		const cancellations = await CancelledClass.find({
			date: {
				$gte: effectiveStartDate,
				$lte: now,
			},
		}).populate("cancelledBy");

		const cancelledMap = new Map();
		cancellations.forEach((c) => {
			const formattedDate = new Date(c.date).toLocaleDateString("en-IN", {
				day: "2-digit",
				month: "2-digit",
				year: "2-digit",
			});
			cancelledMap.set(
				`${c.scheduleSlot.toString()}_${formattedDate}`,
				c
			);
		});

		const attendanceRecords = await Attendance.find({
			student: userId,
			date: { $gte: effectiveStartDate, $lte: now },
		});

		const attendanceMap = new Map();
		attendanceRecords.forEach((a) => {
			const formattedDate = new Date(a.date).toLocaleDateString("en-IN", {
				day: "2-digit",
				month: "2-digit",
				year: "2-digit",
			});
			attendanceMap.set(
				`${a.scheduleSlot.toString()}_${formattedDate}`,
				a.status
			);
		});

		const pastClasses = [];
		let currentDateIterator = new Date(todayStart);

		while (currentDateIterator >= effectiveStartDate) {
			const dayName = currentDateIterator.toLocaleDateString("en-US", {
				weekday: "long",
			});
			const formattedDate = currentDateIterator.toLocaleDateString(
				"en-IN",
				{
					day: "2-digit",
					month: "2-digit",
					year: "2-digit",
				}
			);

			// console.log(formattedDate);

			const dailySchedules = schedules.filter((s) => s.day === dayName);

			dailySchedules.forEach((slot) => {
				const classEndTime = new Date(currentDateIterator);
				classEndTime.setHours(
					Math.floor(slot.endTime / 60),
					slot.endTime % 60,
					0,
					0
				);

				if (
					currentDateIterator.toDateString() <
						todayStart.toDateString() ||
					(currentDateIterator.toDateString() ===
						todayStart.toDateString() &&
						classEndTime <= now)
				) {
					const key = `${slot._id.toString()}_${formattedDate}`;
					const cancel = cancelledMap.get(key);
					const attendanceStatus = attendanceMap.get(key);
					const isPresent = attendanceStatus === "present";

					pastClasses.push({
						date: formattedDate,
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
						isPresent: isPresent,
					});
				}
			});

			currentDateIterator.setDate(currentDateIterator.getDate() - 1);
			currentDateIterator.setHours(0, 0, 0, 0);
		}

		pastClasses.sort((a, b) => {
			const [dayA, monthA, yearA] = a.date.split("-");
			const [dayB, monthB, yearB] = b.date.split("-");

			const dateA = new Date(`20${yearA}`, monthA - 1, dayA);
			const dateB = new Date(`20${yearB}`, monthB - 1, dayB);

			if (dateA.getTime() === dateB.getTime()) {
				return a.startTime - b.startTime;
			}
			return dateB.getTime() - dateA.getTime();
		});

		return res.status(200).json({ success: true, pastClasses });
	} catch (err) {
		console.error(err);
		return res
			.status(500)
			.json({ success: false, message: "Server Error" });
	}
};

// Ensure you have imported your Mongoose models:
// import WeeklySchedule from '../models/WeeklySchedule';
// import CancelledClass from '../models/CancelledClass';
// import User from '../models/User';

// Ensure you have imported your Mongoose models:
// import WeeklySchedule from '../models/WeeklySchedule';
// import CancelledClass from '../models/CancelledClass';
// import User from '../models/User';

const getUpcomingClassesInternal = async () => {
    try {
        const schedules = await WeeklySchedule.find().populate("subject");

        const now = new Date(); // Current date and time in the server's local timezone
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Beginning of today (00:00:00) in local timezone

        // Define the end of the upcoming period (30 days from now, end of that day)
        const THIRTY_DAYS_LATER = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 30 // Get the date 30 days from 'now'
        );
        THIRTY_DAYS_LATER.setHours(23, 59, 59, 999); // Set to the very end of that day for an inclusive range

        const cancellations = await CancelledClass.find({
            date: {
                $gte: todayStart, // Start looking for cancellations from the beginning of today
                $lte: THIRTY_DAYS_LATER, // Up to 30 days later (end of day)
            },
        }).populate("cancelledBy");

        const cancelledDict = {};
        cancellations.forEach((c) => {
            // Use consistent date string format (YYYY-MM-DD) for the key
            const dateKey = c.date.toISOString().slice(0, 10);
            const key = `${c.scheduleSlot.toString()}_${dateKey}`;
            cancelledDict[key] = c;
        });

        const upcomingClasses = [];
        // Start iterating from the beginning of today. This iterator helps us
        // determine the specific calendar day we are processing.
        let currentDateIterator = new Date(todayStart);

        // Loop through dates from today up to THIRTY_DAYS_LATER (inclusive)
        while (currentDateIterator <= THIRTY_DAYS_LATER) {
            const dayName = currentDateIterator.toLocaleDateString("en-US", {
                weekday: "long",
            });
            const dateStr = currentDateIterator.toISOString().slice(0, 10); // "YYYY-MM-DD" for the current day in iteration

            // Filter schedules that match the current day of the week (e.g., "Tuesday")
            const dailySchedules = schedules.filter((s) => s.day === dayName);

            dailySchedules.forEach((slot) => {
                // Construct a Date object representing the actual START time of the class for this specific date.
                // We use the year, month, and day from currentDateIterator and the time from slot.startTime.
                // This ensures the Date object is created in the server's local timezone.
                const classStartTime = new Date(
                    currentDateIterator.getFullYear(),
                    currentDateIterator.getMonth(),
                    currentDateIterator.getDate(),
                    Math.floor(slot.startTime / 60), // Hours
                    slot.startTime % 60, // Minutes
                    0, 0 // Seconds, Milliseconds
                );

                // Construct a Date object representing the actual END time of the class for this specific date.
                const classEndTime = new Date(
                    currentDateIterator.getFullYear(),
                    currentDateIterator.getMonth(),
                    currentDateIterator.getDate(),
                    Math.floor(slot.endTime / 60), // Hours
                    slot.endTime % 60, // Minutes
                    0, 0 // Seconds, Milliseconds
                );

                // CORE LOGIC: Only include the class if its start time is in the future relative to 'now'.
                // This correctly ensures that:
                // 1. Classes from previous days are NOT included.
                // 2. Classes from today that have already started/finished are NOT included.
                // 3. Classes from today that are still in the future ARE included.
                // 4. Classes from future days ARE included.
                if (classStartTime > now) {
                    const key = `${slot._id.toString()}_${dateStr}`;
                    const cancel = cancelledDict[key];

                    upcomingClasses.push({
                        date: dateStr, // Keep as "YYYY-MM-DD" for consistency and easy parsing on frontend
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
                }
            });

            // Move to the next calendar day and normalize its time to 00:00:00.
            // This ensures we always move to the start of the next logical day.
            currentDateIterator.setDate(currentDateIterator.getDate() + 1);
            currentDateIterator.setHours(0, 0, 0, 0);
        }

        // Sort the upcoming classes: first by date (ascending), then by start time (ascending)
        upcomingClasses.sort((a, b) => {
            // Convert date strings back to Date objects for robust comparison
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);

            // Primary sort: by date (earlier dates first)
            if (dateA.getTime() !== dateB.getTime()) {
                return dateA.getTime() - dateB.getTime();
            }

            // Secondary sort: by start time (earlier times first on the same day)
            return a.startTime - b.startTime;
        });

        return upcomingClasses;
    } catch (error) {
        console.error("Error in getUpcomingClassesInternal:", error);
        throw error; // Re-throw the error to be caught by the outer function
    }
};

// This function acts as the API endpoint wrapper
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

        // Apply role-based filtering *after* fetching all upcoming classes and sorting
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

export const totalClassesTaken = async (req, res) => {
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
