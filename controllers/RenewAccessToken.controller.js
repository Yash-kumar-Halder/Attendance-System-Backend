import jwt from "jsonwebtoken";

export const refreshTokenController = (req, res) => {
	const refreshToken = req.cookies.refreshToken;

	if (!refreshToken) {
		return res.status(401).json({
			success: false,
			message: "Refresh token missing",
		});
	}

	try {
		const decoded = jwt.verify(
			refreshToken,
			process.env.REFRESH_TOKEN_SECRET
		);

		// ✅ Fix key here
		const payload = {
			userId: decoded.userId,
			role: decoded.role,
		};

		const newAccessToken = jwt.sign(
			payload,
			process.env.ACCESS_TOKEN_SECRET,
			{ expiresIn: "30m" }
		);

		return res.status(200).json({
			success: true,
			accessToken: newAccessToken,
			user: payload,
		});
	} catch (error) {
		console.error("Refresh token error:", error);
		return res.status(403).json({
			success: false,
			message: "Invalid or expired refresh token",
		});
	}
};
