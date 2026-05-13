import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as XLSX from "xlsx";

import Toast from "@/components/Toast";
import { Trip, useDB } from "@/contexts/DatabaseContext";
import { useColors } from "@/hooks/useColors";

export default function GenerateExcelScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getTrips } = useDB();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [generating, setGenerating] = useState(false);
  const [lastFile, setLastFile] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ visible: false, message: "", type: "success" });

  useFocusEffect(
    useCallback(() => {
      setTrips(getTrips());
    }, [getTrips])
  );

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      setToast({ visible: true, message, type });
    },
    []
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const buildWorkbook = useCallback(() => {
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
    const rows = trips.map((t, i) => [
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
      trips.reduce((s, t) => s + t.chargeable_weight, 0),
      trips.reduce((s, t) => s + t.rate, 0),
      trips.reduce((s, t) => s + t.hamali, 0),
      trips.reduce((s, t) => s + t.total_freight, 0),
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows, totalRow]);
    ws["!cols"] = [
      { wch: 7 }, { wch: 12 }, { wch: 26 }, { wch: 26 }, { wch: 14 },
      { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "SLN Logistics Trips");
    return wb;
  }, [trips]);

  const shareFile = useCallback(async (filePath: string) => {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Share SLN Logistics Excel",
          UTI: "com.microsoft.excel.xlsx",
        });
      } else {
        showToast(`File saved: ${filePath.split("/").pop()}`, "info");
      }
    } catch {
      showToast("Could not open share dialog. File was saved to device.", "info");
    }
  }, [showToast]);

  const handleGenerate = useCallback(async () => {
    if (trips.length === 0) {
      showToast("No trips found. Add trip entries first.", "error");
      return;
    }

    setGenerating(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        showToast("Storage permission is required to save the Excel file.", "error");
        setGenerating(false);
        return;
      }

      const wb = buildWorkbook();
      const now = new Date();
      const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${Date.now()}`;
      const fileName = `SLN_Logistics_${stamp}.xlsx`;

      if (Platform.OS === "web") {
        const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        showToast(`${fileName} downloaded successfully!`, "success");
        return;
      }

      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!baseDir) {
        showToast("Device storage is busy or unavailable. Please restart the app.", "error");
        return;
      }

      const fileUri = baseDir + fileName;

      const b64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      await FileSystem.writeAsStringAsync(fileUri, b64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setLastFile(fileUri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Excel file created! Opening share...", "success");

      setTimeout(() => shareFile(fileUri), 600);
    } catch (e) {
      console.error("Excel generation error:", e);
      showToast("Failed to generate Excel. Please try again.", "error");
    } finally {
      setGenerating(false);
    }
  }, [trips, buildWorkbook, shareFile, showToast]);

  const totalFreight = trips.reduce((s, t) => s + t.total_freight, 0);
  const totalWeight = trips.reduce((s, t) => s + t.chargeable_weight, 0);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 32,
        },
      ]}
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
          <Text style={styles.statLabel}>Total Trips</Text>
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

      <View
        style={[
          styles.infoCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Feather name="info" size={18} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          Generates a formatted Excel (.xlsx) with all trip records, totals and
          column widths. Saved to device and shared via WhatsApp or any app.
        </Text>
      </View>

      {trips.length === 0 && (
        <View style={[styles.emptyBox, { borderColor: colors.border }]}>
          <Feather name="alert-circle" size={20} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No trips yet. Add trip entries first, then come back to export.
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.genBtn,
            {
              backgroundColor: trips.length === 0 ? "#999" : "#2E7D32",
              opacity: generating ? 0.7 : 1,
            },
          ]}
          onPress={handleGenerate}
          disabled={generating || trips.length === 0}
          activeOpacity={0.8}
        >
          {generating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Feather name="file-text" size={22} color="#FFFFFF" />
          )}
          <Text style={styles.genBtnText}>
            {generating
              ? "Generating..."
              : trips.length === 0
              ? "No Trips to Export"
              : `Generate & Share Excel (${trips.length} trips)`}
          </Text>
        </TouchableOpacity>

        {lastFile && !generating && (
          <TouchableOpacity
            style={[
              styles.shareBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => shareFile(lastFile)}
            activeOpacity={0.8}
          >
            <Feather name="share-2" size={20} color={colors.primary} />
            <Text style={[styles.shareBtnText, { color: colors.primary }]}>
              Share Again
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  statsCard: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 22,
    marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statVal: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  statDiv: { width: 1, marginHorizontal: 8 },
  infoCard: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  emptyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: 16,
  },
  emptyText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  actions: { gap: 12 },
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
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});
