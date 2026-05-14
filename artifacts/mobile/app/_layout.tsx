import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DatabaseProvider } from "@/contexts/DatabaseContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const HEADER_STYLE = {
  backgroundColor: "#1565C0",
} as const;

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: HEADER_STYLE,
        headerTintColor: "#FFFFFF",
        headerTitleStyle: {
          fontFamily: "Inter_600SemiBold",
          color: "#FFFFFF",
        },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="new-trip" options={{ title: "New Trip Entry" }} />
      <Stack.Screen name="trips" options={{ title: "View Trips" }} />
      <Stack.Screen name="edit-trip" options={{ title: "Edit Trip" }} />
      <Stack.Screen name="locations" options={{ title: "Manage Locations" }} />
      <Stack.Screen name="vehicles" options={{ title: "Manage Vehicles" }} />
      <Stack.Screen name="generate-excel" options={{ title: "Generate Excel" }} />
      <Stack.Screen name="invoice" options={{ title: "Generate Invoice" }} />
      <Stack.Screen name="rates" options={{ title: "Rate Table" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <DatabaseProvider>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </QueryClientProvider>
        </DatabaseProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
