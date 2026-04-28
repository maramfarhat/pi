import React, { useState } from 'react';
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
const ROLES = [
  { id: 'farmer', labelKey: 'auth.roleFarmer', icon: '🧑‍🌾' },
  { id: 'vet', labelKey: 'auth.roleVet', icon: '🩺' },
];

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1); // 2 étapes
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    farmName: '',
    farmSize: '',
    cowCount: '',
    role: 'farmer',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const validateStep1 = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = t('auth.required');
    if (!form.lastName.trim()) e.lastName = t('auth.required');
    if (!form.email.includes('@')) e.email = t('auth.invalidEmail');
    if (form.phone.length < 8) e.phone = t('auth.invalidPhone');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.farmName.trim()) e.farmName = t('auth.required');
    if (form.password.length < 6) e.password = t('auth.minPassword');
    if (form.password !== form.confirmPassword) e.confirmPassword = t('auth.passwordMismatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

const handleNext = () => {
  setStep(2);
};

const handleRegister = () => {
  navigation.replace('Home');
};

  const InputField = ({ label, fieldKey, placeholder, keyboardType, secure, showToggle, onToggle, multiline }) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          focusedField === fieldKey && styles.inputFocused,
          errors[fieldKey] && styles.inputError,
          multiline && { height: 80, alignItems: 'flex-start', paddingTop: 12 },
        ]}
      >
        <TextInput
          style={[styles.input, multiline && { textAlignVertical: 'top' }]}
          placeholder={placeholder}
          placeholderTextColor={colors.grayMid}
          value={form[fieldKey]}
          onChangeText={(v) => update(fieldKey, v)}
          keyboardType={keyboardType || 'default'}
          secureTextEntry={secure && !showToggle}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
          autoCorrect={false}
          multiline={multiline}
          onFocus={() => setFocusedField(fieldKey)}
          onBlur={() => setFocusedField(null)}
        />
        {onToggle && (
          <TouchableOpacity onPress={onToggle} style={styles.eyeBtn}>
            <Text style={styles.eyeIcon}>{showToggle ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {errors[fieldKey] && (
        <Text style={styles.fieldError}>⚠ {errors[fieldKey]}</Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar backgroundColor={colors.greenDark} barStyle="light-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerPattern}>
            <View style={[styles.circle, styles.c1]} />
            <View style={[styles.circle, styles.c2]} />
          </View>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() =>
              step === 2 ? setStep(1) : navigation?.goBack()
            }
          >
            <Text style={styles.backBtnText}>{t('auth.back')}</Text>
          </TouchableOpacity>

          <View style={styles.logoWrap}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>🐄</Text>
            </View>
            <Text style={styles.logoText}>BoviTech</Text>
          </View>

          {/* Step indicator */}
          <View style={styles.stepWrap}>
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
                <Text style={[styles.stepNum, step >= 1 && styles.stepNumActive]}>1</Text>
              </View>
              <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
              <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
                <Text style={[styles.stepNum, step >= 2 && styles.stepNumActive]}>2</Text>
              </View>
            </View>
            <View style={styles.stepLabels}>
              <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>
                {t('auth.step1Sub')}
              </Text>
              <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>
                {t('auth.step2Sub')}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Form Card ── */}
        <View style={styles.formCard}>

          {step === 1 && (
            <>
              <Text style={styles.formTitle}>{t('auth.registerTitle')}</Text>
              <Text style={styles.formSub}>{t('auth.step1Sub')}</Text>

              {/* Rôle */}
              <Text style={styles.label}>{t('auth.role')}</Text>
              <View style={styles.roleRow}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.roleBtn,
                      form.role === r.id && styles.roleBtnActive,
                    ]}
                    onPress={() => update('role', r.id)}
                  >
                    <Text style={styles.roleIcon}>{r.icon}</Text>
                    <Text
                      style={[
                        styles.roleLabel,
                        form.role === r.id && styles.roleLabelActive,
                      ]}
                    >
                      {t(r.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Nom / Prénom */}
              <View style={styles.row2col}>
                <View style={{ flex: 1 }}>
                  <InputField label={t('auth.firstName')} fieldKey="firstName" placeholder={t('auth.firstNamePh')} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <InputField label={t('auth.lastName')} fieldKey="lastName" placeholder={t('auth.lastNamePh')} />
                </View>
              </View>

              <InputField
                label={t('auth.email')}
                fieldKey="email"
                placeholder={t('auth.emailPh2')}
                keyboardType="email-address"
              />
              <InputField
                label={t('auth.phone')}
                fieldKey="phone"
                placeholder={t('auth.phonePh')}
                keyboardType="phone-pad"
              />

              <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                <Text style={styles.nextBtnText}>{t('auth.next')}</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.formTitle}>{t('auth.step2Title')}</Text>
              <Text style={styles.formSub}>{t('auth.step2Sub')}</Text>

              <InputField
                label={t('auth.farmName')}
                fieldKey="farmName"
                placeholder={t('auth.farmNamePh')}
              />

              <View style={styles.row2col}>
                <View style={{ flex: 1 }}>
                  <InputField
                    label={t('auth.farmSize')}
                    fieldKey="farmSize"
                    placeholder="12"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <InputField
                    label={t('auth.cowCount')}
                    fieldKey="cowCount"
                    placeholder="24"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Région */}
              <Text style={styles.label}>{t('auth.region')}</Text>
              <View style={[styles.inputWrapper, { marginBottom: 14 }]}>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.regionPh')}
                  placeholderTextColor={colors.grayMid}
                />
              </View>

              <InputField
                label={t('auth.password')}
                fieldKey="password"
                placeholder={t('auth.passwordPh2')}
                secure
                showToggle={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
              />
              <InputField
                label={t('auth.confirmPassword')}
                fieldKey="confirmPassword"
                placeholder={t('auth.confirmPasswordPh')}
                secure
                showToggle={showConfirm}
                onToggle={() => setShowConfirm(!showConfirm)}
              />

              {/* Strength indicator */}
              {form.password.length > 0 && (
                <View style={{ marginTop: -8, marginBottom: 14 }}>
                  <View style={styles.strengthBar}>
                    {[1, 2, 3, 4].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.strengthSeg,
                          {
                            backgroundColor:
                              form.password.length >= i * 3
                                ? i <= 1
                                  ? colors.red
                                  : i === 2
                                  ? colors.amber
                                  : colors.greenMid
                                : colors.border,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.strengthLabel}>
                    {form.password.length < 4
                      ? t('auth.strengthShort')
                      : form.password.length < 8
                      ? t('auth.strengthMedium')
                      : t('auth.strengthGood')}
                  </Text>
                </View>
              )}

              {/* CGU */}
              <View style={styles.cguRow}>
                <View style={styles.cguCheckbox}>
                  <Text style={{ fontSize: 12 }}>✓</Text>
                </View>
                <Text style={styles.cguText}>
                  {t('auth.cguPrefix')}
                  <Text style={{ color: colors.green, fontWeight: '700' }}>
                    {t('auth.cguTerms')}
                  </Text>{' '}
                  {t('auth.cguAnd')}
                  <Text style={{ color: colors.green, fontWeight: '700' }}>
                    {t('auth.cguPrivacy')}
                  </Text>
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>{t('auth.submitRegister')}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Login link ── */}
        <View style={styles.loginWrap}>
          <Text style={styles.loginText}>{t('auth.already')} </Text>
          <TouchableOpacity onPress={() => navigation?.navigate('Login')}>
            <Text style={styles.loginLink}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, paddingBottom: 40 },

  // Header
  header: {
    backgroundColor: colors.greenDark,
    paddingTop: 50,
    paddingBottom: 44,
    paddingHorizontal: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  headerPattern: { position: 'absolute', inset: 0 },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  c1: { width: 160, height: 160, top: -40, right: -20 },
  c2: { width: 100, height: 100, bottom: -20, left: 20 },

  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    zIndex: 1,
  },
  backBtnText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },

  logoWrap: { alignItems: 'center', marginBottom: 20, zIndex: 1 },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  logoEmoji: { fontSize: 28 },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },

  // Steps
  stepWrap: { alignItems: 'center', zIndex: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  stepDotActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  stepNum: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  stepNumActive: { color: colors.green },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  stepLineActive: { backgroundColor: '#fff' },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 160,
    marginTop: 6,
  },
  stepLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center', flex: 1 },
  stepLabelActive: { color: '#fff', fontWeight: '700' },

  // Form card
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  formSub: { fontSize: 13, color: colors.textMuted, marginBottom: 20 },

  // Role selector
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  roleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    gap: 4,
  },
  roleBtnActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenLight,
  },
  roleIcon: { fontSize: 20 },
  roleLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  roleLabelActive: { color: colors.green },

  // Layout
  row2col: { flexDirection: 'row' },

  // Inputs
  label: {
    fontSize: 11,
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
    paddingHorizontal: 14,
    height: 48,
  },
  inputFocused: {
    borderColor: colors.green,
    borderWidth: 1.5,
    backgroundColor: colors.greenLight,
  },
  inputError: {
    borderColor: colors.red,
    backgroundColor: colors.redLight,
  },
  input: { flex: 1, fontSize: 14, color: colors.text },
  eyeBtn: { padding: 4 },
  eyeIcon: { fontSize: 16 },
  fieldError: { fontSize: 11, color: colors.red, marginTop: 3, marginLeft: 2 },

  // Strength
  strengthBar: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  strengthSeg: { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: 11, color: colors.textMuted },

  // CGU
  cguRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 20,
    marginTop: 4,
  },
  cguCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: colors.greenLight,
    borderWidth: 1.5,
    borderColor: colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  cguText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 18 },

  // Buttons
  nextBtn: {
    backgroundColor: colors.green,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  submitBtn: {
    backgroundColor: colors.green,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Login link
  loginWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginText: { fontSize: 13, color: colors.textMuted },
  loginLink: { fontSize: 13, color: colors.green, fontWeight: '700' },
});
