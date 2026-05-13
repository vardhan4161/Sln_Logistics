import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
  accent: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: "1",
    title: "New Trip Entry",
    subtitle: "Record a new transport trip",
    icon: "plus-circle",
    route: "/new-trip",
    accent: "#1565C0",
  },
  {
    id: "2",
    title: "Generate Excel",
    subtitle: "Export trips to Excel (.xlsx)",
    icon: "file-text",
    route: "/generate-excel",
    accent: "#2E7D32",
  },
  {
    id: "3",
    title: "View Trips",
    subtitle: "Browse all recorded trips",
    icon: "list",
    route: "/trips",
    accent: "#E65100",
  },
  {
    id: "4",
    title: "Manage Locations",
    subtitle: "Add or remove route locations",
    icon: "map-pin",
    route: "/locations",
    accent: "#6A1B9A",
  },
  {
    id: "5",
    title: "Manage Vehicles",
    subtitle: "Add or remove vehicle numbers",
    icon: "truck",
    route: "/vehicles",
    accent: "#00695C",
  },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top + 16;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom + 32;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: botPad }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
          <Feather name="truck" size={30} color="#FFFFFF" />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.appName, { color: colors.foreground }]}>
            SLN Logistics
          </Text>
          <Text
            style={[styles.appSubtitle, { color: colors.mutedForeground }]}
          >
            Transport Management System
          </Text>
        </View>
      </View>

      <View
        style={[styles.divider, { backgroundColor: colors.border }]}
      />

      <View style={styles.menu}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => router.push(item.route as never)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconBox,
                { backgroundColor: item.accent + "1A" },
              ]}
            >
              <Feather name={item.icon} size={26} color={item.accent} />
            </View>
            <View style={styles.cardBody}>
              <Text
                style={[styles.cardTitle, { color: colors.foreground }]}
              >
                {item.title}
              </Text>
              <Text
                style={[
                  styles.cardSubtitle,
                  { color: colors.mutedForeground },
                ]}
              >
                {item.subtitle}
              </Text>
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        ))}
      </View>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.secondary,
            borderColor: colors.border,
          },
        ]}
      >
        <Feather name="wifi-off" size={14} color={colors.primary} />
        <Text style={[styles.footerText, { color: colors.primary }]}>
          Fully offline — no internet required
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  appName: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  appSubtitle: {
    fontSize: 13,
    marginTop: 3,
    fontFamily: "Inter_400Regular",
  },
  divider: { height: 1, marginHorizontal: 20, marginBottom: 20 },
  menu: { paddingHorizontal: 16, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
  },
  footerText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
  },
});
