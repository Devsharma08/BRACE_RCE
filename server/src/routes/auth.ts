import { Router, type Router as ExpressRouter } from "express";
import rateLimit from "express-rate-limit";
import authcontroller from "../controllers/auth.js";
import { authentication } from "../middleware/authentication.js";
import { validate, signupSchema, signinSchema, googleAuthSchema, googleCallbackSchema, otpSendSchema, otpVerifySchema, passwordResetRequestSchema, passwordResetConfirmSchema } from "../middleware/validation.js";

export const authRouter: ExpressRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // AUTH_RATE_MAX raises the ceiling for test suites / staged load checks
  // (same pattern as EXECUTE_RATE_MAX on the /execute route).
  max: Number(process.env.AUTH_RATE_MAX) > 0 ? Math.floor(Number(process.env.AUTH_RATE_MAX)) : 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many auth attempts, please try again later" },
});

authRouter.post('/signup', authLimiter, validate(signupSchema), authcontroller.signup);
authRouter.post('/signin', authLimiter, validate(signinSchema), authcontroller.signin);
authRouter.post('/signout', authcontroller.signout);
authRouter.get('/me', authentication, authcontroller.me);

// ---- Firebase email flows (OTP + password reset) ----

authRouter.post('/otp/send', authLimiter, validate(otpSendSchema), authcontroller.otpSend);
authRouter.post('/otp/verify', authLimiter, validate(otpVerifySchema), authcontroller.otpVerify);
authRouter.post('/password-reset/request', authLimiter, validate(passwordResetRequestSchema), authcontroller.passwordResetRequest);
authRouter.post('/password-reset/confirm', authLimiter, validate(passwordResetConfirmSchema), authcontroller.passwordResetConfirm);

// ---- Firebase-native email/password (signup/signin) ----

authRouter.post('/firebase/signup', authLimiter, validate(signupSchema), authcontroller.firebaseSignup);
authRouter.post('/firebase/signin', authLimiter, validate(signinSchema), authcontroller.firebaseSignin);

authRouter.post('/google', authLimiter, validate(googleAuthSchema), authcontroller.googleAuth);
authRouter.post('/google/callback', authLimiter, validate(googleCallbackSchema), authcontroller.googleCallback);
