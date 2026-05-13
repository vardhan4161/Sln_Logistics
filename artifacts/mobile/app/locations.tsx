import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Location, useDB } from "@/contexts/DatabaseContext";
import { useColors } from "@/hooks/useColors";

export default function LocationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getLocations, addLocation, deleteLocation } = useDB();
  const [locations, setLocations] = useState<Location[]>([]);
  const [newName, setNewName] = useState("");

  const load = useCallback(() => {
    setLocations(getLocations());
  }, [getLocations]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAdd = () => {
    if (!newName.trim()) return;
    const added = addLocation(newName);
    if (added) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setNewName("");
      load();
    } else {
      Alert.alert("Duplicate", "This location already exists.");
    }
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert("Delete Location", `Remove "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteLocation(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          load();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.addSection,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: colors.foreground,
              borderColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
          placeholder="Add new location..."
          placeholderTextColor={colors.mutedForeground}
          value={newName}
          onChangeText={setNewName}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={handleAdd}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={locations}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{
          paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 20,
        }}
        renderItem={({ item }) => (
          <View
            style={[styles.item, { borderBottomColor: colors.border }]}
          >
            <Feather name="map-pin" size={15} color={colors.primary} />
            <Text
              style={[styles.itemText, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <TouchableOpacity
              onPress={() => handleDelete(item.id, item.name)}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Feather name="trash-2" size={18} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="map-pin" size={52} color={colors.mutedForeground} />
            <Text
              style={[styles.emptyText, { color: colors.mutedForeground }]}
            >
              No locations yet
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
  addSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", paddingTop: 80, gap: 14 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
