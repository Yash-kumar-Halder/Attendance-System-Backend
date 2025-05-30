import mongoose from "mongoose";

// models/WeeklySchedule.js
const weeklyScheduleSchema = new mongoose.Schema({
	day: {
		type: String,
		enum: [
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
			"Sunday",
		],
		required: true,
	},
	startTime: {
		type: Number,
		required: true,
	},
	endTime: {
		type: Number,
		required: true,
	},
	subject: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Subject",
		required: true,
	},
});

const WeeklySchedule = mongoose.model("WeeklySchedule", weeklyScheduleSchema);
export default WeeklySchedule;
