import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as XLSX from "xlsx";

export const MASTER_WORKBOOK_NAME = "SLN_Logistics_Master.xlsx";
const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const TEMPLATE_ASSET = require("../assets/Invoice.xlsx");
const SUMMARY_SHEET = "Summary";
const INVOICE_SHEET = "invoice";

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

const uriFor = (name: string) => `${FileSystem.documentDirectory}${name}`;

async function ensureMasterWorkbook(): Promise<string> {
  const destination = uriFor(MASTER_WORKBOOK_NAME);
  const info = await FileSystem.getInfoAsync(destination);
  if (info.exists) return destination;
  const asset = Asset.fromModule(TEMPLATE_ASSET);
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error("Invoice.xlsx template could not be loaded.");
  await FileSystem.copyAsync({ from: asset.localUri, to: destination });
  return destination;
}

async function readWorkbook(uri: string): Promise<XLSX.WorkBook> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return XLSX.read(base64, { type: "base64", cellStyles: true, cellFormula: true });
}

function allValues(workbook: XLSX.WorkBook): string[] {
  return workbook.SheetNames.flatMap((name) => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, raw: false, blankrows: true });
    return rows.flat().map((value) => String(value ?? "").trim()).filter(Boolean);
  });
}

function parseInvoiceDate(value: string): Date {
  const parts = value.split(/[./-]/).map(Number);
  if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
  return new Date(value);
}

function monthlySheetName(workbook: XLSX.WorkBook, dateValue: string): string {
  const date = parseInvoiceDate(dateValue);
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = String(date.getFullYear()).slice(-2);
  const candidates = workbook.SheetNames.filter((name) => /['’]\d{2}$/.test(name));
  const existing = candidates.find((name) => name.toLowerCase().startsWith(month.toLowerCase().slice(0, 3)) && name.endsWith(`'${year}`));
  return existing ?? `${month === "Sep" ? "Sept" : month}'${year}`;
}

function firstEmptyRow(rows: unknown[][]): number {
  let last = rows.length;
  while (last > 0 && rows[last - 1].every((cell) => cell === null || cell === undefined || cell === "")) last -= 1;
  return last;
}

function appendSummaryRow(workbook: XLSX.WorkBook, invoice: MasterInvoice): void {
  const sheet = workbook.Sheets[SUMMARY_SHEET];
  if (!sheet) throw new Error(`Template is missing the ${SUMMARY_SHEET} sheet.`);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, blankrows: true });
  const headerIndex = rows.findIndex((row) => String(row[0] ?? "").trim() === "Bills Submitted to IIL");
  if (headerIndex < 0) throw new Error("Template is missing the Bills Submitted to IIL section.");
  const insertAt = Math.max(headerIndex + 2, firstEmptyRow(rows));
  const month = parseInvoiceDate(invoice.invoiceDate).toLocaleString("en-US", { month: "long" });
  rows.splice(insertAt, 0, [
    invoice.invoiceNo,
    invoice.invoiceDate,
    month,
    invoice.period.split(" to ")[0],
    invoice.period.split(" to ")[1] ?? "",
    invoice.amount,
    invoice.cgst + invoice.sgst,
    `=G${insertAt + 1}+F${insertAt + 1}`,
    "",
    "",
    "",
  ]);
  workbook.Sheets[SUMMARY_SHEET] = XLSX.utils.aoa_to_sheet(rows);
}

function appendInvoicePage(workbook: XLSX.WorkBook, invoice: MasterInvoice): void {
  const sheet = workbook.Sheets[INVOICE_SHEET];
  if (!sheet) throw new Error(`Template is missing the ${INVOICE_SHEET} sheet.`);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, blankrows: true });
  const start = firstEmptyRow(rows) + 3;
  const output: Array<Array<string | number>> = Array.from({ length: 30 }, () => Array(20).fill(""));
  output[1][1] = "SLN logistics";
  output[2][1] = "Office:1-5-1115/506, Flat no.304, Panchasheel Enclave, Old Alwal – 5000010,  GST NO. 36EGSPD7615E1Z8, Mobile:9396673734";
  output[4][1] = "Tax Invoice";
  output[5][1] = "To"; output[5][10] = "Inv. No."; output[5][11] = invoice.invoiceNo;
  output[6][1] = "M/s.Indian Immunologicals Limited"; output[6][10] = "Inv. Dt"; output[6][11] = invoice.invoiceDate;
  output[7][1] = "Rakshapuram, Gachibowli";
  output[8][1] = "Hyderabad, Telangana";
  output[9][1] = "GST No."; output[9][2] = "36AAAC16620F1ZV";
  output[10][1] = "Place of Supply: Telangana";
  output[11][1] = "Bill particulars"; output[11][10] = "Amount"; output[11][11] = "GST"; output[11][12] = "Total Amount";
  output[13][1] = `Transportation service for the period of ${invoice.period}`; output[13][10] = invoice.totalAmount; output[13][11] = 0; output[13][12] = invoice.totalAmount;
  output[15][3] = "as per the particulars attached";
  output[19][8] = "Total "; output[19][10] = invoice.totalAmount; output[19][11] = "-"; output[19][12] = invoice.totalAmount;
  output[21][1] = "Remarks:"; output[21][2] = "The recipient is liable to pay GST under reverse charge mechanism as per notification no.13/2017 – Central Tax ( Rate) dated 28th June 2017";
  output[25][11] = "for SLN Logistics";
  output[28][11] = "Authorised Signatory";
  rows.splice(start, 0, ...output);
  workbook.Sheets[INVOICE_SHEET] = XLSX.utils.aoa_to_sheet(rows);
}

function appendMonthlySheet(workbook: XLSX.WorkBook, invoice: MasterInvoice): void {
  const name = monthlySheetName(workbook, invoice.invoiceDate);
  const existing = workbook.Sheets[name];
  const rows = existing ? XLSX.utils.sheet_to_json<unknown[]>(existing, { header: 1, raw: false, blankrows: true }) : [];
  const start = firstEmptyRow(rows) + (rows.length ? 2 : 0);
  const headers = ["S.No.", "Date", "From Location", "To location", "NO OF BOXES", "Vehicle No", "Gross weight", "Volumetric weight", "Weight in Tons", "Chargeable weight", "Rate", "Hamali", "Total freight", "Hamali members", "Previous rate", "hamali", "Total", "Remarks", "", "", "", "", "Approx"];
  const block: Array<Array<string | number>> = [];
  block.push([`Trip particulars (${invoice.period})`]);
  block.push(headers);
  invoice.trips.forEach((trip, index) => block.push([
    index + 1, trip.date, trip.from, trip.to, "", trip.vehicleNo, "", "", `${trip.weight}MT`, `${trip.weight}MT`, trip.rate, trip.hamali, `=L${start + index + 3}+K${start + index + 3}`, `${trip.hamali / 1200} members@1200`, "", "", "", "", "", "", "", "", "",
  ]));
  const firstDataRow = start + 3;
  const lastDataRow = firstDataRow + invoice.trips.length - 1;
  block.push(["", "", "", "", "", "", "", "", "", "Total", `=SUM(K${firstDataRow}:K${lastDataRow})`, `=SUM(L${firstDataRow}:L${lastDataRow})`, `=SUM(M${firstDataRow}:M${lastDataRow})`]);
  rows.splice(start, 0, ...block);
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = headers.map((_, index) => ({ wch: index === 2 || index === 3 ? 28 : 14 }));
  workbook.Sheets[name] = sheet;
  if (!workbook.SheetNames.includes(name)) workbook.SheetNames.push(name);
}

export async function appendToMasterWorkbook(invoice: MasterInvoice): Promise<{ uri: string; duplicate: boolean }> {
  const uri = await ensureMasterWorkbook();
  const workbook = await readWorkbook(uri);
  if (allValues(workbook).includes(invoice.invoiceNo)) return { uri, duplicate: true };
  appendSummaryRow(workbook, invoice);
  appendInvoicePage(workbook, invoice);
  appendMonthlySheet(workbook, invoice);
  const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx", cellStyles: true });
  const temp = uriFor(`${MASTER_WORKBOOK_NAME}.tmp`);
  await FileSystem.writeAsStringAsync(temp, base64, { encoding: FileSystem.EncodingType.Base64 });
  await FileSystem.moveAsync({ from: temp, to: uri });
  return { uri, duplicate: false };
}

export { MIME_XLSX };
