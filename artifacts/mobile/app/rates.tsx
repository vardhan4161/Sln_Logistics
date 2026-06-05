import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert, FlatList, Modal, Platform, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SearchableDropdown from "../components/SearchableDropdown";
import Toast from "../components/Toast";
import { Route, useDB } from "../contexts/DatabaseContext";
import { useColors } from "../hooks/useColors";

export default function RatesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getRoutes, addRoute, updateRoute, deleteRoute, getLocations } = useDB();

  const [routes, setRoutes] = useState<Route[]>(() => getRoutes());
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Route | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: "success" | "error" | "info" }>({ visible: false, message: "", type: "success" });

  const locationList = getLocations().map((l) => l.name);

  const [form, setForm] = useState({ from_location: "", to_location: "", weight_mt: "", rate: "", hamali: "" });

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ visible: true, message, type });
  }, []);

  const reload = () => setRoutes(getRoutes());

  const openAdd = () => {
    setEditing(null);
    setForm({ from_location: "", to_location: "", weight_mt: "", rate: "", hamali: "" });
    setModalVisible(true);
  };

  const openEdit = (r: Route) => {
    setEditing(r);
    setForm({
      from_location: r.from_location,
      to_location: r.to_location,
      weight_mt: String(r.weight_mt),
      rate: String(r.rate),
      hamali: String(r.hamali),
    });
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!form.from_location || !form.to_location || !form.weight_mt || !form.rate) {
      showToast("Please fill all required fields.", "error");
      return;
    }
    const data = {
      from_location: form.from_location,
      to_location: form.to_location,
      weight_mt: parseFloat(form.weight_mt),
      rate: parseFloat(form.rate),
      hamali: parseFloat(form.hamali) || 0,
    };
    if (editing) {
      updateRoute(editing.id, data);
      showToast("Rate updated!", "success");
    } else {
      addRoute(data);
      showToast("Rate added!", "success");
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
    reload();
  };

  const handleDelete = (r: Route) => {
    Alert.alert("Delete Rate", `Remove ${r.from_location} → ${r.to_location} (${r.weight_mt}MT)?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: () => {
          deleteRoute(r.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          reload();
          showToast("Rate deleted.", "info");
        }
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast(p => ({ ...p, visible: false }))} />

      <FlatList
        data={routes}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 14, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 80, gap: 10 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="map" size={38} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No rates yet. Tap + to add.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />
            <View style={styles.cardContent}>
              <View style={styles.routeRow}>
                <Text style={[styles.loc, { color: colors.foreground }]} numberOfLines={1}>{item.from_location}</Text>
                <Feather name="arrow-right" size={14} color={colors.primary} />
                <Text style={[styles.loc, { color: colors.foreground }]} numberOfLines={1}>{item.to_location}</Text>
              </View>
              <View style={styles.chips}>
                <View style={[styles.chip, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.chipText, { color: colors.primary }]}>{item.weight_mt} MT</Text>
                </View>
                <View style={[styles.chip, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.chipText, { color: colors.primary }]}>₹{item.rate} Rate</Text>
                </View>
                <View style={[styles.chip, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.chipText, { color: colors.primary }]}>₹{item.hamali} Hamali</Text>
                </View>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn} activeOpacity={0.7}>
                <Feather name="edit-2" size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn} activeOpacity={0.7}>
                <Feather name="trash-2" size={16} color="#C62828" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: (Platform.OS === "web" ? 34 : insets.bottom) + 16 }]}
        onPress={openAdd}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={26} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{editing ? "Edit Rate" : "Add Rate"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <SearchableDropdown items={locationList} onSelect={(v) => setForm(f => ({ ...f, from_location: v }))} selectedValue={form.from_location} placeholder="Select from location" label="From Location *" onAddNew={(v) => setForm(f => ({ ...f, from_location: v }))} />
            <SearchableDropdown items={locationList} onSelect={(v) => setForm(f => ({ ...f, to_location: v }))} selectedValue={form.to_location} placeholder="Select to location" label="To Location *" onAddNew={(v) => setForm(f => ({ ...f, to_location: v }))} />

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Weight (MT) *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} value={form.weight_mt} onChangeText={(v) => setForm(f => ({ ...f, weight_mt: v }))} keyboardType="decimal-pad" placeholder="e.g. 6" placeholderTextColor={colors.mutedForeground} />

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Rate (₹) *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} value={form.rate} onChangeText={(v) => setForm(f => ({ ...f, rate: v }))} keyboardType="decimal-pad" placeholder="e.g. 7500" placeholderTextColor={colors.mutedForeground} />

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Hamali (₹)</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} value={form.hamali} onChangeText={(v) => setForm(f => ({ ...f, hamali: v }))} keyboardType="decimal-pad" placeholder="e.g. 3600" placeholderTextColor={colors.mutedForeground} />

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} activeOpacity={0.85}>
              <Feather name="check" size={18} color="#FFF" />
              <Text style={styles.saveBtnText}>{editing ? "Update Rate" : "Add Rate"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { flexDirection: "row", borderRadius: 14, borderWidth: 1, overflow: "hidden", elevation: 1 },
  accentBar: { width: 4 },
  cardContent: { flex: 1, padding: 12, gap: 8 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  loc: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold", flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium", fontWeight: "500" },
  actions: { justifyContent: "center", gap: 4, paddingRight: 10 },
  actionBtn: { padding: 8 },
  fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 6 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 4 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  label: { fontSize: 13, fontWeight: "500", fontFamily: "Inter_500Medium", marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 4 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 16 },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
