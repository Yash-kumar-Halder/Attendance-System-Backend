import mongoose from "mongoose";


const subjectSchema = new mongoose.Schema(
	{
		subject: {
			type: String,
			required: true,
		},
		code: {
			type: String,
			required: true,
		}, 
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
