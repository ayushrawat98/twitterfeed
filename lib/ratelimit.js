import rateLimit from "express-rate-limit";

export const burstLimiter = rateLimit({
    windowMs: 5000,
    max: 1,
    message: {message : "Wait 5 seconds."}
});

// Protects against "Low and Slow" spam bots
export const quotaLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: {message : "Hourly limit reached."}
});
	