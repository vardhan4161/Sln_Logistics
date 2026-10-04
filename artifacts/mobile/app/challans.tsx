import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DatePickerField from "../components/DatePickerField";
import SearchableDropdown from "../components/SearchableDropdown";
import Toast from "../components/Toast";
import { useDB } from "../contexts/DatabaseContext";
import { useColors } from "../hooks/useColors";

function formatDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export default function ChallansScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getChallans, addChallan, deleteChallan, getLocations, getVehicles } = useDB();
  const [challans, setChallans] = useState(getChallans());
  const [date, setDate] = useState(new Date());
  const [challanNo, setChallanNo] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [consignee, setConsignee] = useState("");
  const [material, setMaterial] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" | "info" });

  useFocusEffect(useCallback(() => setChallans(getChallans()), [getChallans]));
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => setToast({ visible: true, message, type });
  const reset = () => {
    setDate(new Date()); setChallanNo(""); setVehicleNo(""); setFromLocation(""); setToLocation("");
    setConsignee(""); setMaterial(""); setQuantity(""); setNotes("");
  };
  const save = () => {
    if (!challanNo.trim() || !vehicleNo || !fromLocation || !toLocation) {
      showToast("Enter challan number, vehicle, from and to locations.", "error"); return;
    }
    const numericQuantity = Number(quantity || 0);
    if (!Number.isFinite(numericQuantity) || numericQuantity < 0) {
      showToast("Enter a valid quantity.", "error"); return;
    }
    setSaving(true);
    try {
      const existing = getChallans().find((item) => item.challan_no === challanNo.trim());
      if (existing) { showToast(`Challan ${challanNo.trim()} already exists.`, "info"); return; }
      addChallan({
        challan_no: challanNo.trim(), date: formatDate(date), vehicle_no: vehicleNo,
        from_location: fromLocation, to_location: toLocation, consignee: consignee.trim(),
        material: material.trim(), quantity: numericQuantity, notes: notes.trim(),
      });
      setChallans(getChallans());
      reset();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Challan saved successfully.");
    } finally { setSaving(false); }
  };
  const remove = (id: number, number: string) => Alert.alert("Delete challan?", `Challan ${number} will be removed.`, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => { deleteChallan(id); setChallans(getChallans()); } },
  ]);
  const input = (label: string, value: string, onChangeText: (value: string) => void, placeholder: string) => (
    <View><Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text><TextInput
      value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground}
      style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
    /></View>
  );

  return <View style={[styles.root, { backgroundColor: colors.background }]}>
    <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast((old) => ({ ...old, visible: false }))} />
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={24} color={colors.foreground} /></TouchableOpacity>
      <View style={{ flex: 1 }}><Text style={[styles.title, { color: colors.foreground }]}>Challans</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Add and track transport delivery challans</Text></View>
    </View>
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: (Platform.OS === "web" ? 32 : insets.bottom) + 32 }} keyboardShouldPersistTaps="handled">
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>NEW CHALLAN</Text>
        {input("Challan Number *", challanNo, setChallanNo, "e.g. CH-001")}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Date *</Text><DatePickerField date={date} onChange={setDate} />
        <SearchableDropdown items={getVehicles().map((item) => item.vehicle_no)} onSelect={setVehicleNo} selectedValue={vehicleNo} placeholder="Select vehicle" label="Vehicle Number *" />
        <SearchableDropdown items={getLocations().map((item) => item.name)} onSelect={setFromLocation} selectedValue={fromLocation} placeholder="Select origin" label="From Location *" />
        <SearchableDropdown items={getLocations().map((item) => item.name)} onSelect={setToLocation} selectedValue={toLocation} placeholder="Select destination" label="To Location *" />
        {input("Consignee", consignee, setConsignee, "Customer / receiver")}
        {input("Material", material, setMaterial, "Goods description")}
        {input("Quantity", quantity, setQuantity, "0.00")}
        {input("Notes", notes, setNotes, "Optional remarks")}
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]} onPress={save} disabled={saving}>
          <Feather name="save" size={18} color="#FFF" /><Text style={styles.saveText}>{saving ? "Saving…" : "Save Challan"}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 8 }]}>SAVED CHALLANS ({challans.length})</Text>
      {challans.length === 0 ? <View style={[styles.empty, { borderColor: colors.border }]}><Feather name="file-text" size={20} color={colors.mutedForeground} /><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No challans added yet.</Text></View> : challans.map((item) => <View key={item.id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{item.challan_no}</Text><Text style={[styles.rowText, { color: colors.mutedForeground }]}>{item.date} · {item.vehicle_no}</Text><Text style={[styles.rowText, { color: colors.mutedForeground }]}>{item.from_location} → {item.to_location}</Text></View>
        <TouchableOpacity onPress={() => remove(item.id, item.challan_no)}><Feather name="trash-2" size={18} color="#C62828" /></TouchableOpacity>
      </View>)}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, header: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" }, subtitle: { fontSize: 12, marginTop: 2 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12, marginBottom: 20 }, sectionTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 1, fontFamily: "Inter_700Bold", marginBottom: 2 },
  label: { fontSize: 12, marginBottom: 5, fontFamily: "Inter_500Medium" }, input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  saveButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10, paddingVertical: 14, marginTop: 4 }, saveText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 10 }, rowTitle: { fontSize: 15, fontWeight: "700" }, rowText: { fontSize: 12, marginTop: 3 }, empty: { alignItems: "center", gap: 8, borderWidth: 1, borderStyle: "dashed", borderRadius: 12, padding: 24, marginTop: 10 }, emptyText: { fontSize: 13 },
});
