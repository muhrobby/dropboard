import { Redis } from "ioredis";

// Graceful fallback for missing redis config (dev environments)
const getRedisClient = () => {
  if (!process.env.REDIS_URL) {
    console.warn("REDIS_URL is missing. Redis functions will fail or act as mock.");
    return null;
  }
  
  return new Redis(process.env.REDIS_URL);
};

export const redis = getRedisClient();
