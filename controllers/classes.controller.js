import WeeklySchedule from "../models/weeklyShedule.model.js"
import CancelledClass from "../models/cancelledClass.model.js";
import User from "../models/user.model.js"

// controllers/classController.js
export const getClassHistory = async (req, res) => {
	const {userId} = req.user;

	try {
		const user = await User.findById(userId);
		if (!user) {
			return res
				.status(404)
				.json({ success: false, message: "User not found" });
		}

		// Fetch all schedules with subject details
		const schedules = await WeeklySchedule.find().populate("subject");
		const today = new Date();
		const pastClasses = [];

		const CLASS_START_DATE = new Date("2025-06-02"); // 🔒 Hardcoded academic start
		const THIRTY_DAYS_AGO = new Date(
			today.getTime() - 30 * 24 * 60 * 60 * 1000
		);
		const effectiveStartDate =
			CLASS_START_DATE > THIRTY_DAYS_AGO
				? CLASS_START_DATE
				: THIRTY_DAYS_AGO;

		// Fetch cancelled classes only in the effective date range
		const cancellations = await CancelledClass.find({
			date: {
				$gte: effectiveStartDate,
				$lte: today,
			},
		}).populate("cancelledBy");

		const cancelledMap = new Map();
		cancellations.forEach((c) => {
			cancelledMap.set(
				`${c.scheduleSlot}_${c.date.toISOString().slice(0, 10)}`,
				c
			);
		});

		// Traverse backwards from today to the effective start date
		let currentDate = new Date(today);
		while (currentDate >= effectiveStartDate) {
			const dayName = currentDate.toLocaleDateString("en-US", {
				weekday: "long",
			});
			const dateStr = currentDate.toISOString().slice(0, 10);

			// Get schedules for this day
			const dailySchedules = schedules.filter((s) => s.day === dayName);

			dailySchedules.forEach((slot) => {
				// 🔐 Role-based filtering (student sees only their dept/sem)
				if (
					user.role === "student" &&
					(user.department !== slot.subject.department ||
						user.semester !== slot.subject.semester)
				) {
					return; // skip if doesn't match student's class
				}

				const key = `${slot._id}_${dateStr}`;
				const cancel = cancelledMap.get(key);

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
				});
			});

			currentDate.setDate(currentDate.getDate() - 1); // step back 1 day
		}

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
		today.getTime() + 30 * 24 * 60 * 60 * 1000
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

	console.log(cancelledDict)

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

