import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 4000,
  MONGODB_URI:
    process.env.MONGO_URL || "mongodb://localhost:27017/runner_db",
  JUDGE0_URL: process.env.JUDGE0_URL || "http://judge0-lb:2358",
  JUDGE0_AUTHN_TOKEN: process.env.AUTHN_TOKEN,
  JWT_SECRET: process.env.JWT_SECRET,
  // CORS Configuration
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(",") || [
    "http://localhost:3000",
    "http://localhost:3003",
  ],
};
