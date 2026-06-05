import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DatePickerField from "../components/DatePickerField";
import SearchableDropdown from "../components/SearchableDropdown";
import Toast from "../components/Toast";
import { useDB } from "../contexts/DatabaseContext";
import { useColors } from "../hooks/useColors";

function parseDMY(str: string): Date {
  const p = str.split("/");
  if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
  return new Date(str);
}
function formatDMY(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function EditTripScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getTrips, updateTrip, getLocations, addLocation, getVehicles, addVehicle, lookupRouteRate } = useDB();

  const trip = useMemo(() => getTrips().find((t) => t.id === parseInt(id ?? "0")), [id]);
  const [tripDate, setTripDate] = useState<Date>(trip ? parseDMY(trip.trip_date) : new Date());
  const [fromLocation, setFromLocation] = useState(trip?.from_location ?? "");
  const [toLocation, setToLocation] = useState(trip?.to_location ?? "");
  const [vehicleNo, setVehicleNo] = useState(trip?.vehicle_no ?? "");
  const [weight, setWeight] = useState(trip ? String(trip.chargeable_weight) : "");
  const [rate, setRate] = useState(trip ? String(trip.rate) : "");
  const [hamali, setHamali] = useState(trip ? String(trip.hamali) : "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: "success" | "error" | "info" }>({ visible: false, message: "", type: "success" });

  // Prevents auto-rate from overwriting the existing trip's rate on first render
  const isFirstRender = useRef(true);

  const locations = getLocations().map((l) => l.name);
  const vehicles = getVehicles().map((v) => v.vehicle_no);
  const totalFreight = (parseFloat(rate) || 0) + (parseFloat(hamali) || 0);

  useEffect(() => {
    // Skip on mount — only auto-fill when user actively changes route/weight
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (fromLocation && toLocation && parseFloat(weight) > 0) {
      const found = lookupRouteRate(fromLocation, toLocation, parseFloat(weight));
      if (found) { setRate(String(found.rate)); setHamali(String(found.hamali)); }
    }
  }, [fromLocation, toLocation, weight]);

  if (!trip) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <Text style={{ color: colors.mutedForeground }}>Trip not found.</Text>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 32 }]}
      keyboardShouldPersistTaps="handled">
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast(p => ({ ...p, visible: false }))} />

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sec, { color: colors.foreground }]}><Feather name="calendar" size={14} color={colors.primary} />{"  "}Trip Date</Text>
        <DatePickerField date={tripDate} onChange={setTripDate} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sec, { color: colors.foreground }]}><Feather name="map-pin" size={14} color={colors.primary} />{"  "}Route</Text>
        <SearchableDropdown items={locations} onSelect={setFromLocation} selectedValue={fromLocation} placeholder="From location" label="From Location *" onAddNew={(v) => { addLocation(v); setFromLocation(v); }} />
        <SearchableDropdown items={locations} onSelect={setToLocation} selectedValue={toLocation} placeholder="To location" label="To Location *" onAddNew={(v) => { addLocation(v); setToLocation(v); }} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sec, { color: colors.foreground }]}><Feather name="truck" size={14} color={colors.primary} />{"  "}Load Details</Text>
        <SearchableDropdown items={vehicles} onSelect={setVehicleNo} selectedValue={vehicleNo} placeholder="Vehicle number" label="Vehicle Number *" onAddNew={(v) => { addVehicle(v); setVehicleNo(v); }} />
        <Text style={[styles.lbl, { color: colors.mutedForeground }]}>Chargeable Weight (MT) *</Text>
        <TextInput style={[styles.inp, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="e.g. 6" placeholderTextColor={colors.mutedForeground} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sec, { color: colors.foreground }]}><Feather name="dollar-sign" size={14} color={colors.primary} />{"  "}Freight</Text>
        <Text style={[styles.lbl, { color: colors.mutedForeground }]}>Rate (₹) *</Text>
        <TextInput style={[styles.inp, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="Auto-filled from route" placeholderTextColor={colors.mutedForeground} />
        <Text style={[styles.lbl, { color: colors.mutedForeground }]}>Hamali (₹)</Text>
        <TextInput style={[styles.inp, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} value={hamali} onChangeText={setHamali} keyboardType="decimal-pad" placeholder="Auto-filled from route" placeholderTextColor={colors.mutedForeground} />
        <View style={[styles.total, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <Text style={[styles.totalLbl, { color: colors.foreground }]}>Total Freight</Text>
          <Text style={[styles.totalVal, { color: colors.primary }]}>₹{totalFreight.toLocaleString("en-IN")}</Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.btn, { backgroundColor: saving ? "#888" : "#2E7D32" }]}
        onPress={useCallback(() => {
          if (!fromLocation || !toLocation || !vehicleNo || !weight || !rate) {
            setToast({ visible: true, message: "Fill all required fields.", type: "error" }); return;
          }
          setSaving(true);
          updateTrip(parseInt(id ?? "0"), {
            trip_date: formatDMY(tripDate), from_location: fromLocation, to_location: toLocation,
            vehicle_no: vehicleNo, chargeable_weight: parseFloat(weight), rate: parseFloat(rate),
            hamali: parseFloat(hamali) || 0, total_freight: totalFreight,
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setToast({ visible: true, message: "Trip updated!", type: "success" });
          setSaving(false);
          setTimeout(() => router.back(), 900);
        }, [fromLocation, toLocation, vehicleNo, weight, rate, hamali, tripDate, totalFreight, id, updateTrip])}
        disabled={saving} activeOpacity={0.85}>
        <Feather name="check" size={20} color="#FFF" />
        <Text style={styles.btnText}>{saving ? "Saving…" : "Save Changes"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  sec: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  lbl: { fontSize: 13, fontFamily: "Inter_500Medium", fontWeight: "500" },
  inp: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  total: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  totalLbl: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  totalVal: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 14 },
  btnText: { color: "#FFF", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
