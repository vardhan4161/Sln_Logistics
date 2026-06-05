import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SQLiteProvider } from "expo-sqlite";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { DatabaseProvider, initDB } from "../contexts/DatabaseContext";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { SetupScreen, LockScreen } from "../components/AuthScreens";

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
      <Stack.Screen
        name="locations"
        options={{ title: "Manage Locations" }}
      />
      <Stack.Screen name="vehicles" options={{ title: "Manage Vehicles" }} />
      <Stack.Screen
        name="generate-excel"
        options={{ title: "Generate Excel" }}
      />
    </Stack>
  );
}

function MainApp() {
  const { isAuthenticated, isFirstLaunch, isLoading } = useAuth();

  if (isLoading) return null;

  if (isFirstLaunch) {
    return <SetupScreen />;
  }

  if (!isAuthenticated) {
    return <LockScreen />;
  }

  return <RootLayoutNav />;
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
        <SQLiteProvider databaseName="sln_logistics.db" onInit={initDB}>
          <AuthProvider>
            <DatabaseProvider>
              <QueryClientProvider client={queryClient}>
                <GestureHandlerRootView>
                  <MainApp />
                </GestureHandlerRootView>
              </QueryClientProvider>
            </DatabaseProvider>
          </AuthProvider>
        </SQLiteProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
