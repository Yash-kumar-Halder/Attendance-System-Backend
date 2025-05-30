import app from './app.js';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './db/connectDB.js';

dotenv.config();
// Enable CORS for all routes
app.use(cors({
    origin: process.env.CORS_ORIGIN, // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow specific methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Allow specific headers
}));

connectDB().then(() => {
    app.listen(process.env.PORT, () => {
		console.log(`Server running on port ${process.env.PORT}`);
	});
}).catch((error) => {
    console.error('Failed to connect to the database:', error);
    process.exit(1); // Exit process with failure
});
