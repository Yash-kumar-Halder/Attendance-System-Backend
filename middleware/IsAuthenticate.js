import jwt from "jsonwebtoken";
import { refreshTokenController } from "../controllers/RenewAccessToken.controller.js";

export const isAuthenticated = (req, res, next) => {
	const authHeader = req.headers.authorization;
	// console.log("Header token:", authHeader);

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res
			.status(401)
			.json({ message: "Unauthorized: No token provided" });
	}

	const token = authHeader.split(" ")[1];

	try {
		const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
		req.user = decoded; // Attach user info to request
		next();
	} catch (error) {
		// try {
		// 	const response = refreshTokenController(req, res);
		// 	return  response
		// } catch (error) {
			console.error("Access token invalid or expired:", error);
			return res
				.status(403)
				.json({ message: "Forbidden: Invalid or expired token" });
		}
		// }
};
