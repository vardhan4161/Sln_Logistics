import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Trip, useDB } from "@/contexts/DatabaseContext";
import { useColors } from "@/hooks/useColors";

export default function TripsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getTrips, deleteTrip } = useDB();
  const [trips, setTrips] = useState<Trip[]>([]);

  const loadTrips = useCallback(() => {
    setTrips(getTrips());
  }, [getTrips]);

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [loadTrips])
  );

  const handleDelete = (id: number) => {
    Alert.alert("Delete Trip", "Are you sure you want to delete this trip?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteTrip(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          loadTrips();
        },
      },
    ]);
  };

  const totalFreight = trips.reduce((sum, t) => sum + t.total_freight, 0);
  const totalWeight = trips.reduce((sum, t) => sum + t.chargeable_weight, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.summary, { backgroundColor: colors.primary }]}>
        <View style={styles.sumItem}>
          <Text style={styles.sumVal}>{trips.length}</Text>
          <Text style={styles.sumLabel}>Trips</Text>
        </View>
        <View
          style={[styles.sumDivider, { backgroundColor: "rgba(255,255,255,0.3)" }]}
        />
        <View style={styles.sumItem}>
          <Text style={styles.sumVal}>{totalWeight.toFixed(1)} MT</Text>
          <Text style={styles.sumLabel}>Total Weight</Text>
        </View>
        <View
          style={[styles.sumDivider, { backgroundColor: "rgba(255,255,255,0.3)" }]}
        />
        <View style={styles.sumItem}>
          <Text style={styles.sumVal}>₹{totalFreight.toFixed(0)}</Text>
          <Text style={styles.sumLabel}>Total Freight</Text>
        </View>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{
          padding: 12,
          paddingBottom:
            (Platform.OS === "web" ? 34 : insets.bottom) + 20,
        }}
        scrollEnabled={trips.length > 0}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.cardTop}>
              <View
                style={[
                  styles.snBadge,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Text style={[styles.snText, { color: colors.primary }]}>
                  #{item.serial_no}
                </Text>
              </View>
              <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                {item.trip_date}
              </Text>
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Feather name="trash-2" size={18} color={colors.destructive} />
              </TouchableOpacity>
            </View>

            <View style={styles.routeRow}>
              <Text
                style={[styles.locText, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {item.from_location}
              </Text>
              <Feather
                name="arrow-right"
                size={16}
                color={colors.mutedForeground}
              />
              <Text
                style={[styles.locText, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {item.to_location}
              </Text>
            </View>

            <View
              style={[styles.sep, { backgroundColor: colors.border }]}
            />

            <View style={styles.cardBottom}>
              <View style={styles.detailPill}>
                <Feather
                  name="truck"
                  size={13}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[styles.detailText, { color: colors.mutedForeground }]}
                >
                  {item.vehicle_no}
                </Text>
              </View>
              <View style={styles.detailPill}>
                <Feather
                  name="package"
                  size={13}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[styles.detailText, { color: colors.mutedForeground }]}
                >
                  {item.chargeable_weight} MT
                </Text>
              </View>
              <Text style={[styles.freightText, { color: colors.primary }]}>
                ₹{item.total_freight.toFixed(2)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={56} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No Trips Yet
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
            >
              Add a new trip entry to get started
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summary: {
    flexDirection: "row",
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  sumItem: { flex: 1, alignItems: "center" },
  sumVal: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  sumLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
  sumDivider: { width: 1, marginHorizontal: 8 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  snBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  snText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  dateText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  locText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  sep: { height: StyleSheet.hairlineWidth, marginBottom: 10 },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  detailText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  freightText: {
    marginLeft: "auto",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
});
