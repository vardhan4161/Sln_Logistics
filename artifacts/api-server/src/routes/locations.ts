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

router.put("/:id", async (req, res, next) => {
  try {
    const filter = idFilter(req.params.id);
    if (!filter) {
      return res.status(400).json({ error: "Invalid location id" });
    }

    const newName = String(req.body.name || "").trim();
    if (!newName) {
      return res.status(400).json({ error: "Location name is required." });
    }

    const db = getDb();
    const collection = db.collection("locations");

    // Find the existing location to get the old name
    const existing = await collection.findOne(filter);
    if (!existing) {
      return res.status(404).json({ error: "Location not found" });
    }

    const oldName = existing.name;

    // Check for duplicate name (case-insensitive)
    if (oldName.toLowerCase() !== newName.toLowerCase()) {
      const duplicate = await collection.findOne({
        name: { $regex: new RegExp(`^${newName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      });
      if (duplicate) {
        return res.status(409).json({ error: "A location with this name already exists." });
      }
    }

    // Update the location name
    await collection.updateOne(filter, { $set: { name: newName } });

    // Cascade rename to trips
    const tripsCollection = db.collection("trips");
    const [tripsFrom, tripsTo] = await Promise.all([
      tripsCollection.updateMany({ from_location: oldName }, { $set: { from_location: newName } }),
      tripsCollection.updateMany({ to_location: oldName }, { $set: { to_location: newName } }),
    ]);

    // Cascade rename to routes (rates)
    const routesCollection = db.collection("routes");
    const [routesFrom, routesTo] = await Promise.all([
      routesCollection.updateMany({ from_location: oldName }, { $set: { from_location: newName } }),
      routesCollection.updateMany({ to_location: oldName }, { $set: { to_location: newName } }),
    ]);

    const updated = await collection.findOne(filter);
    return res.json({
      ...updated,
      _cascade: {
        trips_updated: tripsFrom.modifiedCount + tripsTo.modifiedCount,
        routes_updated: routesFrom.modifiedCount + routesTo.modifiedCount,
      },
    });
  } catch (error) {
    return next(error);
  }
});

function idFilter(id: string) {
  const numericId = Number(id);
  if (Number.isInteger(numericId) && numericId > 0) return { id: numericId };

  const objectId = parseObjectId(id);
  return objectId ? { _id: objectId } : null;
}

router.get("/", async (_req, res, next) => {
  try {
    const locations = await getDb()
      .collection("locations")
      .find()
      .sort({ name: 1 })
      .toArray();
    res.json(locations);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "Location name is required." });
    }

    const collection = getDb().collection("locations");
    const existing = await collection.findOne({ name });
    if (existing) return res.status(200).json(existing);

    const id = await nextNumericId("locations");
    await collection.insertOne({ id, name });

    const location = await collection.findOne({ name });
    return res.status(201).json(location);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const filter = idFilter(req.params.id);
    if (!filter) {
      return res.status(400).json({ error: "Invalid location id" });
    }

    const result = await getDb().collection("locations").deleteOne(filter);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Location not found" });
    }

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
