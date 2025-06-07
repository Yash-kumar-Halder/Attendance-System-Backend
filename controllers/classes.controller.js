import WeeklySchedule from "../models/weeklyShedule.model.js"
import CancelledClass from "../models/cancelledClass.model.js";

export const getClassHistory = async (req, res) => {
	try {
		const schedules = await WeeklySchedule.find().populate("subject");
		const pastClasses = [];
		const upcomingClasses = [];

		const today = new Date();

		// Create a map of cancelled classes for quick access
		const cancellations = await CancelledClass.find({
			date: {
				$gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
				$lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
			},
		}).populate("cancelledBy");

		const cancelledMap = new Map();
		cancellations.forEach((c) => {
			cancelledMap.set(
				`${c.scheduleSlot}_${c.date.toISOString().slice(0, 10)}`,
				c
			);
		});

		// Function to generate classes
		const generateClasses = (range, type) => {
			for (let i = 0; i < 30; i++) {
				const date = new Date(today);
				date.setDate(today.getDate() + (type === "future" ? i : -i));

				const dayName = date.toLocaleDateString("en-US", {
					weekday: "long",
				});

				const dailySchedules = schedules.filter(
					(s) => s.day === dayName
				);

				dailySchedules.forEach((slot) => {
					const dateStr = date.toISOString().slice(0, 10);
					const key = `${slot._id}_${dateStr}`;
					const cancel = cancelledMap.get(key);

					const classObj = {
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
					};

					if (type === "past") pastClasses.push(classObj);
					else upcomingClasses.push(classObj);
				});
			}
		};

		generateClasses(30, "past");
		generateClasses(30, "future");

		return res.status(200).json({
			success: true,
			pastClasses,
			upcomingClasses,
		});
	} catch (err) {
		console.error(err);
		return res
			.status(500)
			.json({ success: false, message: "Server Error" });
	}
};
