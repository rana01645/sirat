// app/auth.tsx
// Login & Registration screen — accessible from profile tab.

import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/shared/providers/AuthProvider';
import { supabase } from '@/src/shared/lib/supabase';
import { colors, fonts } from '@/src/shared/lib/theme';

type Mode = 'login' | 'register' | 'forgot';

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, signUp, isRecovery, updatePassword, clearRecovery } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError('ইমেইল দিন');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: 'https://sirat.bd',
        });
        if (err) {
          setError(translateError(err.message));
        } else {
          setSuccess('পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে! ইমেইল চেক করুন।');
        }
      } catch {
        setError('কিছু সমস্যা হয়েছে, আবার চেষ্টা করুন');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password.trim()) {
      setError('পাসওয়ার্ড দিন');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('পাসওয়ার্ড মিলছে না');
      return;
    }

    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email.trim(), password);
        if (err) {
          setError(err);
        } else {
          router.back();
        }
      } else {
        const { error: err } = await signUp(email.trim(), password);
        if (err) {
          setError(err);
        } else {
          setSuccess('অ্যাকাউন্ট তৈরি হয়েছে! ইমেইল যাচাই করে লগইন করুন।');
          setMode('login');
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch {
      setError('কিছু সমস্যা হয়েছে, আবার চেষ্টা করুন');
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async () => {
    setError(null);
    setSuccess(null);
    if (!newPassword.trim()) {
      setError('নতুন পাসওয়ার্ড দিন');
      return;
    }
    if (newPassword.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('পাসওয়ার্ড মিলছে না');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await updatePassword(newPassword);
      if (err) {
        setError(err);
      } else {
        setSuccess('পাসওয়ার্ড আপডেট হয়েছে!');
        clearRecovery();
        setTimeout(() => router.back(), 1500);
      }
    } catch {
      setError('কিছু সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  // If recovery mode, show password reset form
  if (isRecovery) {
    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandSection}>
            <Text style={styles.brandArabic}>صراط</Text>
            <Text style={styles.brandName}>সিরাত</Text>
            <Text style={styles.brandTagline}>নতুন পাসওয়ার্ড সেট করুন</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>নতুন পাসওয়ার্ড</Text>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.midnight[300]} />
                <TextInput
                  style={styles.input}
                  placeholder="কমপক্ষে ৬ অক্ষর"
                  placeholderTextColor={colors.midnight[200]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.midnight[300]}
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>পাসওয়ার্ড নিশ্চিত করুন</Text>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.midnight[300]} />
                <TextInput
                  style={styles.input}
                  placeholder="আবার পাসওয়ার্ড দিন"
                  placeholderTextColor={colors.midnight[200]}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#D32F2F" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {success && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={18} color={colors.sakina[600]} />
                <Text style={styles.successText}>{success}</Text>
              </View>
            )}

            <Pressable
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSetNewPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>পাসওয়ার্ড আপডেট করুন</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.midnight[600]} />
        </Pressable>

        {/* Logo / branding */}
        <View style={styles.brandSection}>
          <Text style={styles.brandArabic}>صراط</Text>
          <Text style={styles.brandName}>সিরাত</Text>
          <Text style={styles.brandTagline}>
            {mode === 'login' ? 'আপনার অ্যাকাউন্টে লগইন করুন' : mode === 'register' ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'পাসওয়ার্ড রিসেট করুন'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ইমেইল</Text>
            <View style={styles.inputBox}>
              <Ionicons name="mail-outline" size={20} color={colors.midnight[300]} />
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={colors.midnight[200]}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          {/* Password (hidden in forgot mode) */}
          {mode !== 'forgot' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>পাসওয়ার্ড</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.midnight[300]} />
                  <TextInput
                    style={styles.input}
                    placeholder="কমপক্ষে ৬ অক্ষর"
                    placeholderTextColor={colors.midnight[200]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.midnight[300]}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Confirm password (register only) */}
              {mode === 'register' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>পাসওয়ার্ড নিশ্চিত করুন</Text>
                  <View style={styles.inputBox}>
                    <Ionicons name="lock-closed-outline" size={20} color={colors.midnight[300]} />
                    <TextInput
                      style={styles.input}
                      placeholder="আবার পাসওয়ার্ড দিন"
                      placeholderTextColor={colors.midnight[200]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                    />
                  </View>
                </View>
              )}
            </>
          )}

          {/* Error / Success */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#D32F2F" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {success && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={18} color={colors.sakina[600]} />
              <Text style={styles.successText}>{success}</Text>
            </View>
          )}

          {/* Submit */}
          <Pressable
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'login' ? 'লগইন' : mode === 'register' ? 'অ্যাকাউন্ট তৈরি করুন' : 'রিসেট লিংক পাঠান'}
              </Text>
            )}
          </Pressable>

          {/* Toggle mode */}
          <Pressable style={styles.toggleRow} onPress={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
            setSuccess(null);
          }}>
            <Text style={styles.toggleText}>
              {mode === 'login' ? 'অ্যাকাউন্ট নেই? ' : 'অ্যাকাউন্ট আছে? '}
            </Text>
            <Text style={styles.toggleLink}>
              {mode === 'login' ? 'রেজিস্ট্রেশন করুন' : 'লগইন করুন'}
            </Text>
          </Pressable>

          {/* Forgot password */}
          {mode === 'login' && (
            <Pressable style={styles.toggleRow} onPress={() => {
              setMode('forgot');
              setError(null);
              setSuccess(null);
            }}>
              <Text style={styles.toggleLink}>পাসওয়ার্ড ভুলে গেছেন?</Text>
            </Pressable>
          )}
          {mode === 'forgot' && (
            <Pressable style={styles.toggleRow} onPress={() => {
              setMode('login');
              setError(null);
              setSuccess(null);
            }}>
              <Text style={styles.toggleLink}>← লগইনে ফিরে যান</Text>
            </Pressable>
          )}
        </View>

        {/* Info note */}
        <View style={styles.infoNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.midnight[300]} />
          <Text style={styles.infoText}>
            লগইন করলে আপনার অগ্রগতি সব ডিভাইসে সিঙ্ক হবে। লগইন ছাড়াও অ্যাপ ব্যবহার করা যায়।
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.nur[50],
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backBtn: {
    paddingTop: 56,
    paddingBottom: 8,
    alignSelf: 'flex-start',
  },
  brandSection: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  brandArabic: {
    fontSize: 48,
    color: colors.sakina[600],
    marginBottom: 4,
  },
  brandName: {
    fontSize: 24,
    fontFamily: fonts.bengaliBold,
    color: colors.midnight[800],
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 14,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: fonts.bengaliMedium,
    color: colors.midnight[600],
    marginLeft: 4,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.nur[200],
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.midnight[700],
    padding: 0,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDECEA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.bengali,
    color: '#D32F2F',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.sakina[50],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.bengali,
    color: colors.sakina[700],
  },
  submitBtn: {
    backgroundColor: colors.sakina[600],
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: fonts.bengaliBold,
    color: colors.white,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  toggleText: {
    fontSize: 14,
    fontFamily: fonts.bengali,
    color: colors.midnight[400],
  },
  toggleLink: {
    fontSize: 14,
    fontFamily: fonts.bengaliBold,
    color: colors.sakina[600],
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 32,
    paddingHorizontal: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.bengali,
    color: colors.midnight[300],
    lineHeight: 18,
  },
});
