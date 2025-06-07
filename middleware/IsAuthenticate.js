import jwt from "jsonwebtoken";

export const isAuthenticated = (req, res, next) => {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res
			.status(401)
			.json({ message: "Unauthorized: No token provided" });
	}

	const token = authHeader.split(" ")[1];

	try {
		const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
		req.user = decoded;
		next();
	} catch (error) {
		console.error("Access token invalid or expired:", error);
		return res
			.status(403)
			.json({ message: "Forbidden: Invalid or expired token" });
	}
};
