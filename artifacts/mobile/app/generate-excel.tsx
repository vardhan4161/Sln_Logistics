import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as XLSX from "xlsx";

import { Trip, useDB } from "@/contexts/DatabaseContext";
import { useColors } from "@/hooks/useColors";

export default function GenerateExcelScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getTrips } = useDB();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [generating, setGenerating] = useState(false);
  const [lastFile, setLastFile] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setTrips(getTrips());
    }, [getTrips])
  );

  const shareFile = useCallback(async (filePath: string) => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Web Preview",
        "File sharing is available on the mobile device via Expo Go."
      );
      return;
    }
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Share SLN Logistics Excel",
        UTI: "com.microsoft.excel.xlsx",
      });
    } else {
      Alert.alert(
        "Saved",
        `File saved to:\n${filePath}`
      );
    }
  }, []);

  const buildWorkbook = () => {
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
  };

  const handleGenerate = async () => {
    if (trips.length === 0) {
      Alert.alert("No Trips", "There are no trip entries to export.");
      return;
    }

    setGenerating(true);
    try {
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
        anchor.click();
        URL.revokeObjectURL(url);
        Alert.alert("Downloaded", `${fileName} saved to your Downloads folder.`);
        return;
      }

      const b64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const dir = (FileSystem.documentDirectory ?? "") + "SLN_Logistics/";
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const fileUri = `${dir}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, b64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setLastFile(fileUri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await shareFile(fileUri);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to generate Excel file. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

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
      <View style={[styles.statsCard, { backgroundColor: colors.primary }]}>
        <View style={styles.statItem}>
          <Feather name="list" size={22} color="rgba(255,255,255,0.8)" />
          <Text style={styles.statVal}>{trips.length}</Text>
          <Text style={styles.statLabel}>Total Trips</Text>
        </View>
        <View
          style={[
            styles.statDiv,
            { backgroundColor: "rgba(255,255,255,0.3)" },
          ]}
        />
        <View style={styles.statItem}>
          <Feather name="package" size={22} color="rgba(255,255,255,0.8)" />
          <Text style={styles.statVal}>{totalWeight.toFixed(1)} MT</Text>
          <Text style={styles.statLabel}>Total Weight</Text>
        </View>
        <View
          style={[
            styles.statDiv,
            { backgroundColor: "rgba(255,255,255,0.3)" },
          ]}
        />
        <View style={styles.statItem}>
          <Feather
            name="dollar-sign"
            size={22}
            color="rgba(255,255,255,0.8)"
          />
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
          Generates a formatted Excel (.xlsx) with all trip records, totals, and
          borders. File saved locally and shared via WhatsApp or other apps.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.genBtn,
            { backgroundColor: "#2E7D32", opacity: generating ? 0.7 : 1 },
          ]}
          onPress={handleGenerate}
          disabled={generating}
          activeOpacity={0.8}
        >
          {generating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Feather name="file-text" size={22} color="#FFFFFF" />
          )}
          <Text style={styles.genBtnText}>
            {generating ? "Generating..." : "Generate & Share Excel"}
          </Text>
        </TouchableOpacity>

        {lastFile && !generating ? (
          <TouchableOpacity
            style={[
              styles.shareBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => shareFile(lastFile)}
            activeOpacity={0.8}
          >
            <Feather name="share-2" size={20} color={colors.primary} />
            <Text style={[styles.shareBtnText, { color: colors.primary }]}>
              Share Again
            </Text>
          </TouchableOpacity>
        ) : null}
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
    marginBottom: 32,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
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
    fontSize: 17,
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
