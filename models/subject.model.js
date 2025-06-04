import mongoose from "mongoose";
import User from "./user.model.js";

// models/Subject.js
const subjectSchema = new mongoose.Schema({
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
	}
});

const Subject = mongoose.model("Subject", subjectSchema);
export default Subject;
