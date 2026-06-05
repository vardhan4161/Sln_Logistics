import app from "./app.js";
import { logger } from "./lib/logger.js";
import { connectMongo } from "./lib/mongo.js";

if (process.env["NODE_ENV"] !== "production" && !process.env["VERCEL"]) {
  const port = process.env["PORT"] ? Number(process.env["PORT"]) : 8080;
  app.listen(port, () => {
    logger.info(`Server listening on port ${port}`);
  });
}

export default app;
