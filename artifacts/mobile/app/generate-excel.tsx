import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as XLSX from "xlsx";

import DatePickerField from "@/components/DatePickerField";
import Toast from "@/components/Toast";
import { Trip, useDB } from "@/contexts/DatabaseContext";
import { useColors } from "@/hooks/useColors";

type QuickFilter = "all" | "this_month" | "last_month" | "custom";

function parseTripDate(dateStr: string): Date {
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    return new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
  }
  return new Date(dateStr);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function monthLabel(d: Date): string {
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}

const MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export default function GenerateExcelScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getTrips } = useDB();
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [generating, setGenerating] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [fromDate, setFromDate] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [toDate, setToDate] = useState<Date>(new Date());
  const [toast, setToast] = useState<{
    visible: boolean; message: string; type: "success" | "error" | "info";
  }>({ visible: false, message: "", type: "success" });

  useFocusEffect(useCallback(() => { setAllTrips(getTrips()); }, [getTrips]));

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") =>
      setToast({ visible: true, message, type }),
    []
  );
  const hideToast = useCallback(() => setToast((p) => ({ ...p, visible: false })), []);

  const filteredTrips = useCallback((): Trip[] => {
    if (quickFilter === "all") return allTrips;
    let start: Date, end: Date;
    if (quickFilter === "this_month") {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (quickFilter === "last_month") {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      start = startOfDay(fromDate);
      end = endOfDay(toDate);
    }
    return allTrips.filter((t) => {
      const d = parseTripDate(t.trip_date);
      return d >= start && d <= end;
    });
  }, [allTrips, quickFilter, fromDate, toDate]);

  const trips = filteredTrips();

  const buildWorkbook = useCallback((tripList: Trip[]) => {
    // Sort oldest → newest so Excel rows go chronologically
    const sorted = [...tripList].sort((a, b) => {
      const toMs = (dateStr: string) => {
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          const [dd, mm, yyyy] = parts;
          return new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10)).getTime();
        }
        return new Date(dateStr).getTime();
      };
      return toMs(a.trip_date) - toMs(b.trip_date);
    });

    const wb = XLSX.utils.book_new();
    const headers = [
      "S.No.", "Date", "From Location", "To Location", "Vehicle No",
      "Chargeable Weight (MT)", "Rate", "Hamali", "Total Freight",
    ];
    const rows = sorted.map((t, i) => [
      i + 1, t.trip_date, t.from_location, t.to_location, t.vehicle_no,
      t.chargeable_weight, t.rate, t.hamali, t.total_freight,
    ]);
    const totalRow = [
      "TOTAL", "", "", "", "",
      sorted.reduce((s, t) => s + t.chargeable_weight, 0),
      "",
      sorted.reduce((s, t) => s + t.hamali, 0),
      sorted.reduce((s, t) => s + t.total_freight, 0),
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows, totalRow]);
    ws["!cols"] = [
      { wch: 7 }, { wch: 12 }, { wch: 26 }, { wch: 26 }, { wch: 14 },
      { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "SLN Logistics Trips");
    return wb;
  }, []);

  const handleGenerate = useCallback(async () => {
    const tripList = filteredTrips();
    if (tripList.length === 0) {
      showToast("No trips in the selected date range.", "error");
      return;
    }
    setGenerating(true);

    try {
      const wb = buildWorkbook(tripList);
      const now = new Date();
      const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const fileName = `SLN_Logistics_${stamp}.xlsx`;

      // ── WEB ──────────────────────────────────────────────────────────────
      if (Platform.OS === "web") {
        const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        const blob = new Blob([buf], { type: MIME });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        showToast(`${fileName} downloaded!`, "success");
        return;
      }

      // ── NATIVE (Android / iOS) ────────────────────────────────────────────
      // Step 1: generate the base64 xlsx data
      const b64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

      // Step 2: write to the app's private cache — no permissions needed,
      //         always succeeds on every Android/iOS device.
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, b64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Step 3: open the system share sheet so the user can pick where to save.
      //         "Save to Files", "Downloads", WhatsApp, Gmail all appear here.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Excel ready! Choose where to save or share it.", "success");

      await Sharing.shareAsync(fileUri, {
        mimeType: MIME,
        dialogTitle: "Save or Share — SLN Logistics Excel",
        UTI: "com.microsoft.excel.xlsx",
      });

    } catch (e: any) {
      console.error("Excel error:", e);
      // Show the real error so we can diagnose exactly what failed
      showToast(
        `Failed: ${e?.message ?? JSON.stringify(e)}`,
        "error"
      );
    } finally {
      setGenerating(false);
    }
  }, [filteredTrips, buildWorkbook, showToast]);

  const totalFreight = trips.reduce((s, t) => s + t.total_freight, 0);
  const totalWeight = trips.reduce((s, t) => s + t.chargeable_weight, 0);

  const quickBtns: { key: QuickFilter; label: string }[] = [
    { key: "all", label: "All Time" },
    { key: "this_month", label: monthLabel(new Date()) },
    { key: "last_month", label: monthLabel(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)) },
    { key: "custom", label: "Custom Range" },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />

      {/* Stats */}
      <View style={[styles.statsCard, { backgroundColor: colors.primary }]}>
        <View style={styles.statItem}>
          <Feather name="list" size={22} color="rgba(255,255,255,0.8)" />
          <Text style={styles.statVal}>{trips.length}</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>
        <View style={[styles.statDiv, { backgroundColor: "rgba(255,255,255,0.3)" }]} />
        <View style={styles.statItem}>
          <Feather name="package" size={22} color="rgba(255,255,255,0.8)" />
          <Text style={styles.statVal}>{totalWeight.toFixed(1)} MT</Text>
          <Text style={styles.statLabel}>Total Weight</Text>
        </View>
        <View style={[styles.statDiv, { backgroundColor: "rgba(255,255,255,0.3)" }]} />
        <View style={styles.statItem}>
          <Feather name="dollar-sign" size={22} color="rgba(255,255,255,0.8)" />
          <Text style={styles.statVal}>₹{totalFreight.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Total Freight</Text>
        </View>
      </View>

      {/* Date Filter */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          <Feather name="filter" size={14} color={colors.foreground} />{"  "}Date Filter
        </Text>
        <View style={styles.quickRow}>
          {quickBtns.map((btn) => (
            <TouchableOpacity
              key={btn.key}
              style={[styles.quickBtn, {
                backgroundColor: quickFilter === btn.key ? colors.primary : colors.background,
                borderColor: quickFilter === btn.key ? colors.primary : colors.border,
              }]}
              onPress={() => setQuickFilter(btn.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.quickBtnText, {
                color: quickFilter === btn.key ? "#FFFFFF" : colors.mutedForeground,
              }]} numberOfLines={1}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {quickFilter === "custom" && (
          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>From</Text>
              <DatePickerField date={fromDate} onChange={setFromDate} />
            </View>
            <View style={styles.dateCol}>
              <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>To</Text>
              <DatePickerField date={toDate} onChange={setToDate} />
            </View>
          </View>
        )}

        {trips.length === 0 && allTrips.length > 0 && (
          <View style={[styles.emptyBox, { borderColor: colors.border }]}>
            <Feather name="alert-circle" size={16} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No trips in this date range. Try "All Time" or change the dates.
            </Text>
          </View>
        )}
      </View>

      {allTrips.length === 0 && (
        <View style={[styles.emptyBox, { borderColor: colors.border }]}>
          <Feather name="alert-circle" size={16} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No trips yet. Add trip entries first, then come back to export.
          </Text>
        </View>
      )}

      {/* Info */}
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="share-2" size={18} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          After generating, a share sheet opens. Tap "Save to Files" or "Downloads" to store the Excel, or share directly via WhatsApp, Gmail, etc.
        </Text>
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        style={[styles.genBtn, {
          backgroundColor: trips.length === 0 || allTrips.length === 0 ? "#999" : "#2E7D32",
          opacity: generating ? 0.7 : 1,
        }]}
        onPress={handleGenerate}
        disabled={generating || trips.length === 0 || allTrips.length === 0}
        activeOpacity={0.8}
      >
        {generating ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Feather name="file-text" size={22} color="#FFFFFF" />
        )}
        <Text style={styles.genBtnText}>
          {generating
            ? "Generating…"
            : allTrips.length === 0
            ? "No Trips to Export"
            : trips.length === 0
            ? "No Trips in Range"
            : `Generate & Save Excel  (${trips.length} trip${trips.length !== 1 ? "s" : ""})`}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  statsCard: { flexDirection: "row", borderRadius: 16, padding: 22 },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statVal: { color: "#FFFFFF", fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statLabel: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: "Inter_400Regular" },
  statDiv: { width: 1, marginHorizontal: 8 },
  section: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  quickBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  dateRow: { flexDirection: "row", gap: 12 },
  dateCol: { flex: 1 },
  dateLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 },
  emptyBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderStyle: "dashed" },
  emptyText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  infoCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },
  genBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 14 },
  genBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
