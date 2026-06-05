import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

interface AuthContextType {
  isAuthenticated: boolean;
  isFirstLaunch: boolean;
  isLoading: boolean;
  userName: string;
  hasBiometrics: boolean;
  biometricEnabled: boolean;
  setup: (name: string, pin: string, enableBiometrics: boolean) => Promise<void>;
  login: (pin: string) => Promise<boolean>;
  loginWithBiometrics: () => Promise<boolean>;
  logout: () => void;
  updateUserName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PIN_KEY = '@app_pin';
const NAME_KEY = '@app_username';
const BIOMETRIC_KEY = '@app_biometric_enabled';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    async function checkAuthState() {
      try {
        const [storedPin, storedName, storedBiometric] = await Promise.all([
          AsyncStorage.getItem(PIN_KEY),
          AsyncStorage.getItem(NAME_KEY),
          AsyncStorage.getItem(BIOMETRIC_KEY),
        ]);

        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setHasBiometrics(hasHardware && isEnrolled);

        if (storedPin && storedName) {
          setIsFirstLaunch(false);
          setUserName(storedName);
          setBiometricEnabled(storedBiometric === 'true');
        } else {
          setIsFirstLaunch(true);
        }
      } catch (error) {
        console.error("Failed to load auth state", error);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuthState();
  }, []);

  const setup = useCallback(async (name: string, pin: string, enableBiometrics: boolean) => {
    await AsyncStorage.setItem(NAME_KEY, name);
    await AsyncStorage.setItem(PIN_KEY, pin);
    await AsyncStorage.setItem(BIOMETRIC_KEY, enableBiometrics ? 'true' : 'false');
    setUserName(name);
    setBiometricEnabled(enableBiometrics);
    setIsFirstLaunch(false);
    setIsAuthenticated(true);
  }, []);

  const login = useCallback(async (pin: string) => {
    const storedPin = await AsyncStorage.getItem(PIN_KEY);
    if (storedPin === pin) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const loginWithBiometrics = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock SLN Logistics',
        fallbackLabel: 'Use PIN',
      });
      if (result.success) {
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.warn("Biometric auth failed", error);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
  }, []);

  const updateUserName = useCallback(async (name: string) => {
    await AsyncStorage.setItem(NAME_KEY, name);
    setUserName(name);
  }, []);

  const value = useMemo(() => ({
    isAuthenticated,
    isFirstLaunch,
    isLoading,
    userName,
    hasBiometrics,
    biometricEnabled,
    setup,
    login,
    loginWithBiometrics,
    logout,
    updateUserName
  }), [isAuthenticated, isFirstLaunch, isLoading, userName, hasBiometrics, biometricEnabled, setup, login, loginWithBiometrics, logout, updateUserName]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
