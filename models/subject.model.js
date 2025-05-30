import mongoose from "mongoose";
import User from "./user.model";

// models/Subject.js
const subjectSchema = new mongoose.Schema({
	name: { type: String, required: true }, // e.g. "Operating Systems"
	code: { type: String, required: true }, // e.g. "OS101"
	teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Optional
});

const Subject = mongoose.model("Subject", subjectSchema);
export default Subject;