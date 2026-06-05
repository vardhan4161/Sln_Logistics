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
    const trips = await getDb()
      .collection("trips")
      .find()
      .sort({ serial_no: -1 })
      .toArray();
    res.json(trips);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const body = req.body;
    const id = await nextNumericId("trips");
    const serial_no = await nextNumericId("trip_serials");
    const trip = {
      id,
      serial_no,
      trip_date: body.trip_date,
      from_location: body.from_location,
      to_location: body.to_location,
      vehicle_no: body.vehicle_no,
      chargeable_weight: Number(body.chargeable_weight) || 0,
      rate: Number(body.rate) || 0,
      hamali: Number(body.hamali) || 0,
      total_freight: Number(body.total_freight) || 0,
      added_by: body.added_by || undefined,
      created_at: new Date().toISOString(),
    };

    const result = await getDb().collection("trips").insertOne(trip);
    const created = await getDb()
      .collection("trips")
      .findOne({ _id: result.insertedId });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const filter = idFilter(req.params.id);
    if (!filter) {
      return res.status(400).json({ error: "Invalid trip id" });
    }

    const body = req.body;
    const update = {
      trip_date: body.trip_date,
      from_location: body.from_location,
      to_location: body.to_location,
      vehicle_no: body.vehicle_no,
      chargeable_weight: Number(body.chargeable_weight) || 0,
      rate: Number(body.rate) || 0,
      hamali: Number(body.hamali) || 0,
      total_freight: Number(body.total_freight) || 0,
    };

    const result = await getDb().collection("trips").findOneAndUpdate(
      filter,
      { $set: update },
      { returnDocument: "after" },
    );

    if (!result) {
      return res.status(404).json({ error: "Trip not found" });
    }

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const filter = idFilter(req.params.id);
    if (!filter) {
      return res.status(400).json({ error: "Invalid trip id" });
    }

    const result = await getDb().collection("trips").deleteOne(filter);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Trip not found" });
    }

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
