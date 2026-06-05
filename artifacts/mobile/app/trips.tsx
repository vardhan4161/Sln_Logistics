import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
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

import Toast from "../components/Toast";
import { Trip, useDB } from "../contexts/DatabaseContext";
import { useColors } from "../hooks/useColors";

type Colors = ReturnType<typeof import("../hooks/useColors").useColors>;

function parseDMY(str: string): Date {
  const p = str.split("/");
  if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
  return new Date(str);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function TripCard({
  item,
  monthlyNo,
  colors,
  onDelete,
  onEdit,
}: {
  item: Trip;
  monthlyNo: number;
  colors: Colors;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
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
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => onEdit(item.id)}
        activeOpacity={0.85}
      >
        <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />
        <View style={styles.cardBody}>
          {/* Row 1: serial, vehicle, date, edit icon */}
          <View style={styles.cardTop}>
            <View style={[styles.snBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.snText, { color: colors.primary }]}>#{monthlyNo}</Text>
            </View>
            <View style={styles.vehicleChip}>
              <Feather name="truck" size={12} color={colors.mutedForeground} />
              <Text style={[styles.vehicleText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.vehicle_no}
              </Text>
            </View>
            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{item.trip_date}</Text>
            <Feather name="edit-2" size={13} color={colors.primary} />
          </View>

          {/* Row 2: route */}
          <View style={styles.routeRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.locLabel, { color: colors.mutedForeground }]}>FROM</Text>
              <Text style={[styles.locVal, { color: colors.foreground }]} numberOfLines={1}>{item.from_location}</Text>
            </View>
            <View style={[styles.arrowCircle, { backgroundColor: colors.secondary }]}>
              <Feather name="arrow-right" size={14} color={colors.primary} />
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={[styles.locLabel, { color: colors.mutedForeground }]}>TO</Text>
              <Text style={[styles.locVal, { color: colors.foreground }]} numberOfLines={1}>{item.to_location}</Text>
            </View>
          </View>

          {/* Row 3: meta + freight */}
          <View style={[styles.cardFoot, { borderTopColor: colors.border }]}>
            <View style={styles.chips}>
              <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                <Feather name="package" size={11} color={colors.mutedForeground} />
                <Text style={[styles.chipText, { color: colors.mutedForeground }]}>{item.chargeable_weight} MT</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                <Text style={[styles.chipText, { color: colors.mutedForeground }]}>₹{item.rate}</Text>
              </View>
              {item.hamali > 0 && (
                <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.chipText, { color: colors.mutedForeground }]}>H ₹{item.hamali}</Text>
                </View>
              )}
              {item.added_by && (
                <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                  <Feather name="user" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.chipText, { color: colors.mutedForeground }]} numberOfLines={1}>{item.added_by}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.freightAmt, { color: colors.primary }]}>₹{item.total_freight.toLocaleString("en-IN")}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function TripsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getTrips, deleteTrip } = useDB();
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ visible: false, message: "", type: "info" });

  // Current month navigation state
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed

  const load = useCallback(() => setAllTrips(getTrips()), [getTrips]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = useCallback(
    (id: number) => {
      deleteTrip(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      load();
      setToast({ visible: true, message: "Trip entry deleted.", type: "info" });
    },
    [deleteTrip, load]
  );

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
    if (isCurrentMonth) return; // don't go into the future
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  // Filter trips to the selected month, sorted by date then by id (order of entry)
  const monthTrips = allTrips
    .filter(t => {
      const d = parseDMY(t.trip_date);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    })
    .sort((a, b) => {
      const da = parseDMY(a.trip_date).getTime();
      const db = parseDMY(b.trip_date).getTime();
      if (da !== db) return da - db;
      return a.id - b.id;
    });

  const totalFreight = monthTrips.reduce((s, t) => s + t.total_freight, 0);
  const totalWeight = monthTrips.reduce((s, t) => s + t.chargeable_weight, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((p) => ({ ...p, visible: false }))}
      />

      {/* Month Navigator */}
      <View style={[styles.monthNav, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navBtn} activeOpacity={0.7}>
          <Feather name="chevron-left" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.monthLabel}>
          <Text style={styles.monthText}>{MONTHS[viewMonth]} {viewYear}</Text>
          {isCurrentMonth && <Text style={styles.currentBadge}>Current</Text>}
        </View>
        <TouchableOpacity onPress={goToNextMonth} style={[styles.navBtn, { opacity: isCurrentMonth ? 0.3 : 1 }]} activeOpacity={0.7} disabled={isCurrentMonth}>
          <Feather name="chevron-right" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Stats strip */}
      <View style={[styles.strip, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.stripItem}>
          <Text style={[styles.stripVal, { color: colors.foreground }]}>{monthTrips.length}</Text>
          <Text style={[styles.stripLbl, { color: colors.mutedForeground }]}>Trips</Text>
        </View>
        <View style={[styles.stripDiv, { backgroundColor: colors.border }]} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripVal, { color: colors.foreground }]}>{totalWeight.toFixed(1)} MT</Text>
          <Text style={[styles.stripLbl, { color: colors.mutedForeground }]}>Weight</Text>
        </View>
        <View style={[styles.stripDiv, { backgroundColor: colors.border }]} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripVal, { color: colors.primary }]}>₹{totalFreight.toLocaleString("en-IN")}</Text>
          <Text style={[styles.stripLbl, { color: colors.mutedForeground }]}>Freight</Text>
        </View>
      </View>

      {monthTrips.length > 0 && (
        <View style={[styles.hintRow, { backgroundColor: colors.muted }]}>
          <Feather name="edit-2" size={13} color={colors.mutedForeground} />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Tap a trip to edit • Swipe left to delete
          </Text>
        </View>
      )}

      <FlatList
        data={monthTrips}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{
          padding: 12,
          gap: 10,
          paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24,
        }}
        renderItem={({ item, index }) => (
          <TripCard
            item={item}
            monthlyNo={index + 1}
            colors={colors}
            onDelete={handleDelete}
            onEdit={(id) => router.push(`/edit-trip?id=${id}` as never)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="inbox" size={38} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Trips in {MONTHS[viewMonth]}</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              No trip entries found for {MONTHS[viewMonth]} {viewYear}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  monthNav: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 8 },
  navBtn: { padding: 8 },
  monthLabel: { flex: 1, alignItems: "center", gap: 4 },
  monthText: { color: "#FFF", fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  currentBadge: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },

  strip: { flexDirection: "row", paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  stripItem: { flex: 1, alignItems: "center" },
  stripVal: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  stripLbl: { fontSize: 11, marginTop: 2, fontFamily: "Inter_400Regular" },
  stripDiv: { width: 1, marginHorizontal: 8 },

  hintRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  hintText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  card: { flexDirection: "row", borderRadius: 16, borderWidth: 1, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  accentBar: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 10 },

  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  snBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  snText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  vehicleChip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  vehicleText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  dateText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  routeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  locLabel: { fontSize: 10, fontFamily: "Inter_500Medium", fontWeight: "500", letterSpacing: 0.6, marginBottom: 2 },
  locVal: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  arrowCircle: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },

  cardFoot: { flexDirection: "row", alignItems: "center", paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
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
});
