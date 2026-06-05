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
    const rates = await getDb()
      .collection("routes")
      .find()
      .sort({ from_location: 1, weight_mt: 1 })
      .toArray();
    res.json(rates);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const payload = {
      from_location: String(req.body.from_location || "").trim(),
      to_location: String(req.body.to_location || "").trim(),
      weight_mt: Number(req.body.weight_mt) || 0,
      rate: Number(req.body.rate) || 0,
      hamali: Number(req.body.hamali) || 0,
    };

    if (!payload.from_location || !payload.to_location || payload.weight_mt <= 0) {
      return res.status(400).json({ error: "Route and weight are required." });
    }

    const collection = getDb().collection("routes");
    const existing = await collection.findOne({
      from_location: payload.from_location,
      to_location: payload.to_location,
      weight_mt: payload.weight_mt,
    });

    if (existing) {
      const updated = await collection.findOneAndUpdate(
        { id: existing.id },
        { $set: payload },
        { returnDocument: "after" },
      );
      return res.status(200).json(updated ?? existing);
    }

    const id = await nextNumericId("routes");
    await collection.insertOne({ id, ...payload });

    const route = await collection.findOne(
      {
        from_location: payload.from_location,
        to_location: payload.to_location,
        weight_mt: payload.weight_mt,
      },
    );

    return res.status(201).json(route);
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const filter = idFilter(req.params.id);
    if (!filter) {
      return res.status(400).json({ error: "Invalid rate id" });
    }

    const payload = {
      from_location: String(req.body.from_location || "").trim(),
      to_location: String(req.body.to_location || "").trim(),
      weight_mt: Number(req.body.weight_mt) || 0,
      rate: Number(req.body.rate) || 0,
      hamali: Number(req.body.hamali) || 0,
    };

    if (!payload.from_location || !payload.to_location || payload.weight_mt <= 0) {
      return res.status(400).json({ error: "Route and weight are required." });
    }

    const result = await getDb().collection("routes").findOneAndUpdate(
      filter,
      { $set: payload },
      { returnDocument: "after" },
    );

    if (!result) {
      return res.status(404).json({ error: "Rate not found" });
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
      return res.status(400).json({ error: "Invalid rate id" });
    }

    const result = await getDb().collection("routes").deleteOne(filter);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Rate not found" });
    }

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
