import Subject from "../models/subject.model.js";

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
			semester
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
		if (req.user.role !== "teacher") {
			return res.status(403).json({ message: "Access denied" });
		}

		const subjects = await Subject.find(); // fetches all documents
		res.status(200).json({
			success: true,
			subjects,
		});
		
	} catch (error) {
		console.error("Error setting subject:", error);
		res.status(500).json({ message: "Internal server error" });
	}
}
