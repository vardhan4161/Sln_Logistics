import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Toast from "../components/Toast";
import { Location, useDB } from "../contexts/DatabaseContext";
import { useColors } from "../hooks/useColors";

function LocationRow({
  item,
  colors,
  onDelete,
  onEdit,
}: {
  item: Location;
  colors: ReturnType<typeof import("../hooks/useColors").useColors>;
  onDelete: (id: number, name: string) => void;
  onEdit: (item: Location) => void;
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
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        onPress={() => onEdit(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="map-pin" size={15} color={colors.primary} />
        </View>
        <Text style={[styles.rowText, { color: colors.foreground }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Feather name="edit-2" size={14} color={colors.mutedForeground} />
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function LocationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getLocations, addLocation, updateLocation, deleteLocation } = useDB();
  const [locations, setLocations] = useState<Location[]>([]);
  const [newName, setNewName] = useState("");
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ visible: false, message: "", type: "success" });

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");

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

  const openEditModal = useCallback((item: Location) => {
    setEditingLocation(item);
    setEditName(item.name);
    setEditError("");
    setEditModalVisible(true);
  }, []);

  const handleEditSave = useCallback(() => {
    if (!editingLocation) return;
    const trimmed = editName.trim();

    if (!trimmed) {
      setEditError("Location name cannot be empty.");
      return;
    }

    // Check for duplicate (excluding the current location)
    const duplicate = locations.find(
      (l) => l.id !== editingLocation.id && l.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setEditError("A location with this name already exists.");
      return;
    }

    // If name hasn't changed, just close
    if (trimmed === editingLocation.name) {
      setEditModalVisible(false);
      return;
    }

    updateLocation(editingLocation.id, trimmed);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditModalVisible(false);
    load();
    showToast(
      `"${editingLocation.name}" renamed to "${trimmed}". All trips & rates updated.`,
      "success"
    );
  }, [editingLocation, editName, locations, updateLocation, load, showToast]);

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
          <Feather name="edit-2" size={13} color={colors.mutedForeground} />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Tap to edit • Swipe left to remove
          </Text>
        </View>
      )}

      <FlatList
        data={locations}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 20 }}
        renderItem={({ item }) => (
          <LocationRow item={item} colors={colors} onDelete={handleDelete} onEdit={openEditModal} />
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

      {/* EDIT MODAL */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setEditModalVisible(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="edit-3" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Location</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Current Name */}
            {editingLocation && (
              <View style={[styles.currentNameRow, { backgroundColor: colors.muted }]}>
                <Text style={[styles.currentNameLabel, { color: colors.mutedForeground }]}>Current name:</Text>
                <Text style={[styles.currentNameValue, { color: colors.foreground }]}>{editingLocation.name}</Text>
              </View>
            )}

            {/* Edit Input */}
            <Text style={[styles.modalInputLabel, { color: colors.mutedForeground }]}>New Name</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  color: colors.foreground,
                  borderColor: editError ? "#C62828" : colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              value={editName}
              onChangeText={(text) => {
                setEditName(text);
                setEditError("");
              }}
              placeholder="Enter new location name"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleEditSave}
            />

            {/* Error */}
            {editError ? (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={14} color="#C62828" />
                <Text style={styles.errorText}>{editError}</Text>
              </View>
            ) : (
              <Text style={[styles.modalHint, { color: colors.mutedForeground }]}>
                All trips and rate entries referencing this location will be updated automatically.
              </Text>
            )}

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setEditModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.saveBtn,
                  { backgroundColor: editName.trim() && editName.trim() !== editingLocation?.name ? colors.primary : colors.muted },
                ]}
                onPress={handleEditSave}
                activeOpacity={0.8}
                disabled={!editName.trim() || editName.trim() === editingLocation?.name}
              >
                <Feather
                  name="check"
                  size={18}
                  color={editName.trim() && editName.trim() !== editingLocation?.name ? "#FFF" : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.saveBtnText,
                    { color: editName.trim() && editName.trim() !== editingLocation?.name ? "#FFF" : colors.mutedForeground },
                  ]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  // Modal styles
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: {
    width: "88%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },

  currentNameRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  currentNameLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  currentNameValue: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },

  modalInputLabel: { fontSize: 12, fontFamily: "Inter_500Medium", fontWeight: "500", letterSpacing: 0.3, marginBottom: -8 },
  modalInput: { paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, borderWidth: 1, fontSize: 15, fontFamily: "Inter_400Regular" },

  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -8 },
  errorText: { color: "#C62828", fontSize: 13, fontFamily: "Inter_400Regular" },

  modalHint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginTop: -8 },

  modalButtons: { flexDirection: "row", gap: 12, marginTop: 4 },
  modalBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  cancelBtn: { borderWidth: 1 },
  cancelBtnText: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  saveBtn: {},
  saveBtnText: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});
