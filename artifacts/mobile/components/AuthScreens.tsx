import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Switch, KeyboardAvoidingView, Platform, Easing } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useColors } from '../hooks/useColors';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export function SetupScreen() {
  const { setup, hasBiometrics } = useAuth();
  const colors = useColors();
  
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [useBiometrics, setUseBiometrics] = useState(true);
  const [error, setError] = useState('');

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        setError('Please enter your name');
        return;
      }
      setError('');
      setStep(2);
    } else if (step === 2) {
      if (pin.length !== 4) {
        setError('PIN must be 4 digits');
        return;
      }
      setError('');
      setStep(3);
    } else if (step === 3) {
      if (pin !== confirmPin) {
        setError('PINs do not match');
        setConfirmPin('');
        return;
      }
      setup(name.trim(), pin, hasBiometrics && useBiometrics);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
            <Feather name="shield" size={32} color="#FFF" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Welcome to SLN</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {step === 1 && "Let's start with your name"}
            {step === 2 && "Create a 4-digit PIN to secure your app"}
            {step === 3 && "Confirm your PIN to finish setup"}
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {step === 1 && (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>YOUR NAME</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={name}
              onChangeText={(text) => { setName(text); setError(''); }}
              placeholder="e.g. Vardhan"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
          </View>
        )}

        {(step === 2 || step === 3) && (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              {step === 2 ? 'ENTER PIN' : 'CONFIRM PIN'}
            </Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, textAlign: 'center', fontSize: 24, letterSpacing: 10 }]}
              value={step === 2 ? pin : confirmPin}
              onChangeText={(text) => {
                const numeric = text.replace(/[^0-9]/g, '');
                if (numeric.length <= 4) {
                  step === 2 ? setPin(numeric) : setConfirmPin(numeric);
                  setError('');
                }
              }}
              keyboardType="number-pad"
              secureTextEntry
              autoFocus
            />
          </View>
        )}

        {step === 3 && hasBiometrics && (
          <View style={[styles.switchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.switchLabelWrap}>
              <Text style={[styles.switchTitle, { color: colors.foreground }]}>Enable Biometrics</Text>
              <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>Unlock with fingerprint or face</Text>
            </View>
            <Switch
              value={useBiometrics}
              onValueChange={setUseBiometrics}
              trackColor={{ false: colors.muted, true: colors.primary }}
            />
          </View>
        )}

        <TouchableOpacity 
          style={[styles.btn, { backgroundColor: colors.primary }]} 
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>{step === 3 ? 'Finish Setup' : 'Continue'}</Text>
          <Feather name="arrow-right" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export function LockScreen() {
  const { userName, login, loginWithBiometrics, biometricEnabled } = useAuth();
  const colors = useColors();
  
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Trigger biometric prompt automatically on mount if enabled
  useEffect(() => {
    if (biometricEnabled) {
      handleBiometric();
    }
  }, [biometricEnabled]);

  const triggerShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const handleKeyPress = (num: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(false);
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(false);
    setPin(prev => prev.slice(0, -1));
  };

  const verifyPin = async (enteredPin: string) => {
    const success = await login(enteredPin);
    if (!success) {
      setError(true);
      triggerShake();
      setTimeout(() => setPin(''), 300);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleBiometric = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await loginWithBiometrics();
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={styles.lockTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.welcomeBack}>Welcome back,</Text>
        <Text style={styles.lockName}>{userName}</Text>
      </View>

      <Animated.View style={[styles.pinDots, { transform: [{ translateX: shakeAnim }] }]}>
        {[0, 1, 2, 3].map((i) => (
          <View 
            key={i} 
            style={[
              styles.dot, 
              { 
                backgroundColor: i < pin.length ? '#FFF' : 'transparent',
                borderColor: error ? '#FF5252' : '#FFF'
              }
            ]} 
          />
        ))}
      </Animated.View>

      <Text style={[styles.errorMsg, { opacity: error ? 1 : 0 }]}>Incorrect PIN</Text>

      <View style={styles.keypad}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
        ].map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.keypadRow}>
            {row.map(num => (
              <TouchableOpacity key={num} style={styles.key} onPress={() => handleKeyPress(num)} activeOpacity={0.6}>
                <Text style={styles.keyText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={styles.keypadRow}>
          <TouchableOpacity style={styles.key} onPress={handleBiometric} disabled={!biometricEnabled} activeOpacity={0.6}>
            {biometricEnabled ? <Feather name="loader" size={28} color="#FFF" /> : null} 
            {/* Using a placeholder for biometric icon; 'loader' or we can conditionally render 'fingerprint' if we had it. Let's use Feather 'user-check' or 'unlock' */}
          </TouchableOpacity>
          <TouchableOpacity style={styles.key} onPress={() => handleKeyPress('0')} activeOpacity={0.6}>
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.key} onPress={handleDelete} activeOpacity={0.6}>
            <Feather name="delete" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 24, gap: 24 },
  
  header: { alignItems: 'center', gap: 12, marginBottom: 12 },
  iconBox: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', fontWeight: '700' },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  
  inputGroup: { gap: 8 },
  label: { fontSize: 12, fontFamily: 'Inter_600SemiBold', fontWeight: '600', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, fontFamily: 'Inter_400Regular' },
  
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderWidth: 1, borderRadius: 12 },
  switchLabelWrap: { flex: 1 },
  switchTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
  switchSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 18, borderRadius: 14, marginTop: 12 },
  btnText: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
  
  errorText: { color: '#D32F2F', textAlign: 'center', fontFamily: 'Inter_500Medium' },

  // Lock Screen Styles
  lockTop: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 40 },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  avatarText: { color: '#FFF', fontSize: 30, fontFamily: 'Inter_700Bold' },
  welcomeBack: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontFamily: 'Inter_400Regular' },
  lockName: { color: '#FFF', fontSize: 28, fontFamily: 'Inter_700Bold', fontWeight: '700', marginTop: 4 },
  
  pinDots: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 10 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  
  errorMsg: { color: '#FF5252', textAlign: 'center', fontFamily: 'Inter_500Medium', marginBottom: 30 },
  
  keypad: { paddingHorizontal: 40, paddingBottom: 60, gap: 16 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between' },
  key: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  keyText: { color: '#FFF', fontSize: 28, fontFamily: 'Inter_400Regular' },
});
