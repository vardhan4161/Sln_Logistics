import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(formatDate(date));

  const handleCommit = (value: string) => {
    setEditing(false);
    const parts = value.split("/");
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y >= 1900) {
        const next = new Date(y, m - 1, d);
        if (!isNaN(next.getTime())) {
          onChange(next);
          setText(formatDate(next));
          return;
        }
      }
    }
    setText(formatDate(date));
  };

  return (
    <View
      style={[
        styles.dateRow,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Feather name="calendar" size={18} color={colors.primary} />
      {editing ? (
        <TextInput
          autoFocus
          style={[styles.input, { color: colors.foreground }]}
          value={text}
          onChangeText={setText}
          onBlur={() => handleCommit(text)}
          onSubmitEditing={() => handleCommit(text)}
          placeholder="DD/MM/YYYY"
          placeholderTextColor={colors.mutedForeground}
        />
      ) : (
        <TouchableOpacity style={styles.textBtn} onPress={() => setEditing(true)}>
          <Text style={[styles.dateText, { color: colors.foreground }]}>
            {formatDate(date)}
          </Text>
        </TouchableOpacity>
      )}
      <Feather name="edit-2" size={16} color={colors.mutedForeground} />
    </View>
  );
}

const styles = StyleSheet.create({
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  textBtn: { flex: 1 },
  dateText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 2,
  },
});
