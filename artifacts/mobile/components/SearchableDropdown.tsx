import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface Props {
  items: string[];
  onSelect: (value: string) => void;
  selectedValue: string;
  placeholder: string;
  label?: string;
  onAddNew?: (value: string) => void;
}

export default function SearchableDropdown({
  items,
  onSelect,
  selectedValue,
  placeholder,
  label,
  onAddNew,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return items;
    return items.filter((item) =>
      item.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const canAddNew =
    !!onAddNew &&
    search.trim().length > 0 &&
    !items.some((i) => i.toLowerCase() === search.trim().toLowerCase());

  const handleSelect = (value: string) => {
    onSelect(value);
    setSearch("");
    setVisible(false);
  };

  const handleAddNew = () => {
    if (onAddNew && search.trim()) {
      onAddNew(search.trim());
      onSelect(search.trim());
      setSearch("");
      setVisible(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <>
      {label ? (
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {label}
        </Text>
      ) : null}
      <TouchableOpacity
        style={[
          styles.trigger,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.triggerText,
            { color: selectedValue ? colors.foreground : colors.mutedForeground },
          ]}
          numberOfLines={1}
        >
          {selectedValue || placeholder}
        </Text>
        <Feather name="chevron-down" size={20} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={[styles.overlay, { paddingTop: topPad }]}>
          <View
            style={[styles.sheet, { backgroundColor: colors.background }]}
          >
            <View
              style={[
                styles.sheetHeader,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text
                style={[styles.sheetTitle, { color: colors.foreground }]}
              >
                {label || placeholder}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSearch("");
                  setVisible(false);
                }}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Feather name="x" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                  margin: 12,
                },
              ]}
            >
              <Feather
                name="search"
                size={18}
                color={colors.mutedForeground}
              />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Search..."
                placeholderTextColor={colors.mutedForeground}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Feather
                    name="x-circle"
                    size={18}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                canAddNew ? (
                  <TouchableOpacity
                    style={[
                      styles.addNewRow,
                      { borderBottomColor: colors.border },
                    ]}
                    onPress={handleAddNew}
                  >
                    <Feather
                      name="plus-circle"
                      size={18}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        styles.addNewText,
                        { color: colors.primary },
                      ]}
                    >
                      Add &quot;{search.trim()}&quot;
                    </Text>
                  </TouchableOpacity>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.item,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor:
                        item === selectedValue
                          ? colors.secondary
                          : "transparent",
                    },
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text
                    style={[styles.itemText, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {item}
                  </Text>
                  {item === selectedValue ? (
                    <Feather name="check" size={18} color={colors.primary} />
                  ) : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text
                    style={[
                      styles.emptyText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    No results found
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
    marginTop: 4,
    fontFamily: "Inter_500Medium",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  triggerText: {
    fontSize: 15,
    flex: 1,
    fontFamily: "Inter_400Regular",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "80%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  list: { maxHeight: 420 },
  addNewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addNewText: {
    fontSize: 15,
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    fontSize: 15,
    flex: 1,
    fontFamily: "Inter_400Regular",
  },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
