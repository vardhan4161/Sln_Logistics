import * as FileSystem from "expo-file-system/legacy";
import * as XLSX from "xlsx";

export const MASTER_WORKBOOK_NAME = "SLN_Logistics_Master.xlsx";
const LEDGER_NAME = "SLN_Logistics_Master.ledger.json";
const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type MasterTrip = {
  date: string;
  vehicleNo: string;
  from: string;
  to: string;
  weight: number;
  rate: number;
  hamali: number;
  total: number;
};

export type MasterInvoice = {
  invoiceNo: string;
  invoiceDate: string;
  period: string;
  amount: number;
  cgst: number;
  sgst: number;
  totalAmount: number;
  trips: MasterTrip[];
};

type MasterLedger = {
  version: 1;
  invoices: MasterInvoice[];
};

const root = () => FileSystem.documentDirectory;
const uriFor = (name: string) => `${root()}${name}`;

async function readLedger(): Promise<MasterLedger> {
  const uri = uriFor(LEDGER_NAME);
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) return { version: 1, invoices: [] };
  try {
    const raw = await FileSystem.readAsStringAsync(uri);
    const parsed = JSON.parse(raw) as Partial<MasterLedger>;
    return { version: 1, invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [] };
  } catch (error) {
    throw new Error(`Master ledger cannot be read safely: ${String(error)}`);
  }
}

async function writeLedger(ledger: MasterLedger): Promise<void> {
  const temp = uriFor(`${LEDGER_NAME}.tmp`);
  await FileSystem.writeAsStringAsync(temp, JSON.stringify(ledger));
  await FileSystem.moveAsync({ from: temp, to: uriFor(LEDGER_NAME) });
}

function buildWorkbook(ledger: MasterLedger): XLSX.WorkBook {
  const register = [
    ["Invoice No", "Invoice Date", "Period", "Amount", "CGST", "SGST", "Grand Total", "Trip Count"],
    ...ledger.invoices.map((invoice) => [
      invoice.invoiceNo,
      invoice.invoiceDate,
      invoice.period,
      invoice.amount,
      invoice.cgst,
      invoice.sgst,
      invoice.totalAmount,
      invoice.trips.length,
    ]),
  ];
  const particulars: Array<Array<string | number>> = [[
    "Invoice No", "Line No", "Date", "Vehicle No", "From Location", "To Location",
    "Weight (MT)", "Rate", "Hamali", "Total Freight",
  ]];
  for (const invoice of ledger.invoices) {
    invoice.trips.forEach((trip, index) => particulars.push([
      invoice.invoiceNo,
      index + 1,
      trip.date,
      trip.vehicleNo,
      trip.from,
      trip.to,
      trip.weight,
      trip.rate,
      trip.hamali,
      trip.total,
    ]));
  }
  const workbook = XLSX.utils.book_new();
  const registerSheet = XLSX.utils.aoa_to_sheet(register);
  registerSheet["!cols"] = [
    { wch: 18 }, { wch: 14 }, { wch: 26 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 12 },
  ];
  const particularsSheet = XLSX.utils.aoa_to_sheet(particulars);
  particularsSheet["!cols"] = [
    { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 15 }, { wch: 24 },
    { wch: 24 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(workbook, registerSheet, "Invoice Register");
  XLSX.utils.book_append_sheet(workbook, particularsSheet, "Trip Particulars");
  return workbook;
}

/**
 * Adds one invoice to the app-owned persistent master workbook.
 * The JSON ledger is the durable index: every append scans all known invoice
 * numbers before writing, so retries cannot create a duplicate invoice.
 */
export async function appendToMasterWorkbook(invoice: MasterInvoice): Promise<{ uri: string; duplicate: boolean }> {
  const ledger = await readLedger();
  if (ledger.invoices.some((item) => item.invoiceNo === invoice.invoiceNo)) {
    return { uri: uriFor(MASTER_WORKBOOK_NAME), duplicate: true };
  }
  ledger.invoices.push(invoice);
  const workbook = buildWorkbook(ledger);
  const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
  const tempWorkbook = uriFor(`${MASTER_WORKBOOK_NAME}.tmp`);
  await FileSystem.writeAsStringAsync(tempWorkbook, base64, { encoding: FileSystem.EncodingType.Base64 });
  await writeLedger(ledger);
  await FileSystem.moveAsync({ from: tempWorkbook, to: uriFor(MASTER_WORKBOOK_NAME) });
  return { uri: uriFor(MASTER_WORKBOOK_NAME), duplicate: false };
}

export async function getMasterWorkbookUri(): Promise<string> {
  const uri = uriFor(MASTER_WORKBOOK_NAME);
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) throw new Error("The master workbook has not been created yet.");
  return uri;
}

export { MIME_XLSX };
