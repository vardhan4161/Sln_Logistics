import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as XLSX from "xlsx";

import DatePickerField from "@/components/DatePickerField";
import Toast from "@/components/Toast";
import { Trip, useDB } from "@/contexts/DatabaseContext";
import { useColors } from "@/hooks/useColors";

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
const REMARKS = "The recipient is liable to pay GST under reverse charge mechanism as per notification no.13/2017 – Central Tax ( Rate) dated 28th June 2017";
const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export default function InvoiceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getTrips, getNextInvoiceNo } = useDB();
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<QuickFilter>("this_month");
  const [fromDate, setFromDate] = useState<Date>(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [toDate, setToDate] = useState<Date>(new Date());
  const [gstPct, setGstPct] = useState("0");
  const [invDate, setInvDate] = useState<Date>(new Date());
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: "success" | "error" | "info" }>({ visible: false, message: "", type: "success" });

  useFocusEffect(useCallback(() => { setAllTrips(getTrips()); }, [getTrips]));
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
  const gstAmt = Math.round(amount * (parseFloat(gstPct) || 0) / 100);
  const totalAmt = amount + gstAmt;
  const [start, end] = getRange();

  const buildInvoiceHtml = (invNo: string): string => {
    const period = `${fmtDot(start)} to ${fmtDot(end)}`;
    const gstDisplay = `${gstPct || "0"}%`;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;margin:0;padding:20px;color:#000;}
      table{width:100%;border-collapse:collapse;}
      td,th{border:1px solid #000;padding:6px 8px;}
      .center{text-align:center;} .bold{font-weight:bold;} .right{text-align:right;}
      .title{font-size:18px;font-weight:bold;text-align:center;}
      .sub{font-size:10px;text-align:center;}
      .noborder td{border:none;}
      .section-header{text-align:center;font-weight:bold;background:#f9f9f9;}
    </style></head><body>
    <table><tr><td colspan="4" class="title">${COMPANY.name}</td></tr>
    <tr><td colspan="4" class="sub bold">${COMPANY.address},&nbsp;&nbsp;GST NO. ${COMPANY.gst},&nbsp;&nbsp;Mobile:${COMPANY.mobile}</td></tr>
    <tr><td colspan="4" class="section-header">Tax Invoice</td></tr>
    <tr>
      <td colspan="2" style="vertical-align:top;width:55%;">
        <b>To</b><br/>
        ${CLIENT.name}<br/>
        ${CLIENT.address1}<br/>
        ${CLIENT.address2}<br/>
        GST No.&nbsp;&nbsp;&nbsp;&nbsp;${CLIENT.gst}<br/>
        Place of Supply: ${CLIENT.place}
      </td>
      <td colspan="2" style="vertical-align:top;">
        <table class="noborder"><tr><td>Inv. No.</td><td><b>${invNo}</b></td></tr>
        <tr><td>Inv. Dt</td><td>${fmtDot(invDate)}</td></tr></table>
      </td>
    </tr>
    <tr><th>Bill particulars</th><th class="right">Amount</th><th class="center">GST</th><th class="right">Total Amount</th></tr>
    <tr>
      <td style="padding:16px 8px;">
        Transportation service for the period of <b>${period}</b><br/><br/>
        <i>as per the particulars attached</i>
      </td>
      <td class="right bold">${amount.toLocaleString("en-IN")}</td>
      <td class="center">${gstDisplay}</td>
      <td class="right bold">${totalAmt.toLocaleString("en-IN")}</td>
    </tr>
    <tr>
      <td class="right bold">Total</td>
      <td class="right bold">${amount.toLocaleString("en-IN")}</td>
      <td class="center">${gstAmt > 0 ? gstAmt.toLocaleString("en-IN") : "-"}</td>
      <td class="right bold">${totalAmt.toLocaleString("en-IN")}</td>
    </tr>
    <tr><td colspan="4" style="padding:10px 8px;"><b>Remarks:</b>&nbsp;${REMARKS}</td></tr>
    <tr><td colspan="4" style="height:60px;text-align:right;padding:10px 20px;vertical-align:bottom;">
      <b>for SLN Logistics</b><br/><br/><br/>Authorised Signatory
    </td></tr>
    </table></body></html>`;
  };

  const buildInvoiceXlsx = (invNo: string) => {
    const wb = XLSX.utils.book_new();
    const period = `${fmtDot(start)} to ${fmtDot(end)}`;
    const gstDisplay = `${gstPct || "0"}%`;
    const rows: any[][] = [
      [COMPANY.name, "", "", ""],
      [`${COMPANY.address}  GST NO. ${COMPANY.gst}  Mobile: ${COMPANY.mobile}`, "", "", ""],
      ["Tax Invoice", "", "", ""],
      ["To", "", "Inv. No.", invNo],
      [CLIENT.name, "", "Inv. Dt", fmtDot(invDate)],
      [CLIENT.address1, "", "", ""],
      [CLIENT.address2, "", "", ""],
      [`GST No.  ${CLIENT.gst}`, "", "", ""],
      [`Place of Supply: ${CLIENT.place}`, "", "", ""],
      ["Bill particulars", "Amount", "GST", "Total Amount"],
      [`Transportation service for the period of ${period}\nas per the particulars attached`, amount, gstDisplay, totalAmt],
      ["Total", amount, gstAmt > 0 ? gstAmt : "-", totalAmt],
      ["", "", "", ""],
      [`Remarks: ${REMARKS}`, "", "", ""],
      ["", "", "", ""],
      ["", "", "for SLN Logistics", ""],
      ["", "", "Authorised Signatory", ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 50 }, { wch: 14 }, { wch: 10 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, "Invoice");
    return wb;
  };

  const handleGenerate = useCallback(async () => {
    if (trips.length === 0) { showToast("No trips in this date range.", "error"); return; }
    setGenerating(true);
    try {
      const mm = String(start.getMonth() + 1).padStart(2, "0");
      const yyyy = String(start.getFullYear());
      const monthKey = `${mm}${yyyy}`;
      const invNo = getNextInvoiceNo(monthKey);

      if (Platform.OS === "web") {
        const html = buildInvoiceHtml(invNo);
        const w = window.open("", "_blank");
        w?.document.write(html); w?.document.close(); w?.print();
        showToast("Invoice opened for printing!", "success");
        return;
      }

      // PDF
      const { uri: pdfUri } = await Print.printToFileAsync({ html: buildInvoiceHtml(invNo) });
      const pdfDest = `${FileSystem.cacheDirectory}${invNo.replace(/\//g, "-")}.pdf`;
      await FileSystem.moveAsync({ from: pdfUri, to: pdfDest });

      // Excel
      const wb = buildInvoiceXlsx(invNo);
      const b64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const xlsxDest = `${FileSystem.cacheDirectory}${invNo.replace(/\//g, "-")}.xlsx`;
      await FileSystem.writeAsStringAsync(xlsxDest, b64, { encoding: FileSystem.EncodingType.Base64 });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Invoice ${invNo} created! Choose PDF or Excel to share.`, "success");

      // Share PDF first, then Excel
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfDest, { mimeType: "application/pdf", dialogTitle: `Share Invoice ${invNo} (PDF)` });
        setTimeout(async () => {
          try { await Sharing.shareAsync(xlsxDest, { mimeType: MIME_XLSX, dialogTitle: `Share Invoice ${invNo} (Excel)` }); } catch {}
        }, 500);
      }
    } catch (e: any) {
      showToast(`Error: ${e?.message ?? "Unknown error"}`, "error");
    } finally {
      setGenerating(false);
    }
  }, [trips, gstPct, start, end, invDate, getNextInvoiceNo]);

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

      {/* Date Filter */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sec, { color: colors.foreground }]}><Feather name="filter" size={14} color={colors.primary} />{"  "}Billing Period</Text>
        <View style={styles.row}>
          {quickBtns.map(b => (
            <TouchableOpacity key={b.key} style={[styles.qBtn, { backgroundColor: filter === b.key ? colors.primary : colors.background, borderColor: filter === b.key ? colors.primary : colors.border }]}
              onPress={() => setFilter(b.key)} activeOpacity={0.75}>
              <Text style={[styles.qBtnTxt, { color: filter === b.key ? "#FFF" : colors.mutedForeground }]} numberOfLines={1}>{b.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {filter === "custom" && (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lbl, { color: colors.mutedForeground }]}>From</Text>
              <DatePickerField date={fromDate} onChange={setFromDate} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lbl, { color: colors.mutedForeground }]}>To</Text>
              <DatePickerField date={toDate} onChange={setToDate} />
            </View>
          </View>
        )}
      </View>

      {/* Invoice Details */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sec, { color: colors.foreground }]}><Feather name="file-text" size={14} color={colors.primary} />{"  "}Invoice Details</Text>
        <Text style={[styles.lbl, { color: colors.mutedForeground }]}>Invoice Date</Text>
        <DatePickerField date={invDate} onChange={setInvDate} />
        <Text style={[styles.lbl, { color: colors.mutedForeground }]}>GST % (enter 0 for reverse charge)</Text>
        <TextInput style={[styles.inp, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          value={gstPct} onChangeText={setGstPct} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.mutedForeground} />
        <View style={[styles.summary, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "25" }]}>
          <View style={styles.summaryRow}><Text style={[styles.summaryLbl, { color: colors.mutedForeground }]}>Amount</Text><Text style={[styles.summaryVal, { color: colors.foreground }]}>₹{amount.toLocaleString("en-IN")}</Text></View>
          <View style={styles.summaryRow}><Text style={[styles.summaryLbl, { color: colors.mutedForeground }]}>GST ({gstPct || "0"}%)</Text><Text style={[styles.summaryVal, { color: colors.foreground }]}>₹{gstAmt.toLocaleString("en-IN")}</Text></View>
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 }]}>
            <Text style={[styles.summaryLbl, { color: colors.foreground, fontFamily: "Inter_700Bold", fontWeight: "700" }]}>Total Amount</Text>
            <Text style={[styles.summaryVal, { color: colors.primary, fontSize: 18, fontFamily: "Inter_700Bold", fontWeight: "700" }]}>₹{totalAmt.toLocaleString("en-IN")}</Text>
          </View>
        </View>
      </View>

      {/* Client preview */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sec, { color: colors.foreground }]}><Feather name="user" size={14} color={colors.primary} />{"  "}Client Details (Fixed)</Text>
        <Text style={[styles.clientLine, { color: colors.foreground }]}>{CLIENT.name}</Text>
        <Text style={[styles.clientLine, { color: colors.mutedForeground }]}>{CLIENT.address1}, {CLIENT.address2}</Text>
        <Text style={[styles.clientLine, { color: colors.mutedForeground }]}>GST: {CLIENT.gst}</Text>
      </View>

      {trips.length === 0 && (
        <View style={[styles.empty, { borderColor: colors.border }]}>
          <Feather name="alert-circle" size={16} color={colors.mutedForeground} />
          <Text style={[styles.emptyTxt, { color: colors.mutedForeground }]}>No trips in this period. Change the date filter.</Text>
        </View>
      )}

      <TouchableOpacity style={[styles.btn, { backgroundColor: trips.length === 0 ? "#999" : "#1565C0", opacity: generating ? 0.7 : 1 }]}
        onPress={handleGenerate} disabled={generating || trips.length === 0} activeOpacity={0.85}>
        {generating ? <ActivityIndicator color="#FFF" /> : <Feather name="file-text" size={22} color="#FFF" />}
        <Text style={styles.btnTxt}>{generating ? "Generating…" : `Generate Invoice (${trips.length} trips)`}</Text>
      </TouchableOpacity>

      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Generates both PDF + Excel. Invoice number auto-increments monthly (IIL/MM/YYYY/NNN).
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  statsCard: { flexDirection: "row", borderRadius: 16, padding: 22 },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statVal: { color: "#FFF", fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statLbl: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: "Inter_400Regular" },
  statDiv: { width: 1, marginHorizontal: 8 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  sec: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  qBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  qBtnTxt: { fontSize: 12, fontFamily: "Inter_500Medium", fontWeight: "500" },
  lbl: { fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" },
  inp: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  summary: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLbl: { fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" },
  summaryVal: { fontSize: 15, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
  clientLine: { fontSize: 13, fontFamily: "Inter_400Regular" },
  empty: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderStyle: "dashed" },
  emptyTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 14 },
  btnTxt: { color: "#FFF", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
});
