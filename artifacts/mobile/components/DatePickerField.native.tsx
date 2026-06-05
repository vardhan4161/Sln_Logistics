import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "../hooks/useColors";

interface Props {
  date: Date;
  onChange: (date: Date) => void;
}

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function DatePickerField({ date, onChange }: Props) {
  const colors = useColors();
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.dateRow,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Feather name="calendar" size={18} color={colors.primary} />
        <Text style={[styles.dateText, { color: colors.foreground }]}>
          {formatDate(date)}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={new Date()}
          onChange={(_event, selectedDate) => {
            if (Platform.OS !== "ios") setShowPicker(false);
            if (selectedDate) onChange(selectedDate);
          }}
        />
      )}
      {showPicker && Platform.OS === "ios" && (
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowPicker(false)}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  doneBtn: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});
