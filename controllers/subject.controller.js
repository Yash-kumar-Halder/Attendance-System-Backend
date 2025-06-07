import Subject from "../models/subject.model.js";
import User from "../models/user.model.js"

export const setSubject = async (req, res) => {
	try {
		const { subject, code, teacher, department, semester } = req.body;
		if (!subject || !code || !teacher || !department || !semester) {
			return res.status(400).json({ message: "All fields are required" });
		}

		// Only Admins can set subjects
		if (req.user.role !== "teacher") {
			return res.status(403).json({ message: "Access denied" });
		}
		const newSubject = new Subject({
			subject,
			code,
			teacher,
			department,
			semester,
		});
		await newSubject.save();
		res.status(201).json({
			success: true,
			message: "Subject created successfully",
			newSubject,
		});
	} catch (error) {
		console.error("Error setting subject:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

export const getAllSubject = async (req, res) => {
	try {
		// if (req.user.role !== "teacher") {
		// 	return res.status(403).json({ message: "Access denied" });
		// }

		const subjects = await Subject.find().sort({ createdAt: -1 }); // newest first and  fetches all documents
		res.status(200).json({
			success: true,
			subjects,
		});
	} catch (error) {
		console.error("Error setting subject:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

export const getAllStudentSubject = async (req, res) => {
	if (!req.user) {
		return res.status(401).json({ message: "Unauthorized" });
	}
	const { userId, role } = req.user;

	if (role === "teacher") {
		return res.status(403).json({
			message:
				"Access denied: Teachers are not allowed to access this resource.",
		});
	}

	try {
		const user = await User.findOne(userId);
		const { department, semester } = user;

		if (!department || !semester) {
			return res
				.status(400)
				.json({ message: "Department and semester are required." });
		}

		const subjects = await Subject.find({department, semester});
		res.status(200).json({
			success: true,
			subjects,
		});
	} catch (error) {
		console.error("Error setting subject:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

export const deleteSubject = async (req, res) => {
	try {
		const subjectId = req.params.id;

		// Delete the subject by _id
		const deletedSubject = await Subject.findByIdAndDelete(subjectId);

		if (!deletedSubject) {
			return res.status(404).json({
				success: false,
				message: "Subject not found",
			});
		}

		// Fetch updated subjects list
		const subjects = await Subject.find();

		res.status(200).json({
			success: true,
			message: "Subject deleted successfully",
			subjects,
		});
	} catch (error) {
		console.error("Error deleting subject:", error);
		res.status(500).json({
			success: false,
			message: "Server error while deleting subject",
		});
	}
};
