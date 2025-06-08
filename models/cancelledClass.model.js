import mongoose from "mongoose";

const cancelledClassSchema = new mongoose.Schema(
	{
		scheduleSlot: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "WeeklySchedule",
			required: true,
		},
		date: {
			type: Date,
			required: true,
		},
		cancelledBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User", // the teacher who cancelled
			required: true,
		},
		reason: {
			type: String,
			default: "",
		},
	},
	{ timestamps: true }
);

const CancelledClass = mongoose.model("CancelledClass", cancelledClassSchema);
export default CancelledClass;
