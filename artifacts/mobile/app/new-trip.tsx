import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DatePickerField from "@/components/DatePickerField";
import SearchableDropdown from "@/components/SearchableDropdown";
import Toast from "@/components/Toast";
import { useDB } from "@/contexts/DatabaseContext";
import { useColors } from "@/hooks/useColors";

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function NewTripScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getLocations, getVehicles, addLocation, addVehicle, addTrip } =
    useDB();

  const [date, setDate] = useState(new Date());
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [weight, setWeight] = useState("");
  const [rate, setRate] = useState("");
  const [hamali, setHamali] = useState("");
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ visible: false, message: "", type: "success" });

  const postSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [locationList, setLocationList] = useState<string[]>(() =>
    getLocations().map((l) => l.name)
  );
  const [vehicleList, setVehicleList] = useState<string[]>(() =>
    getVehicles().map((v) => v.vehicle_no)
  );

  const totalFreight = useMemo(() => {
    const r = parseFloat(rate) || 0;
    const h = parseFloat(hamali) || 0;
    return r + h;
  }, [rate, hamali]);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      setToast({ visible: true, message, type });
    },
    []
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const resetForm = useCallback(() => {
    setDate(new Date());
    setFromLocation("");
    setToLocation("");
    setVehicleNo("");
    setWeight("");
    setRate("");
    setHamali("");
  }, []);

  const handleSave = useCallback(() => {
    if (!fromLocation || !toLocation || !vehicleNo) {
      showToast("Please fill From Location, To Location & Vehicle No.", "error");
      return;
    }
    if (!weight || parseFloat(weight) <= 0) {
      showToast("Please enter a valid chargeable weight.", "error");
      return;
    }
    setSaving(true);
    try {
      addTrip({
        trip_date: formatDate(date),
        from_location: fromLocation,
        to_location: toLocation,
        vehicle_no: vehicleNo,
        chargeable_weight: parseFloat(weight),
        rate: parseFloat(rate) || 0,
        hamali: parseFloat(hamali) || 0,
        total_freight: totalFreight,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Trip entry saved successfully!", "success");

      if (postSaveTimer.current) clearTimeout(postSaveTimer.current);
      postSaveTimer.current = setTimeout(() => {
        resetForm();
      }, 1800);
    } catch {
      showToast("Failed to save trip. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }, [
    fromLocation,
    toLocation,
    vehicleNo,
    weight,
    rate,
    hamali,
    date,
    totalFreight,
    addTrip,
    resetForm,
    showToast,
  ]);

  const handleAddLocation = useCallback(
    (name: string) => {
      addLocation(name);
      setLocationList(getLocations().map((l) => l.name));
    },
    [addLocation, getLocations]
  );

  const handleAddVehicle = useCallback(
    (vehicle_no: string) => {
      addVehicle(vehicle_no);
      setVehicleList(getVehicles().map((v) => v.vehicle_no));
    },
    [addVehicle, getVehicles]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={{
          padding: 16,
          paddingBottom:
            (Platform.OS === "web" ? 34 : insets.bottom) + 40,
        }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={16}
      >
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Date
        </Text>
        <DatePickerField date={date} onChange={setDate} />

        <SearchableDropdown
          items={locationList}
          onSelect={setFromLocation}
          selectedValue={fromLocation}
          placeholder="Select from location"
          label="From Location *"
          onAddNew={handleAddLocation}
        />

        <SearchableDropdown
          items={locationList}
          onSelect={setToLocation}
          selectedValue={toLocation}
          placeholder="Select to location"
          label="To Location *"
          onAddNew={handleAddLocation}
        />

        <SearchableDropdown
          items={vehicleList}
          onSelect={setVehicleNo}
          selectedValue={vehicleNo}
          placeholder="Select vehicle number"
          label="Vehicle Number *"
          onAddNew={handleAddVehicle}
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Chargeable Weight *
        </Text>
        <View
          style={[
            styles.inputSuffix,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TextInput
            style={[styles.flexInput, { color: colors.foreground }]}
            placeholder="0.00"
            placeholderTextColor={colors.mutedForeground}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
          />
          <Text style={[styles.suffix, { color: colors.mutedForeground }]}>
            MT
          </Text>
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Rate
        </Text>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          placeholder="0.00"
          placeholderTextColor={colors.mutedForeground}
          value={rate}
          onChangeText={setRate}
          keyboardType="decimal-pad"
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Hamali
        </Text>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          placeholder="0.00"
          placeholderTextColor={colors.mutedForeground}
          value={hamali}
          onChangeText={setHamali}
          keyboardType="decimal-pad"
        />

        <View
          style={[
            styles.totalBox,
            {
              backgroundColor: colors.secondary,
              borderColor: colors.primary,
            },
          ]}
        >
          <Text style={[styles.totalLabel, { color: colors.primary }]}>
            Total Freight (Auto-calculated)
          </Text>
          <Text style={[styles.totalAmount, { color: colors.primary }]}>
            ₹ {totalFreight.toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 },
          ]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Feather name="save" size={20} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>
            {saving ? "Saving..." : "Save Trip Entry"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.backBtn,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={[styles.backBtnText, { color: colors.mutedForeground }]}>
            Back to Home
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
    marginTop: 4,
    fontFamily: "Inter_500Medium",
  },
  inputSuffix: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    paddingRight: 14,
  },
  flexInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  suffix: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  textInput: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  totalBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 8,
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    marginRight: 8,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    borderRadius: 14,
    marginBottom: 12,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  backBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
  },
});
