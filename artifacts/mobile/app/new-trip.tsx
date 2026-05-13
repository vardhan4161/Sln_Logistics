import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SearchableDropdown from "@/components/SearchableDropdown";
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [weight, setWeight] = useState("");
  const [rate, setRate] = useState("");
  const [hamali, setHamali] = useState("");
  const [saving, setSaving] = useState(false);

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
      Alert.alert(
        "Missing Fields",
        "Please select From Location, To Location, and Vehicle Number."
      );
      return;
    }
    if (!weight || parseFloat(weight) <= 0) {
      Alert.alert("Invalid Weight", "Please enter a valid chargeable weight.");
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
      Alert.alert("Saved!", "Trip entry saved successfully.", [
        { text: "New Entry", onPress: resetForm },
        { text: "Go Back", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Error", "Failed to save trip. Please try again.");
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
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
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
      <TouchableOpacity
        style={[
          styles.dateRow,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => setShowDatePicker(true)}
        activeOpacity={0.7}
      >
        <Feather name="calendar" size={18} color={colors.primary} />
        <Text style={[styles.dateText, { color: colors.foreground }]}>
          {formatDate(date)}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={new Date()}
          onChange={(_event, selectedDate) => {
            if (Platform.OS !== "ios") setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}
      {showDatePicker && Platform.OS === "ios" && (
        <TouchableOpacity
          style={[
            styles.dateConfirm,
            { backgroundColor: colors.primary },
          ]}
          onPress={() => setShowDatePicker(false)}
        >
          <Text style={styles.dateConfirmText}>Done</Text>
        </TouchableOpacity>
      )}

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
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
    marginTop: 4,
    fontFamily: "Inter_500Medium",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  dateText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  dateConfirm: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  dateConfirmText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
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
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
