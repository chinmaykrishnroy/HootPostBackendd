import dotenv from 'dotenv';
dotenv.config();

export default {
    port: process.env.PORT || 5000, // default port if not set
    mongoURI: process.env.MONGO_URI, // MongoDB connection string
    jwtSecret: process.env.JWT_SECRET, // JWT secret key
    secure: process.env.NODE_ENV === 'production', // set secure to true in production
};
