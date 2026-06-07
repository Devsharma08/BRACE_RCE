import { Router, type Router as ExpressRouter } from "express";
import { commitHistory } from "../controllers/github/commitHistory.js";
import { getDownloadInfo } from "../controllers/github/getDownloadInfo.js";
import { getFileContent } from "../controllers/github/getFileContent.js";
import { getFileNames } from "../controllers/github/getFileNames.js";
import { getFiles } from "../controllers/github/getFiles.js";
import { getRepoStats } from "../controllers/github/getRepoStats.js";
import { apiLimiter } from "../middleware/apiLimiter.js";

export const githubRouter: ExpressRouter = Router();

githubRouter.get("/files", apiLimiter, getFiles);
githubRouter.get("/filenames", apiLimiter, getFileNames);
githubRouter.get("/filecontent", apiLimiter, getFileContent);
githubRouter.get("/downloadinfo", apiLimiter, getDownloadInfo);
githubRouter.get("/commithistory", apiLimiter, commitHistory);
githubRouter.get("/getstats", apiLimiter, getRepoStats);
