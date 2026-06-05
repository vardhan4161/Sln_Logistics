import { Router } from "express";
import { getDb } from "../lib/mongo.js";

const router = Router();

// GET /invoices/next?monthKey=MMYYYY  — PEEK only, does NOT increment counter
// Used for pre-filling the invoice number input field
router.get("/next", async (req, res, next) => {
  try {
    const monthKey = String(req.query.monthKey || "").trim();
    if (!monthKey.match(/^\d{6}$/)) {
      return res.status(400).json({ error: "monthKey must be in MMYYYY format." });
    }
    const doc = await getDb().collection("invoice_sequences").findOne({ month_key: monthKey });
    const nextSeq = (doc?.last_seq ?? 0) + 1;
    const invoiceNo = `IIL/${monthKey.slice(0, 2)}/${monthKey.slice(2)}/${String(nextSeq).padStart(3, "0")}`;
    return res.json({ invoice_number: invoiceNo, monthKey, sequence: nextSeq });
  } catch (error) {
    return next(error);
  }
});

// POST /invoices/next — CONSUMES next number (increments counter). Called only at actual generation.
router.post("/next", async (req, res, next) => {
  try {
    const monthKey = String(req.body.monthKey || "").trim();
    if (!monthKey.match(/^\d{6}$/)) {
      return res.status(400).json({ error: "monthKey must be in MMYYYY format." });
    }
    const result = await getDb().collection("invoice_sequences").findOneAndUpdate(
      { month_key: monthKey },
      { $inc: { last_seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );
    if (!result) {
      return res.status(500).json({ error: "Unable to generate invoice number." });
    }
    const sequence = result.last_seq;
    const invoiceNo = `IIL/${monthKey.slice(0, 2)}/${monthKey.slice(2)}/${String(sequence).padStart(3, "0")}`;
    return res.json({ invoice_number: invoiceNo, monthKey, sequence });
  } catch (error) {
    return next(error);
  }
});

// GET /invoices — list all saved invoices
router.get("/", async (req, res, next) => {
  try {
    const invoices = await getDb().collection("invoices").find({}).sort({ created_at: -1 }).toArray();
    return res.json(invoices);
  } catch (error) {
    return next(error);
  }
});

// POST /invoices — save a generated invoice
router.post("/", async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.id || !data.invoice_no) {
      return res.status(400).json({ error: "Invalid invoice data" });
    }
    await getDb().collection("invoices").updateOne(
      { id: data.id },
      { $set: data },
      { upsert: true }
    );
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

// DELETE /invoices/:id — delete an invoice
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await getDb().collection("invoices").deleteOne({ id });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
