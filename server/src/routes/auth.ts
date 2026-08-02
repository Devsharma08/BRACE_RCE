import { Router, type Router as ExpressRouter } from "express";
import authcontroller from "../controllers/auth.js";
import { authentication } from "../middleware/authentication.js";

export const authRouter: ExpressRouter = Router();

authRouter.post('/signup', authcontroller.signup);
authRouter.post('/signin', authcontroller.signin);
authRouter.post('/signout', authcontroller.signout);
authRouter.get('/me', authentication, authcontroller.me);
authRouter.post('/google', authcontroller.googleAuth);