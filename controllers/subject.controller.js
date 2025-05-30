import Subject from "../models/subject.model.js";

export const setSubject = async (req, res) => {
	try {
		const { name, code, teacher } = req.body;
		if (!name || !code || !teacher) {
			return res.status(400).json({ message: "All fields are required" });
		}

		// Only Admins can set subjects
		if (req.user.role !== "admin") {
			return res.status(403).json({ message: "Access denied" });
		}
		const subject = new Subject({
			name,
			code,
			teacher,
		});
		await subject.save();
		res.status(201).json({
			message: "Subject created successfully",
			subject,
		});
	} catch (error) {
		console.error("Error setting subject:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};
