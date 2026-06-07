declare module "cors" {
  import type { RequestHandler } from "express";

  const cors: () => RequestHandler;

  export default cors;
}
