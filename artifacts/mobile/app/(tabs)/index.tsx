import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDB } from "@/contexts/DatabaseContext";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getTrips } = useDB();

  const [stats, setStats] = useState({
    totalTrips: 0,
    totalWeight: 0,
    totalFreight: 0,
    todayTrips: 0,
  });

  useFocusEffect(
    useCallback(() => {
      const trips = getTrips();
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, "0");
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const yyyy = today.getFullYear();
      const todayStr = `${dd}/${mm}/${yyyy}`;
      setStats({
        totalTrips: trips.length,
        totalWeight: trips.reduce((s, t) => s + t.chargeable_weight, 0),
        totalFreight: trips.reduce((s, t) => s + t.total_freight, 0),
        todayTrips: trips.filter((t) => t.trip_date === todayStr).length,
      });
    }, [getTrips])
  );

  const topPad = Platform.OS === "web" ? 20 : insets.top + 8;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom + 32;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: botPad }}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
          <Feather name="truck" size={26} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.appName, { color: colors.foreground }]}>SLN Logistics</Text>
          <Text style={[styles.appSub, { color: colors.mutedForeground }]}>
            Transport Management System
          </Text>
        </View>
        {stats.todayTrips > 0 && (
          <View style={[styles.todayPill, { backgroundColor: colors.primary }]}>
            <Text style={styles.todayPillText}>{stats.todayTrips} today</Text>
          </View>
        )}
      </View>

      {/* STATS BANNER */}
      <View style={[styles.statsBanner, { backgroundColor: colors.primary }]}>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{stats.totalTrips}</Text>
          <Text style={styles.statLbl}>Total Trips</Text>
        </View>
        <View style={[styles.statDiv, { backgroundColor: "rgba(255,255,255,0.22)" }]} />
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{stats.totalWeight.toFixed(1)}</Text>
          <Text style={styles.statLbl}>MT Moved</Text>
        </View>
        <View style={[styles.statDiv, { backgroundColor: "rgba(255,255,255,0.22)" }]} />
        <View style={styles.statItem}>
          <Text style={styles.statVal}>
            ₹{stats.totalFreight >= 1000
              ? `${(stats.totalFreight / 1000).toFixed(1)}K`
              : stats.totalFreight.toFixed(0)}
          </Text>
          <Text style={styles.statLbl}>Freight Earned</Text>
        </View>
      </View>

      {/* PRIMARY CTA */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/new-trip");
          }}
          activeOpacity={0.82}
        >
          <View style={styles.primaryIconWrap}>
            <Feather name="plus" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.primaryTitle}>New Trip Entry</Text>
            <Text style={styles.primarySub}>Record a transport trip now</Text>
          </View>
          <Feather name="arrow-right" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      {/* QUICK ACTIONS 2×2 GRID */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          QUICK ACTIONS
        </Text>
        <View style={styles.grid}>
          {[
            { icon: "file-text" as const, label: "Generate Excel", sub: "Export & share", accent: "#2E7D32", route: "/generate-excel" },
            { icon: "list" as const,      label: "View Trips",     sub: "Browse entries",  accent: "#E65100", route: "/trips" },
            { icon: "map-pin" as const,   label: "Locations",      sub: "Manage routes",   accent: "#6A1B9A", route: "/locations" },
            { icon: "truck" as const,     label: "Vehicles",       sub: "Manage fleet",    accent: "#00695C", route: "/vehicles" },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(item.route as never);
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.gridIcon, { backgroundColor: item.accent + "18" }]}>
                <Feather name={item.icon} size={22} color={item.accent} />
              </View>
              <Text style={[styles.gridLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Text style={[styles.gridSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* OFFLINE PILL */}
      <View style={[styles.offlinePill, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Feather name="wifi-off" size={13} color={colors.primary} />
        <Text style={[styles.offlineText, { color: colors.primary }]}>
          Fully offline — no internet required
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingBottom: 16 },
  logoBox: { width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  appName: { fontSize: 21, fontWeight: "700", fontFamily: "Inter_700Bold" },
  appSub: { fontSize: 12, marginTop: 1, fontFamily: "Inter_400Regular" },
  todayPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  todayPillText: { color: "#FFF", fontSize: 12, fontFamily: "Inter_600SemiBold", fontWeight: "600" },

  statsBanner: { flexDirection: "row", marginHorizontal: 16, borderRadius: 20, paddingVertical: 22, paddingHorizontal: 8, marginBottom: 20 },
  statItem: { flex: 1, alignItems: "center" },
  statVal: { color: "#FFF", fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statLbl: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 3, fontFamily: "Inter_400Regular" },
  statDiv: { width: 1, marginHorizontal: 4 },

  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: 1, marginBottom: 12 },

  primaryBtn: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 18 },
  primaryIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center" },
  primaryTitle: { color: "#FFF", fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  primarySub: { color: "rgba(255,255,255,0.72)", fontSize: 13, marginTop: 2, fontFamily: "Inter_400Regular" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridCard: { width: "47%", borderRadius: 16, borderWidth: 1, padding: 16, gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  gridIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  gridLabel: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  gridSub: { fontSize: 12, fontFamily: "Inter_400Regular" },

  offlinePill: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, padding: 13, borderRadius: 12, borderWidth: 1, justifyContent: "center" },
  offlineText: { fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" },
});
