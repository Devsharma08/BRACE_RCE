import { Router, type Router as ExpressRouter } from "express";
import rateLimit from "express-rate-limit";
import authcontroller from "../controllers/auth.js";
import { authentication } from "../middleware/authentication.js";
import { validate, signupSchema, signinSchema, googleAuthSchema, googleCallbackSchema, otpSendSchema, otpVerifySchema, passwordResetRequestSchema, passwordResetConfirmSchema } from "../middleware/validation.js";
import { turnstileConfigured, verifyTurnstileToken } from "../lib/turnstile.js";
import type { Request, Response, NextFunction } from "express";

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

/**
 * Server-side Turnstile verification for auth endpoints.
 *
 * The browser widget is not enough on its own — a bot can forge a token field
 * without ever rendering the challenge. This middleware exchanges the token
 * with Cloudflare's siteverify endpoint and rejects the request on any
 * non-verified verdict.
 *
 * Only active when TURNSTILE_SECRET_KEY is set: when the secret is missing the
 * widget is never rendered client-side (see src/config/turnstile.ts), so there
 * is no token to verify and the request proceeds — this keeps local/dev
 * environments working without a Turnstile deployment.
 */
function verifyCaptcha(req: Request, res: Response, next: NextFunction) {
  if (!turnstileConfigured()) {
    return next();
  }

  const token = req.body?.captchaToken;
  if (!token) {
    return res.status(403).json({
      status: "error",
      message: "Bot protection: captcha token is required",
    });
  }

  verifyTurnstileToken(token, req.ip ?? req.socket?.remoteAddress ?? undefined).then((verdict) => {
    if (!verdict.success) {
      return res.status(403).json({
        status: "error",
        message: "Bot protection: captcha verification failed",
      });
    }
    next();
  }).catch(() => {
    return res.status(502).json({
      status: "error",
      message: "Bot protection: verification service unavailable",
    });
  });
}

authRouter.post('/signup', authLimiter, validate(signupSchema), verifyCaptcha, authcontroller.signup);
authRouter.post('/signin', authLimiter, validate(signinSchema), verifyCaptcha, authcontroller.signin);
authRouter.post('/signout', authcontroller.signout);
authRouter.get('/me', authentication, authcontroller.me);

// ---- Firebase email flows (OTP + password reset) ----

authRouter.post('/otp/send', authLimiter, validate(otpSendSchema), verifyCaptcha, authcontroller.otpSend);
authRouter.post('/otp/verify', authLimiter, validate(otpVerifySchema), verifyCaptcha, authcontroller.otpVerify);
authRouter.post('/password-reset/request', authLimiter, validate(passwordResetRequestSchema), authcontroller.passwordResetRequest);
authRouter.post('/password-reset/confirm', authLimiter, validate(passwordResetConfirmSchema), authcontroller.passwordResetConfirm);

// ---- Firebase-native email/password (signup/signin) ----

authRouter.post('/firebase/signup', authLimiter, validate(signupSchema), verifyCaptcha, authcontroller.firebaseSignup);
authRouter.post('/firebase/signin', authLimiter, validate(signinSchema), verifyCaptcha, authcontroller.firebaseSignin);

authRouter.post('/google', authLimiter, validate(googleAuthSchema), authcontroller.googleAuth);
authRouter.post('/google/callback', authLimiter, validate(googleCallbackSchema), authcontroller.googleCallback);
