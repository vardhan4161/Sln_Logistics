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
    visible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ visible: false, message: "", type: "success" });

  useFocusEffect(
    useCallback(() => {
      setAllTrips(getTrips());
    }, [getTrips])
  );

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      setToast({ visible: true, message, type });
    },
    []
  );
  const hideToast = useCallback(() => {
    setToast((p) => ({ ...p, visible: false }));
  }, []);

  const filteredTrips = useCallback((): Trip[] => {
    if (quickFilter === "all") return allTrips;

    let start: Date;
    let end: Date;

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

  const buildWorkbook = useCallback(
    (tripList: Trip[]) => {
      const wb = XLSX.utils.book_new();
      const headers = [
        "S.No.",
        "Date",
        "From Location",
        "To Location",
        "Vehicle No",
        "Chargeable Weight (MT)",
        "Rate",
        "Hamali",
        "Total Freight",
      ];
      const rows = tripList.map((t, i) => [
        i + 1,
        t.trip_date,
        t.from_location,
        t.to_location,
        t.vehicle_no,
        t.chargeable_weight,
        t.rate,
        t.hamali,
        t.total_freight,
      ]);
      const totalRow = [
        "TOTAL", "", "", "", "",
        tripList.reduce((s, t) => s + t.chargeable_weight, 0),
        tripList.reduce((s, t) => s + t.rate, 0),
        tripList.reduce((s, t) => s + t.hamali, 0),
        tripList.reduce((s, t) => s + t.total_freight, 0),
      ];
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows, totalRow]);
      ws["!cols"] = [
        { wch: 7 }, { wch: 12 }, { wch: 26 }, { wch: 26 }, { wch: 14 },
        { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "SLN Logistics Trips");
      return wb;
    },
    []
  );

  const makeFileName = () => {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${Date.now()}`;
    return `SLN_Logistics_${stamp}.xlsx`;
  };

  const MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  const handleGenerate = useCallback(async () => {
    const tripList = filteredTrips();
    if (tripList.length === 0) {
      showToast("No trips in the selected date range.", "error");
      return;
    }

    setGenerating(true);
    try {
      const wb = buildWorkbook(tripList);
      const fileName = makeFileName();

      if (Platform.OS === "web") {
        const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        const blob = new Blob([buffer], { type: MIME });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`${fileName} downloaded!`, "success");
        return;
      }

      const b64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

      if (Platform.OS === "android") {
        const SAF = FileSystem.StorageAccessFramework;

        showToast("Choose a folder to save the Excel file…", "info");

        const perm = await SAF.requestDirectoryPermissionsAsync();
        if (!perm.granted) {
          showToast("Folder permission denied. Please try again.", "error");
          return;
        }

        const fileUri = await SAF.createFileAsync(
          perm.directoryUri,
          fileName,
          MIME
        );
        await FileSystem.writeAsStringAsync(fileUri, b64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast(`Saved! "${fileName}" is in your chosen folder.`, "success");

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          setTimeout(async () => {
            try {
              await Sharing.shareAsync(fileUri, {
                mimeType: MIME,
                dialogTitle: "Share SLN Logistics Excel",
              });
            } catch {
            }
          }, 800);
        }
        return;
      }

      const baseDir = FileSystem.documentDirectory;
      if (!baseDir) {
        showToast("Cannot access device storage.", "error");
        return;
      }
      const dir = baseDir + "SLN_Logistics/";
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const fileUri = dir + fileName;
      await FileSystem.writeAsStringAsync(fileUri, b64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Excel created! Opening share…", "success");
      setTimeout(async () => {
        try {
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(fileUri, {
              mimeType: MIME,
              dialogTitle: "Share SLN Logistics Excel",
              UTI: "com.microsoft.excel.xlsx",
            });
          } else {
            showToast(`Saved to: ${fileUri}`, "info");
          }
        } catch {
          showToast(`Saved to SLN_Logistics folder.`, "info");
        }
      }, 600);
    } catch (e) {
      console.error("Excel error:", e);
      showToast("Failed to generate Excel. Please try again.", "error");
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
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

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

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          <Feather name="filter" size={14} color={colors.foreground} />
          {"  "}Date Filter
        </Text>

        <View style={styles.quickRow}>
          {quickBtns.map((btn) => (
            <TouchableOpacity
              key={btn.key}
              style={[
                styles.quickBtn,
                {
                  backgroundColor: quickFilter === btn.key ? colors.primary : colors.background,
                  borderColor: quickFilter === btn.key ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setQuickFilter(btn.key)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.quickBtnText,
                  { color: quickFilter === btn.key ? "#FFFFFF" : colors.mutedForeground },
                ]}
                numberOfLines={1}
              >
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {quickFilter === "custom" && (
          <View style={styles.customRange}>
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
          </View>
        )}

        {trips.length === 0 && allTrips.length > 0 ? (
          <View style={[styles.emptyBox, { borderColor: colors.border }]}>
            <Feather name="alert-circle" size={16} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No trips in this date range. Try "All Time" or change the dates.
            </Text>
          </View>
        ) : null}
      </View>

      {allTrips.length === 0 && (
        <View style={[styles.emptyBox, { borderColor: colors.border, marginBottom: 16 }]}>
          <Feather name="alert-circle" size={16} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No trips yet. Add trip entries first, then come back to export.
          </Text>
        </View>
      )}

      {Platform.OS === "android" && (
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="folder" size={18} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            On Android, you will be asked to choose a folder to save the Excel file.
            You can pick Downloads, Documents, or any folder you like.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.genBtn,
          {
            backgroundColor:
              trips.length === 0 || allTrips.length === 0 ? "#999" : "#2E7D32",
            opacity: generating ? 0.7 : 1,
          },
        ]}
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
  statsCard: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 22,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statVal: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  statDiv: { width: 1, marginHorizontal: 8 },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  customRange: { gap: 8 },
  dateRow: { flexDirection: "row", gap: 12 },
  dateCol: { flex: 1 },
  dateLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  emptyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  genBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 14,
  },
  genBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
