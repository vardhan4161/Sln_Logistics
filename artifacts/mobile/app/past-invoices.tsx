import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import Toast from "../components/Toast";
import { GeneratedInvoice, useDB } from "../contexts/DatabaseContext";
import { useColors } from "../hooks/useColors";

type Colors = ReturnType<typeof import("../hooks/useColors").useColors>;

function InvoiceCard({
  item,
  colors,
  onDelete,
  onSharePdf,
  onShareExcel,
  hasPdf,
  hasExcel,
}: {
  item: GeneratedInvoice;
  colors: Colors;
  onDelete: (id: number) => void;
  onSharePdf: (inv: GeneratedInvoice) => void;
  onShareExcel: (inv: GeneratedInvoice) => void;
  hasPdf: boolean;
  hasExcel: boolean;
}) {
  const swipeRef = useRef<Swipeable>(null);

  const renderRightActions = (
    _prog: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, -30],
      outputRange: [1, 0.8],
      extrapolate: "clamp",
    });
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          swipeRef.current?.close();
          onDelete(item.id);
        }}
        activeOpacity={0.85}
      >
        <Animated.View style={[styles.deleteInner, { transform: [{ scale }] }]}>
          <Feather name="trash-2" size={22} color="#FFF" />
          <Text style={styles.deleteLabel}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={[styles.snBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.snText, { color: colors.primary }]}>{item.invoice_no}</Text>
            </View>
            <View style={styles.vehicleChip}>
              <Feather name="calendar" size={12} color={colors.mutedForeground} />
              <Text style={[styles.vehicleText, { color: colors.mutedForeground }]}>{item.invoice_date}</Text>
            </View>
          </View>

          <View style={styles.routeRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.locLabel, { color: colors.mutedForeground }]}>PERIOD</Text>
              <Text style={[styles.locVal, { color: colors.foreground }]} numberOfLines={1}>{item.period}</Text>
            </View>
          </View>

          <View style={[styles.cardFoot, { borderTopColor: colors.border }]}>
            <View style={styles.chips}>
              <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                <Feather name="layers" size={11} color={colors.mutedForeground} />
                <Text style={[styles.chipText, { color: colors.mutedForeground }]}>{item.trip_count} trips</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                <Text style={[styles.chipText, { color: colors.mutedForeground }]}>Tax ₹{item.cgst + item.sgst}</Text>
              </View>
            </View>
            <Text style={[styles.freightAmt, { color: colors.primary }]}>₹{item.total_amount.toLocaleString("en-IN")}</Text>
          </View>

          {(hasPdf || hasExcel) && (
            <View style={[styles.shareRow, { borderTopColor: colors.border }]}>
              {hasPdf && (
                <TouchableOpacity style={[styles.shareBtn, { backgroundColor: colors.secondary }]} onPress={() => onSharePdf(item)} activeOpacity={0.7}>
                  <Feather name="file-text" size={14} color={colors.primary} />
                  <Text style={[styles.shareBtnTxt, { color: colors.primary }]}>Share PDF</Text>
                </TouchableOpacity>
              )}
              {hasExcel && (
                <TouchableOpacity style={[styles.shareBtn, { backgroundColor: colors.secondary }]} onPress={() => onShareExcel(item)} activeOpacity={0.7}>
                  <Feather name="grid" size={14} color={colors.primary} />
                  <Text style={[styles.shareBtnTxt, { color: colors.primary }]}>Share Excel</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Swipeable>
  );
}

export default function PastInvoicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getInvoices, deleteInvoice, getInvoiceFiles } = useDB();
  const [invoices, setInvoices] = useState<GeneratedInvoice[]>([]);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ visible: false, message: "", type: "info" });

  const load = useCallback(() => setInvoices(getInvoices()), [getInvoices]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = useCallback(
    (id: number) => {
      deleteInvoice(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      load();
      setToast({ visible: true, message: "Invoice deleted.", type: "info" });
    },
    [deleteInvoice, load]
  );

  const handleSharePdf = async (inv: GeneratedInvoice) => {
    const files = getInvoiceFiles(inv.id);
    if (!files.pdf_base64) {
      setToast({ visible: true, message: "PDF not available (only on the device that generated it)", type: "info" });
      return;
    }
    try {
      const dest = `${FileSystem.cacheDirectory}${inv.invoice_no.replace(/\//g, "-")}.pdf`;
      await FileSystem.writeAsStringAsync(dest, files.pdf_base64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, { mimeType: "application/pdf", dialogTitle: `Share Invoice ${inv.invoice_no} (PDF)` });
      }
    } catch (e) {
      setToast({ visible: true, message: "Failed to share PDF", type: "error" });
    }
  };

  const handleShareExcel = async (inv: GeneratedInvoice) => {
    const files = getInvoiceFiles(inv.id);
    if (!files.excel_base64) {
      setToast({ visible: true, message: "Excel not available (only on the device that generated it)", type: "info" });
      return;
    }
    try {
      const dest = `${FileSystem.cacheDirectory}${inv.invoice_no.replace(/\//g, "-")}.xlsx`;
      await FileSystem.writeAsStringAsync(dest, files.excel_base64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", dialogTitle: `Share Invoice ${inv.invoice_no} (Excel)` });
      }
    } catch (e) {
      setToast({ visible: true, message: "Failed to share Excel", type: "error" });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((p) => ({ ...p, visible: false }))}
      />

      {invoices.length > 0 && (
        <View style={[styles.hintRow, { backgroundColor: colors.muted }]}>
          <Feather name="info" size={13} color={colors.mutedForeground} />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Swipe left on an invoice to delete it
          </Text>
        </View>
      )}

      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{
          padding: 12,
          gap: 10,
          paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24,
        }}
        renderItem={({ item }) => {
          const files = getInvoiceFiles(item.id);
          return (
            <InvoiceCard
              item={item}
              colors={colors}
              onDelete={handleDelete}
              onSharePdf={handleSharePdf}
              onShareExcel={handleShareExcel}
              hasPdf={!!files.pdf_base64}
              hasExcel={!!files.excel_base64}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="file-text" size={38} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Invoices</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              You haven't generated any invoices yet
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  hintRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  hintText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  card: { flexDirection: "row", borderRadius: 16, borderWidth: 1, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  accentBar: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 10 },

  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  snBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  snText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  vehicleChip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  vehicleText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  routeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  locLabel: { fontSize: 10, fontFamily: "Inter_500Medium", fontWeight: "500", letterSpacing: 0.6, marginBottom: 2 },
  locVal: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },

  cardFoot: { flexDirection: "row", alignItems: "center", paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  chips: { flex: 1, flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  chipText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  freightAmt: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },

  deleteAction: { backgroundColor: "#C62828", justifyContent: "center", alignItems: "center", width: 80, borderRadius: 16, marginLeft: 8 },
  deleteInner: { alignItems: "center", gap: 4 },
  deleteLabel: { color: "#FFF", fontSize: 11, fontFamily: "Inter_600SemiBold", fontWeight: "600" },

  empty: { alignItems: "center", paddingTop: 80, gap: 16, paddingHorizontal: 40 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, textAlign: "center", fontFamily: "Inter_400Regular", lineHeight: 21 },

  shareRow: { flexDirection: "row", gap: 10, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  shareBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 8 },
  shareBtnTxt: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});
