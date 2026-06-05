import app from "../src/app.js";
import { connectMongo } from "../src/lib/mongo.js";

// Connect to MongoDB before handling the request
let isConnected = false;

export default async function (req: any, res: any) {
  if (!isConnected) {
    await connectMongo();
    isConnected = true;
  }
  return app(req, res);
}
