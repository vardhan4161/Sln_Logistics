import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { useFocusEffect, Link } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as XLSX from "xlsx";

import DatePickerField from "../components/DatePickerField";
import Toast from "../components/Toast";
import { Trip, useDB } from "../contexts/DatabaseContext";
import { useColors } from "../hooks/useColors";

type QuickFilter = "this_month" | "last_month" | "first_half" | "second_half" | "custom";

function parseDMY(str: string): Date {
  const p = str.split("/");
  if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
  return new Date(str);
}
function fmtDot(d: Date) {
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getFullYear()).slice(2)}`;
}
function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0); }
function endOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59); }

const COMPANY = {
  name: "SLN logistics",
  address: "Office:1-5-1115/506, Flat no.304, Panchasheel Enclave, Old Alwal – 5000010",
  gst: "36EGSPD7615E1Z8",
  mobile: "9396673734",
};
const CLIENT = {
  name: "M/s.Indian Immunologicals Limited",
  address1: "Rakshapuram, Gachibowli",
  address2: "Hyderabad, Telangana",
  gst: "36AAAC16620F1ZV",
  place: "Telangana",
  code: "IIL",
};
const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export default function InvoiceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getTrips, getNextInvoiceNo, peekNextInvoiceNo, addInvoice } = useDB();
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<QuickFilter>("this_month");
  const [fromDate, setFromDate] = useState<Date>(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [toDate, setToDate] = useState<Date>(new Date());
  const [manualInvNo, setManualInvNo] = useState("");
  const [invNoLocked, setInvNoLocked] = useState(false); // once user edits manually, stop auto-updating
  const [invDate, setInvDate] = useState<Date>(new Date());
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: "success" | "error" | "info" }>({ visible: false, message: "", type: "success" });

  // Compute the month key for the currently selected period's START date
  const getPeriodMonthKey = useCallback((): string => {
    const now = new Date();
    let d: Date;
    if (filter === "this_month" || filter === "first_half" || filter === "second_half") d = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (filter === "last_month") d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    else d = fromDate;
    return `${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getFullYear())}`;
  }, [filter, fromDate]);

  const peekInvNo = useCallback(async () => {
    const monthKey = getPeriodMonthKey();
    const no = await peekNextInvoiceNo(monthKey);
    setManualInvNo(no);
    setInvNoLocked(false);
  }, [getPeriodMonthKey, peekNextInvoiceNo]);

  useFocusEffect(useCallback(() => { setAllTrips(getTrips()); peekInvNo(); }, [getTrips, peekInvNo]));
  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => setToast({ visible: true, message: msg, type });

  const getRange = useCallback((): [Date, Date] => {
    const now = new Date();
    if (filter === "this_month") return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0)];
    if (filter === "last_month") return [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0)];
    if (filter === "first_half") return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth(), 15)];
    if (filter === "second_half") return [new Date(now.getFullYear(), now.getMonth(), 16), new Date(now.getFullYear(), now.getMonth() + 1, 0)];
    return [startOfDay(fromDate), endOfDay(toDate)];
  }, [filter, fromDate, toDate]);

  const filteredTrips = useCallback((): Trip[] => {
    const [start, end] = getRange();
    return allTrips.filter((t) => { const d = parseDMY(t.trip_date); return d >= start && d <= end; })
      .sort((a, b) => parseDMY(a.trip_date).getTime() - parseDMY(b.trip_date).getTime());
  }, [allTrips, getRange]);

  const trips = filteredTrips();
  const amount = trips.reduce((s, t) => s + t.total_freight, 0);
  const cgst = Math.round(amount * 0.09);
  const sgst = Math.round(amount * 0.09);
  const totalAmt = amount + cgst + sgst;
  const [start, end] = getRange();

  const handleGenerate = useCallback(async () => {
    const [freshStart, freshEnd] = getRange();
    const freshTrips = allTrips
      .filter((t) => { const d = parseDMY(t.trip_date); return d >= freshStart && d <= freshEnd; })
      .sort((a, b) => parseDMY(a.trip_date).getTime() - parseDMY(b.trip_date).getTime());

    if (freshTrips.length === 0) { showToast("No trips in this date range.", "error"); return; }

    const freshAmount = freshTrips.reduce((s, t) => s + t.total_freight, 0);
    const freshCgst = Math.round(freshAmount * 0.09);
    const freshSgst = Math.round(freshAmount * 0.09);
    const freshTotal = freshAmount + freshCgst + freshSgst;

    setGenerating(true);
    try {
      // Consume the next invoice number (increments DB counter) only now at generation time
      const monthKey = `${String(freshStart.getMonth() + 1).padStart(2, "0")}${String(freshStart.getFullYear())}`;
      const invNo = manualInvNo.trim() && !manualInvNo.endsWith("/") ? manualInvNo.trim() : await getNextInvoiceNo(monthKey);
      const period = `${fmtDot(freshStart)} to ${fmtDot(freshEnd)}`;

      const buildHtml = (): string => {
        const tripRows = freshTrips.map(t => `
          <tr>
            <td class="center">${t.serial_no}</td>
            <td class="center">${t.trip_date}</td>
            <td class="center">${t.vehicle_no}</td>
            <td>${t.from_location} to ${t.to_location}</td>
            <td class="center">${t.chargeable_weight} MT</td>
            <td class="right">${t.rate.toLocaleString("en-IN")}</td>
            <td class="right">${t.hamali.toLocaleString("en-IN")}</td>
            <td class="right">${t.total_freight.toLocaleString("en-IN")}</td>
          </tr>
        `).join("");

        return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
        <style>
          body{font-family:Arial,sans-serif;font-size:10px;margin:0;padding:20px;color:#000;}
          table{width:100%;border-collapse:collapse;margin-bottom:20px;}
          td,th{border:1px solid #000;padding:4px 6px;}
          .center{text-align:center;} .bold{font-weight:bold;} .right{text-align:right;}
          .title{font-size:16px;font-weight:bold;text-align:center;}
          .sub{font-size:9px;text-align:center;}
          .noborder td{border:none;padding:2px 0;}
          .section-header{text-align:center;font-weight:bold;background:#f2f2f2;font-size:11px;padding:6px;}
          .particulars-table th{background:#f9f9f9;}
          .page-break{page-break-before:always;}
        </style></head><body>
        <!-- Summary Page -->
        <table><tr><td colspan="4" class="title">${COMPANY.name}</td></tr>
        <tr><td colspan="4" class="sub bold">${COMPANY.address},&nbsp;&nbsp;GST NO. ${COMPANY.gst},&nbsp;&nbsp;Mobile:${COMPANY.mobile}</td></tr>
        <tr><td colspan="4" class="section-header">TAX INVOICE</td></tr>
        <tr>
          <td colspan="2" style="vertical-align:top;width:60%;">
            <b>To</b><br/>${CLIENT.name}<br/>${CLIENT.address1}<br/>${CLIENT.address2}<br/>
            GST No.&nbsp;&nbsp;&nbsp;&nbsp;${CLIENT.gst}<br/>Place of Supply: ${CLIENT.place}
          </td>
          <td colspan="2" style="vertical-align:top;">
            <table class="noborder"><tr><td>Inv. No.</td><td><b>${invNo}</b></td></tr>
            <tr><td>Inv. Dt</td><td>${fmtDot(invDate)}</td></tr></table>
          </td>
        </tr>
        <tr><th>Bill particulars</th><th class="right">Amount</th><th class="right">Total Amount</th></tr>
        <tr style="height:120px;">
          <td style="vertical-align:top;padding:15px 10px;">Transportation service for the period of <b>${period}</b><br/><br/><i>as per the particulars attached</i></td>
          <td class="right bold" style="vertical-align:top;padding-top:15px;">${freshAmount.toLocaleString("en-IN")}</td>
          <td class="right bold" style="vertical-align:top;padding-top:15px;">${freshAmount.toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td class="right bold">Add: CGST @ 9%</td>
          <td class="right bold"></td>
          <td class="right bold">${freshCgst.toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td class="right bold">Add: SGST @ 9%</td>
          <td class="right bold"></td>
          <td class="right bold">${freshSgst.toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td class="right bold">Grand Total</td>
          <td class="right bold"></td>
          <td class="right bold">${freshTotal.toLocaleString("en-IN")}</td>
        </tr>
        <tr><td colspan="4" style="height:80px;text-align:right;padding:10px 20px;vertical-align:bottom;">
          <b>for SLN Logistics</b><br/><br/><br/>Authorised Signatory
        </td></tr>
        </table>

        <!-- Particulars Page -->
        <div class="page-break"></div>
        <div class="title" style="margin-bottom:10px;">Trip Particulars Annexure</div>
        <div class="center bold" style="margin-bottom:15px;">Period: ${period} | Invoice No: ${invNo}</div>
        <table class="particulars-table">
          <tr><th>S.No</th><th>Date</th><th>Vehicle</th><th>Route</th><th>Weight</th><th>Rate</th><th>Hamali</th><th>Total</th></tr>
          ${tripRows}
          <tr><td colspan="5" class="right bold">Grand Total (${freshTrips.length} trips)</td><td class="right bold" colspan="3">₹ ${freshAmount.toLocaleString("en-IN")}</td></tr>
        </table>
        </body></html>`;
      };

      const buildXlsx = () => {
        const wb = XLSX.utils.book_new();
        // Summary Sheet
        const summaryRows: any[][] = [
          [COMPANY.name, "", ""],
          [`${COMPANY.address}  GST NO. ${COMPANY.gst}  Mobile: ${COMPANY.mobile}`, "", ""],
          ["TAX INVOICE", "", ""],
          ["To", "Inv. No.", invNo],
          [CLIENT.name, "Inv. Dt", fmtDot(invDate)],
          [CLIENT.address1, "", ""],
          [CLIENT.address2, "", ""],
          [`GST No.  ${CLIENT.gst}`, "", ""],
          [`Place of Supply: ${CLIENT.place}`, "", ""],
          ["Bill particulars", "Amount", "Total Amount"],
          [`Transportation service for the period of ${period}\nas per the particulars attached`, freshAmount, freshAmount],
          ["Add: CGST @ 9%", "", freshCgst],
          ["Add: SGST @ 9%", "", freshSgst],
          ["Grand Total", "", freshTotal],
          ["", "", ""],
          ["", "for SLN Logistics", ""],
          ["", "Authorised Signatory", ""],
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
        wsSummary["!cols"] = [{ wch: 50 }, { wch: 14 }, { wch: 16 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, "Invoice Summary");

        // Particulars Sheet
        const partHeaders = ["S.No", "Date", "Vehicle No", "From Location", "To Location", "Weight (MT)", "Rate", "Hamali", "Total"];
        const partData = freshTrips.map(t => [t.serial_no, t.trip_date, t.vehicle_no, t.from_location, t.to_location, t.chargeable_weight, t.rate, t.hamali, t.total_freight]);
        const wsPart = XLSX.utils.aoa_to_sheet([partHeaders, ...partData]);
        wsPart["!cols"] = [{ wch: 6 }, { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsPart, "Trip Particulars");

        return wb;
      };

      if (Platform.OS === "web") {
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(buildHtml());
          w.document.close();
          setTimeout(() => { w.print(); }, 500);
        }
        showToast("Invoice opened for printing!", "success");
        return;
      }

      // PDF
      const { uri: pdfUri } = await Print.printToFileAsync({ html: buildHtml() });
      const pdfDest = `${FileSystem.cacheDirectory}${invNo.replace(/\//g, "-")}.pdf`;
      await FileSystem.moveAsync({ from: pdfUri, to: pdfDest });

      // Excel
      const b64 = XLSX.write(buildXlsx(), { type: "base64", bookType: "xlsx" });
      const xlsxDest = `${FileSystem.cacheDirectory}${invNo.replace(/\//g, "-")}.xlsx`;
      await FileSystem.writeAsStringAsync(xlsxDest, b64, { encoding: FileSystem.EncodingType.Base64 });

      // Read PDF as base64 for saving
      const pdfB64 = await FileSystem.readAsStringAsync(pdfDest, { encoding: FileSystem.EncodingType.Base64 });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Invoice ${invNo} created with ${freshTrips.length} trips!`, "success");

      // Save to database
      addInvoice({
        invoice_no: invNo,
        invoice_date: fmtDot(invDate),
        period: period,
        amount: freshAmount,
        cgst: freshCgst,
        sgst: freshSgst,
        total_amount: freshTotal,
        trip_count: freshTrips.length,
        pdf_base64: pdfB64,
        excel_base64: b64,
      });

      // Reset the input to the NEXT unused number after successful generation
      const nextMonthKey = `${String(freshStart.getMonth() + 1).padStart(2, "0")}${String(freshStart.getFullYear())}`;
      const nextNo = await peekNextInvoiceNo(nextMonthKey);
      setManualInvNo(nextNo);
      setInvNoLocked(false);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfDest, { mimeType: "application/pdf", dialogTitle: `Share Invoice ${invNo} (PDF)` });
        setTimeout(async () => {
          try { await Sharing.shareAsync(xlsxDest, { mimeType: MIME_XLSX, dialogTitle: `Share Invoice ${invNo} (Excel)` }); } catch {}
        }, 800);
      }
    } catch (e: any) {
      showToast(`Error: ${e?.message ?? "Unknown error"}`, "error");
    } finally {
      setGenerating(false);
    }
  }, [allTrips, manualInvNo, getRange, invDate]);

  const handleFilterChange = (newFilter: QuickFilter) => {
    setFilter(newFilter);
    // Re-peek the invoice number based on the new period's month (only if not manually locked)
    setInvNoLocked(false);
    setTimeout(() => peekInvNo(), 50);
  };

  const quickBtns: { key: QuickFilter; label: string }[] = [
    { key: "this_month", label: "This Month" },
    { key: "last_month", label: "Last Month" },
    { key: "first_half", label: "1st–15th" },
    { key: "second_half", label: "16th–End" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 32 }]}
      keyboardShouldPersistTaps="handled">
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast(p => ({ ...p, visible: false }))} />

      {/* Stats */}
      <View style={[styles.statsCard, { backgroundColor: colors.primary }]}>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{trips.length}</Text><Text style={styles.statLbl}>Trips</Text>
        </View>
        <View style={[styles.statDiv, { backgroundColor: "rgba(255,255,255,0.3)" }]} />
        <View style={styles.statItem}>
          <Text style={styles.statVal}>₹{amount.toLocaleString("en-IN")}</Text><Text style={styles.statLbl}>Amount</Text>
        </View>
        <View style={[styles.statDiv, { backgroundColor: "rgba(255,255,255,0.3)" }]} />
        <View style={styles.statItem}>
          <Text style={styles.statVal}>₹{totalAmt.toLocaleString("en-IN")}</Text><Text style={styles.statLbl}>Total</Text>
        </View>
      </View>

      <Link href="/past-invoices" asChild>
        <TouchableOpacity style={[styles.pastBtn, { backgroundColor: colors.secondary }]} activeOpacity={0.8}>
          <Feather name="file-text" size={16} color={colors.primary} />
          <Text style={[styles.pastBtnTxt, { color: colors.primary }]}>View Past Invoices</Text>
          <View style={{ flex: 1 }} />
          <Feather name="chevron-right" size={16} color={colors.primary} />
        </TouchableOpacity>
      </Link>

      {/* Date Filter */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sec, { color: colors.foreground }]}><Feather name="filter" size={14} color={colors.primary} />{"  "}Billing Period</Text>
        <View style={styles.row}>
          {quickBtns.map(b => (
            <TouchableOpacity key={b.key} style={[styles.qBtn, { backgroundColor: filter === b.key ? colors.primary : colors.background, borderColor: filter === b.key ? colors.primary : colors.border }]}
          onPress={() => handleFilterChange(b.key)} activeOpacity={0.75}>
              <Text style={[styles.qBtnTxt, { color: filter === b.key ? "#FFF" : colors.mutedForeground }]} numberOfLines={1}>{b.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {filter === "custom" && (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lbl, { color: colors.mutedForeground }]}>From</Text>
              <DatePickerField date={fromDate} onChange={(d) => { setFromDate(d); loadDefaultInvNo(); }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lbl, { color: colors.mutedForeground }]}>To</Text>
              <DatePickerField date={toDate} onChange={setToDate} />
            </View>
          </View>
        )}
      </View>

      {/* Settings */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sec, { color: colors.foreground }]}><Feather name="settings" size={14} color={colors.primary} />{"  "}Invoice Details</Text>

        <View style={{ gap: 16 }}>
          <View>
            <Text style={[styles.lbl, { color: colors.mutedForeground }]}>Invoice Date</Text>
            <DatePickerField date={invDate} onChange={setInvDate} />
          </View>
          <View>
            <Text style={[styles.lbl, { color: colors.mutedForeground }]}>Invoice Number (Editable)</Text>
              <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              value={manualInvNo}
              onChangeText={(t) => { setManualInvNo(t); setInvNoLocked(true); }}
              placeholder="e.g. IIL/06/2026/001"
              placeholderTextColor={colors.mutedForeground}
            />
            {invNoLocked && (
              <TouchableOpacity onPress={peekInvNo} style={{ position: "absolute", right: 12, top: 38 }}>
                <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: generating ? colors.mutedForeground : colors.primary, opacity: generating ? 0.7 : 1 }]}
        onPress={handleGenerate} disabled={generating} activeOpacity={0.8}
      >
        {generating ? <ActivityIndicator color="#FFF" /> : <Feather name="file-text" size={18} color="#FFF" />}
        <Text style={styles.genBtnTxt}>{generating ? "Generating..." : "Generate Invoice"}</Text>
      </TouchableOpacity>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        This will generate a PDF invoice and Excel annexure for sharing.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, gap: 16 },
  statsCard: { flexDirection: "row", borderRadius: 16, padding: 16 },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statVal: { color: "#FFF", fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statLbl: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Inter_400Regular" },
  statDiv: { width: 1, marginHorizontal: 8 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  sec: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  qBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  qBtnTxt: { fontSize: 12, fontFamily: "Inter_500Medium" },
  lbl: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 14 },
  genBtnTxt: { color: "#FFF", fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  pastBtn: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 12, gap: 10 },
  pastBtnTxt: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
});
