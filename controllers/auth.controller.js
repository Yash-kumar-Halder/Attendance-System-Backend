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
			return res.status(400).json({
				success: false,
				message: "All fields are required",
			});
		}

		// Validate student-only fields if role is "user"
		if (role === "student") {
			if (!department || !semester || !regNo) {
				return res.status(400).json({
					success: false,
					message:
						"Department, semester, and registration number are required for students",
				});
			}
		}

		const existingEmail = await User.findOne({ email });
		if (existingEmail) {
			return res.status(400).json({
				success: false,
				message: "User already exists with this email.",
			});
		}

		const existingPhoneNo = await User.findOne({ phoneNo });
		if (existingPhoneNo) {
			return res.status(400).json({
				success: false,
				message: "User already exists with this phone number.",
			});
		}

		if (role == "student") {
			const existingRegNo = await User.findOne({ regNo });
			if (existingRegNo) {
				return res.status(400).json({
					success: false,
					message: "User already exists with this reg number.",
				});
			}
		}

		const newUser = new User({
			name,
			email,
			phoneNo,
			password,
			role: role || "student", // Default to 'student' if not provided
			department: role === "student" ? department : undefined, // Only set if role is 'student'
			semester: role === "student" ? semester : undefined, // Only set if role is 'student'
			regNo: role === "student" ? regNo : undefined, // Only set if role is 'student'
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
				success: true,
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
		console.log(req.body);
		const { email, password } = req.body.data;
		console.log(req.body.data)
		if (!email || !password) {
			return res.status(400).json({
				success: false,
				message: "All credentials are required",
			});
		}
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(401).json({
				success: false,
				message: "Invalid credentials.",
			});
		}
		const isPasswordMatch = await user.comparePassword(password);
		if (!isPasswordMatch) {
			return res.status(401).json({
				success: false,
				message: "Invalid credentials.",
			});
		}

		// Set refresh token and access token
		const refreshToken = user.generateRefreshToken();
		const accessToken = user.generateAccessToken();
		console.log(accessToken);
		return res
			.cookie("refreshToken", refreshToken, {
				httpOnly: true, // ✅ Secure against XSS (recommended)
				secure: false, // ✅ Required for HTTP (localhost) — only use `true` for HTTPS
				sameSite: "Lax", // ✅ Works for most same-site or localhost setups
				maxAge: 30 * 24 * 60 * 60 * 1000, // ✅ 30 days
			})
			.status(200)
			.json({
				success: true,
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
			.json({
				success: true,
				message: "Logout successful",
			});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Server error",
		});
	}
};
