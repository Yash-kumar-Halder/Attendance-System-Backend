import mongoose from "mongoose";

// models/Subject.js
const subjectSchema = new mongoose.Schema(
	{
		subject: {
			type: String,
			required: true,
		}, // e.g. "Operating Systems"
		code: {
			type: String,
			required: true,
		}, // e.g. "OS101"
		teacher: {
			type: String,
			required: true,
		},
		department: {
			type: String,
			enum: ["CST", "CFS", "EE", "ID", "MTR"],
			required: true,
		},
		semester: {
			type: String,
			enum: ["1st", "2nd", "3rd", "4th", "5th", "6th"],
			required: true,
		},
	},
	{ timestamps: true }
);

const Subject = mongoose.model("Subject", subjectSchema);
export default Subject;
