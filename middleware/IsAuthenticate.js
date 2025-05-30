import jwt from "jsonwebtoken";

export const isAuthenticated = (req, res, next) => {
    const token =
		req.headers.authorization?.split(" ")[1] || req.cookies?.refreshToken;
    if (!token) {
        return res.status(401).json({ message: "Unauthorized request." });
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        req.user = decoded; // Attach user info to request object
        next();
    } catch (error) {
        console.error("Authentication error:", error);
        return res.status(403).json({ message: "Forbidden" });
    }
}