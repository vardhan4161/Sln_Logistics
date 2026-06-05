import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDb, nextNumericId } from "../lib/mongo.js";

const router = Router();

function parseObjectId(id: string) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

function idFilter(id: string) {
  const numericId = Number(id);
  if (Number.isInteger(numericId) && numericId > 0) return { id: numericId };

  const objectId = parseObjectId(id);
  return objectId ? { _id: objectId } : null;
}

router.get("/", async (_req, res, next) => {
  try {
    const vehicles = await getDb()
      .collection("vehicles")
      .find()
      .sort({ vehicle_no: 1 })
      .toArray();
    res.json(vehicles);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const vehicle_no = String(req.body.vehicle_no || "").trim().toUpperCase();
    if (!vehicle_no) {
      return res.status(400).json({ error: "Vehicle number is required." });
    }

    const collection = getDb().collection("vehicles");
    const existing = await collection.findOne({ vehicle_no });
    if (existing) return res.status(200).json(existing);

    const id = await nextNumericId("vehicles");
    await collection.insertOne({ id, vehicle_no });

    const vehicle = await collection.findOne({ vehicle_no });
    return res.status(201).json(vehicle);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const filter = idFilter(req.params.id);
    if (!filter) {
      return res.status(400).json({ error: "Invalid vehicle id" });
    }

    const result = await getDb().collection("vehicles").deleteOne(filter);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
