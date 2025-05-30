import mongoose from "mongoose";

// models/Attendance.js
const attendanceSchema = new mongoose.Schema({
	student: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	subject: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Subject",
		required: true,
	},
	date: {
		type: Date,
		required: true,
		default: Date.now,
	},
	scheduleSlot: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "WeeklySchedule",
		required: true,
	},
	status: {
		type: String,
		enum: ["present", "absent"],
		default: "present",
	},
	markedAt: {
		type: Date,
		default: Date.now,
	},
});

attendanceSchema.index(
	{ student: 1, date: 1, scheduleSlot: 1 },
	{ unique: true }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
