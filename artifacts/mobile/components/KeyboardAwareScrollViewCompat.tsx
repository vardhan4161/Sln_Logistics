import React from "react";
import { Platform, ScrollView, ScrollViewProps, KeyboardAvoidingView } from "react-native";

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  ...props
}: ScrollViewProps) {
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{ flex: 1 }}
    >
      <ScrollView keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
