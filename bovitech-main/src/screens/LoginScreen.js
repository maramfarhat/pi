import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  StatusBar,
} from 'react-native';
import { colors } from '../theme/colors';
import { t } from '../i18n';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = () => {
  navigation.replace('Home');
};

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar backgroundColor={colors.green} barStyle="light-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Header ── */}
        <View style={styles.hero}>
          <View style={styles.heroPattern}>
            <View style={[styles.circle, styles.c1]} />
            <View style={[styles.circle, styles.c2]} />
            <View style={[styles.circle, styles.c3]} />
          </View>
          <View style={styles.logoWrap}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>🐄</Text>
            </View>
            <Text style={styles.logoText}>BoviTech</Text>
            <Text style={styles.logoTagline}>{t('auth.tagline')}</Text>
          </View>
        </View>

        {/* ── Form Card ── */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{t('auth.loginTitle')}</Text>
          <Text style={styles.formSub}>{t('auth.loginSub')}</Text>

          {/* Error */}
          {error !== '' && (
            <Animated.View
              style={[styles.errorBox, { transform: [{ translateX: shakeAnim }] }]}
            >
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </Animated.View>
          )}

          {/* Email */}
          <Text style={styles.label}>{t('auth.email')}</Text>
          <View style={[styles.inputWrapper, focusedField === 'email' && styles.inputFocused]}>
            <Text style={styles.inputIcon}>📧</Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.emailPh')}
              placeholderTextColor={colors.grayMid}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Password */}
          <Text style={styles.label}>{t('auth.password')}</Text>
          <View style={[styles.inputWrapper, focusedField === 'password' && styles.inputFocused]}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.passwordPh')}
              placeholderTextColor={colors.grayMid}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* Forgot password */}
          <TouchableOpacity style={styles.forgotWrap}>
            <Text style={styles.forgotText}>{t('auth.forgot')}</Text>
          </TouchableOpacity>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>{t('auth.login')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Register link ── */}
        <View style={styles.registerWrap}>
          <Text style={styles.registerText}>{t('auth.noAccount')} </Text>
          <TouchableOpacity onPress={() => navigation?.navigate('Register')}>
            <Text style={styles.registerLink}>{t('auth.createAccount')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Bottom info ── */}
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomInfoText}>{t('auth.secureInfo')}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, paddingBottom: 32 },

  hero: {
    backgroundColor: colors.green,
    paddingTop: 60,
    paddingBottom: 48,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroPattern: { position: 'absolute', inset: 0 },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  c1: { width: 200, height: 200, top: -60, right: -40 },
  c2: { width: 140, height: 140, bottom: -30, left: -30 },
  c3: { width: 80, height: 80, top: 20, left: 30 },
  logoWrap: { alignItems: 'center', zIndex: 1 },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoEmoji: { fontSize: 36 },
  logoText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  logoTagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
    letterSpacing: 0.2,
  },

  formCard: {
    backgroundColor: colors.card,
    marginHorizontal: 20,
    marginTop: -24,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.divider,
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 6,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  formSub: { fontSize: 13, color: colors.textMuted, marginBottom: 20 },

  errorBox: {
    backgroundColor: colors.redLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: '#f7c1c1',
  },
  errorText: { fontSize: 13, color: colors.red, fontWeight: '600' },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 50,
  },
  inputFocused: {
    borderColor: colors.green,
    borderWidth: 1.5,
    backgroundColor: colors.greenLight,
  },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: colors.text, height: '100%' },
  eyeBtn: { padding: 4 },
  eyeIcon: { fontSize: 16 },

  forgotWrap: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 20 },
  forgotText: { fontSize: 12, color: colors.green, fontWeight: '600' },

  submitBtn: {
    backgroundColor: colors.green,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  registerWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  registerText: { fontSize: 13, color: colors.textMuted },
  registerLink: { fontSize: 13, color: colors.green, fontWeight: '700' },

  bottomInfo: { alignItems: 'center', marginTop: 16 },
  bottomInfoText: { fontSize: 11, color: colors.textMuted },
});