import User from "../models/user.model.js";

export const registerUser = async (req, res) => {
	try {
		const {
			name,
			email,
			phoneNo,
			password,
			role,
			department,
			semester,
			regNo,
		} = req.body;

		if (!name || !email || !phoneNo || !password) {
			return res.status(400).json({ message: "All fields are required" });
		}

		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(400).json({ message: "User already exists" });
		}

		// Validate student-only fields if role is "user"
		if (role === "user") {
			if (!department || !semester || !regNo) {
				return res.status(400).json({
					message:
						"Department, semester, and registration number are required for students",
				});
			}
		}

		const newUser = new User({
			name,
			email,
			phoneNo,
			password,
			role: role || "user", // Default to 'user' if not provided
			department: role === "user" ? department : undefined, // Only set if role is 'user'
			semester: role === "user" ? semester : undefined, // Only set if role is 'user'
			regNo: role === "user" ? regNo : undefined, // Only set if role is 'user'
		});
		await newUser.save();

		// Set refresh token and access token
		const refreshToken = newUser.generateRefreshToken();
		const accessToken = newUser.generateAccessToken();

		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "Strict",
			maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
		})
			.status(201)
			.json({
				message: "User registered successfully",
				accessToken,
				user: newUser.getPublicProfile(),
			});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error" });
	}
};

export const loginUser = async (req, res) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) {
			return res
				.status(400)
				.json({ message: "Email and password are required" });
		}
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(401).json({ message: "Invalid credentioals." });
		}
		const isPasswordMatch = await user.comparePassword(password);
		if (!isPasswordMatch) {
			return res.status(401).json({ message: "Invalid credentioals." });
		}

		// Set refresh token and access token
		const refreshToken = user.generateRefreshToken();
		const accessToken = user.generateAccessToken();
		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "Strict",
			maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
		})
			.status(200)
			.json({
				message: "Login successful",
				accessToken,
				user: user.getPublicProfile(),
			});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error" });
	}
};

export const logoutUser = async (req, res) => {
	try {
		res.clearCookie("refreshToken", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "Strict",
		})
			.status(200)
			.json({ message: "Logout successful" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Server error" });
	}
};
