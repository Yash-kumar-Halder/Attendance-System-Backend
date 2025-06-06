import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			lowercase: true,
		},
		phoneNo: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		password: {
			type: String,
			required: true
		},
		role: {
			type: String,
			enum: ["student", "teacher"],
			default: "user",
		},
		department: {
			type: String,
			enum: ["CST", "CFS", "EE", "ID", "MTR"],
			validate: {
				validator: function (value) {
					return this.role === "teacher" || value;
				},
				message: "Department is required for users",
			},
		},
		semester: {
			type: String,
			enum: ["1st", "2nd", "3rd", "4th", "5th", "6th"],
			validate: {
				validator: function (value) {
					return this.role === "teacher" || value;
				},
				message: "Semester is required for users",
			},
		},
		regNo: {
			type: String,
			trim: true,
			validate: {
				validator: function (value) {
					return this.role === "teacher" || value;
				},
				message: "Registration number is required for users",
			},
		},
	},
	{ timestamps: true }
);

// Pre-save hook to hash the password
userSchema.pre("save", async function (next) {
	if (this.isModified("password")) {
		const salt = await bcrypt.genSalt(10);
		this.password = await bcrypt.hash(this.password, salt);
	}
	next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
	try {
		return await bcrypt.compare(candidatePassword, this.password);
	} catch (error) {
		throw new Error("Password comparison failed");
	}
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function () {
	const payload = { userId: this._id.toString(), role: this.role };
	return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
		expiresIn: "30d",
	});
};

// Generate access token
userSchema.methods.generateAccessToken = function () {
	const payload = { userId: this._id.toString(), role: this.role };
	return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
		expiresIn: "30m",
	});
};

userSchema.methods.getPublicProfile = function () {
	const user = this.toObject();
	delete user.password;
	delete user.__v;
	return user;
};


const User = mongoose.model("User", userSchema);
export default User;
