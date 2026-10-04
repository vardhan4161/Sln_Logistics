import { Router } from "express";
import { getDb, nextNumericId } from "../lib/mongo.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const challans = await getDb().collection("challans").find({}).sort({ created_at: -1 }).toArray();
    return res.json(challans);
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = req.body ?? {};
    const challanNo = String(data.challan_no ?? "").trim();
    const date = String(data.date ?? "").trim();
    const vehicleNo = String(data.vehicle_no ?? "").trim().toUpperCase();
    const fromLocation = String(data.from_location ?? "").trim();
    const toLocation = String(data.to_location ?? "").trim();
    const consignee = String(data.consignee ?? "").trim();
    const material = String(data.material ?? "").trim();
    const quantity = Number(data.quantity ?? 0);
    if (!challanNo || !date || !vehicleNo || !fromLocation || !toLocation) {
      return res.status(400).json({ error: "Challan number, date, vehicle, from and to locations are required." });
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      return res.status(400).json({ error: "Quantity must be a valid non-negative number." });
    }
    const collection = getDb().collection("challans");
    const duplicate = await collection.findOne({ challan_no: challanNo });
    if (duplicate) return res.status(409).json({ error: `Challan ${challanNo} already exists.` });
    const record = {
      id: await nextNumericId("challans"),
      challan_no: challanNo,
      date,
      vehicle_no: vehicleNo,
      from_location: fromLocation,
      to_location: toLocation,
      consignee,
      material,
      quantity,
      notes: String(data.notes ?? "").trim(),
      created_at: new Date().toISOString(),
    };
    await collection.insertOne(record);
    return res.status(201).json(record);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid challan id." });
    const result = await getDb().collection("challans").deleteOne({ id });
    if (!result.deletedCount) return res.status(404).json({ error: "Challan not found." });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
