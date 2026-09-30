import { Router, type Router as ExpressRouter } from "express";
import rateLimit from "express-rate-limit";
import authcontroller from "../controllers/auth.js";
import { authentication } from "../middleware/authentication.js";
import { validate, signupSchema, signinSchema, googleAuthSchema, googleCallbackSchema } from "../middleware/validation.js";

export const authRouter: ExpressRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many auth attempts, please try again later" },
});

authRouter.post('/signup', authLimiter, validate(signupSchema), authcontroller.signup);
authRouter.post('/signin', authLimiter, validate(signinSchema), authcontroller.signin);
authRouter.post('/signout', authcontroller.signout);
authRouter.get('/me', authentication, authcontroller.me);
authRouter.post('/google', authLimiter, validate(googleAuthSchema), authcontroller.googleAuth);
authRouter.post('/google/callback', authLimiter, validate(googleCallbackSchema), authcontroller.googleCallback);