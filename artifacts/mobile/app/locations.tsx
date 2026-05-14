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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Toast from "@/components/Toast";
import { Location, useDB } from "@/contexts/DatabaseContext";
import { useColors } from "@/hooks/useColors";

function LocationRow({
  item,
  colors,
  onDelete,
}: {
  item: Location;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onDelete: (id: number, name: string) => void;
}) {
  const swipeRef = useRef<Swipeable>(null);

  const renderRightActions = (
    _prog: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-72, -30],
      outputRange: [1, 0.8],
      extrapolate: "clamp",
    });
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          swipeRef.current?.close();
          onDelete(item.id, item.name);
        }}
        activeOpacity={0.85}
      >
        <Animated.View style={{ transform: [{ scale }], alignItems: "center", gap: 3 }}>
          <Feather name="trash-2" size={20} color="#FFF" />
          <Text style={styles.deleteLabel}>Remove</Text>
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
      <View style={[styles.row, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="map-pin" size={15} color={colors.primary} />
        </View>
        <Text style={[styles.rowText, { color: colors.foreground }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Feather name="chevrons-left" size={14} color={colors.border} />
      </View>
    </Swipeable>
  );
}

export default function LocationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getLocations, addLocation, deleteLocation } = useDB();
  const [locations, setLocations] = useState<Location[]>([]);
  const [newName, setNewName] = useState("");
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ visible: false, message: "", type: "success" });

  const load = useCallback(() => setLocations(getLocations()), [getLocations]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      setToast({ visible: true, message, type });
    },
    []
  );

  const handleAdd = useCallback(() => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const added = addLocation(trimmed);
    if (added) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setNewName("");
      load();
      showToast(`"${trimmed}" added successfully.`, "success");
    } else {
      showToast("This location already exists.", "error");
    }
  }, [newName, addLocation, load, showToast]);

  const handleDelete = useCallback(
    (id: number, name: string) => {
      deleteLocation(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      load();
      showToast(`"${name}" removed.`, "info");
    },
    [deleteLocation, load, showToast]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((p) => ({ ...p, visible: false }))}
      />

      {/* COUNT HEADER */}
      <View style={[styles.countBar, { backgroundColor: colors.primary }]}>
        <Feather name="map-pin" size={16} color="rgba(255,255,255,0.8)" />
        <Text style={styles.countText}>
          {locations.length} location{locations.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* ADD INPUT */}
      <View style={[styles.addSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
          placeholder="Type a new location name..."
          placeholderTextColor={colors.mutedForeground}
          value={newName}
          onChangeText={setNewName}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: newName.trim() ? colors.primary : colors.muted }]}
          onPress={handleAdd}
          activeOpacity={0.8}
          disabled={!newName.trim()}
        >
          <Feather name="plus" size={22} color={newName.trim() ? "#FFF" : colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {locations.length > 0 && (
        <View style={[styles.hintRow, { backgroundColor: colors.muted }]}>
          <Feather name="chevrons-left" size={13} color={colors.mutedForeground} />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Swipe left to remove a location
          </Text>
        </View>
      )}

      <FlatList
        data={locations}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 20 }}
        renderItem={({ item }) => (
          <LocationRow item={item} colors={colors} onDelete={handleDelete} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="map-pin" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Locations Yet</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Add route locations above to use them in trip entries
            </Text>
          </View>
        }
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  countBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  countText: { color: "#FFF", fontSize: 14, fontFamily: "Inter_600SemiBold", fontWeight: "600" },

  addSection: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1 },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12, borderWidth: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  addBtn: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },

  hintRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  hintText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },

  deleteAction: { backgroundColor: "#C62828", justifyContent: "center", alignItems: "center", width: 72, marginLeft: 6 },
  deleteLabel: { color: "#FFF", fontSize: 10, fontFamily: "Inter_600SemiBold", fontWeight: "600" },

  empty: { alignItems: "center", paddingTop: 80, gap: 14, paddingHorizontal: 40 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, textAlign: "center", fontFamily: "Inter_400Regular", lineHeight: 20 },
});
