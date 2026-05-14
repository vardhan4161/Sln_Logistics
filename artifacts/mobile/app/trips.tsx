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

import Toast from "@/components/Toast";
import { Trip, useDB } from "@/contexts/DatabaseContext";
import { useColors } from "@/hooks/useColors";

type Colors = ReturnType<typeof import("@/hooks/useColors").useColors>;

function TripCard({
  item,
  colors,
  onDelete,
}: {
  item: Trip;
  colors: Colors;
  onDelete: (id: number) => void;
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
          {/* Row 1: serial, vehicle, date */}
          <View style={styles.cardTop}>
            <View style={[styles.snBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.snText, { color: colors.primary }]}>#{item.serial_no}</Text>
            </View>
            <View style={styles.vehicleChip}>
              <Feather name="truck" size={12} color={colors.mutedForeground} />
              <Text style={[styles.vehicleText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.vehicle_no}
              </Text>
            </View>
            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{item.trip_date}</Text>
          </View>

          {/* Row 2: route */}
          <View style={styles.routeRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.locLabel, { color: colors.mutedForeground }]}>FROM</Text>
              <Text style={[styles.locVal, { color: colors.foreground }]} numberOfLines={1}>
                {item.from_location}
              </Text>
            </View>
            <View style={[styles.arrowCircle, { backgroundColor: colors.secondary }]}>
              <Feather name="arrow-right" size={14} color={colors.primary} />
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={[styles.locLabel, { color: colors.mutedForeground }]}>TO</Text>
              <Text style={[styles.locVal, { color: colors.foreground }]} numberOfLines={1}>
                {item.to_location}
              </Text>
            </View>
          </View>

          {/* Row 3: meta + freight */}
          <View style={[styles.cardFoot, { borderTopColor: colors.border }]}>
            <View style={styles.chips}>
              <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                <Feather name="package" size={11} color={colors.mutedForeground} />
                <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
                  {item.chargeable_weight} MT
                </Text>
              </View>
              <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
                  ₹{item.rate}
                </Text>
              </View>
              {item.hamali > 0 && (
                <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
                    H ₹{item.hamali}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.freightAmt, { color: colors.primary }]}>
              ₹{item.total_freight.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>
      </View>
    </Swipeable>
  );
}

export default function TripsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getTrips, deleteTrip } = useDB();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ visible: false, message: "", type: "info" });

  const load = useCallback(() => setTrips(getTrips()), [getTrips]);

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

  const totalFreight = trips.reduce((s, t) => s + t.total_freight, 0);
  const totalWeight = trips.reduce((s, t) => s + t.chargeable_weight, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((p) => ({ ...p, visible: false }))}
      />

      {/* Stats strip */}
      <View style={[styles.strip, { backgroundColor: colors.primary }]}>
        <View style={styles.stripItem}>
          <Text style={styles.stripVal}>{trips.length}</Text>
          <Text style={styles.stripLbl}>Trips</Text>
        </View>
        <View style={[styles.stripDiv, { backgroundColor: "rgba(255,255,255,0.25)" }]} />
        <View style={styles.stripItem}>
          <Text style={styles.stripVal}>{totalWeight.toFixed(1)} MT</Text>
          <Text style={styles.stripLbl}>Total Weight</Text>
        </View>
        <View style={[styles.stripDiv, { backgroundColor: "rgba(255,255,255,0.25)" }]} />
        <View style={styles.stripItem}>
          <Text style={styles.stripVal}>₹{totalFreight.toLocaleString("en-IN")}</Text>
          <Text style={styles.stripLbl}>Total Freight</Text>
        </View>
      </View>

      {trips.length > 0 && (
        <View style={[styles.hintRow, { backgroundColor: colors.muted }]}>
          <Feather name="chevrons-left" size={13} color={colors.mutedForeground} />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Swipe left on any trip to delete it
          </Text>
        </View>
      )}

      <FlatList
        data={trips}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{
          padding: 12,
          gap: 10,
          paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24,
        }}
        renderItem={({ item }) => (
          <TripCard item={item} colors={colors} onDelete={handleDelete} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="inbox" size={38} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Trips Yet</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Add a new trip entry from the home screen to get started
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  strip: { flexDirection: "row", paddingVertical: 16, paddingHorizontal: 12 },
  stripItem: { flex: 1, alignItems: "center" },
  stripVal: { color: "#FFF", fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  stripLbl: { color: "rgba(255,255,255,0.72)", fontSize: 11, marginTop: 2, fontFamily: "Inter_400Regular" },
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
