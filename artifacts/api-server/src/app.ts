import express, { type Express } from "express";
import cors from "cors";
import pinoHttpLib from "pino-http";
const pinoHttp = pinoHttpLib as any;
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

// @ts-ignore
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
