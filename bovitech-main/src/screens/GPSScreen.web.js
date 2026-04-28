import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Badge, Card, SectionTitle } from '../components/UIComponents';
import { t } from '../i18n';

export default function GPSScreenWeb() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topHeader}>
          <Text style={styles.headerKicker}>{t('gps.headerKicker')}</Text>
          <Text style={styles.headerTitle}>{t('gps.headerTitle')}</Text>
          <Text style={styles.headerSub}>{t('gps.headerSub')}</Text>
        </View>

        <View style={styles.body}>
          <Card>
            <Text style={styles.mapTitle}>Carte GPS indisponible sur Web</Text>
            <Text style={styles.mapDesc}>
              Cette vue utilise un module natif mobile. Ouvrez l'application sur Android/iOS pour la carte
              interactive.
            </Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: '#2563EB' }]} />
                <Text style={styles.legendText}>{t('gps.inZone')} (23)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: colors.red }]} />
                <Text style={styles.legendText}>{t('gps.outZone')} (1)</Text>
              </View>
            </View>
          </Card>

          <SectionTitle>{t('gps.activeAlert')}</SectionTitle>
          <Card>
            <View style={styles.alertHeader}>
              <Text style={styles.alertTitle}>Marguerite #07</Text>
              <Badge type="danger" label={t('gps.outOfZone')} />
            </View>
            <Text style={styles.alertDesc}>
              Derniere position detectee hors zone. La carte detaillee est disponible sur mobile.
            </Text>
            <TouchableOpacity style={styles.recoverBtn} activeOpacity={0.85}>
              <Text style={styles.recoverBtnText}>{t('gps.recoverRoute')}</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 100 },
  topHeader: {
    backgroundColor: colors.green,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 22,
  },
  headerKicker: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 6,
    lineHeight: 16,
  },
  body: { paddingHorizontal: 16, marginTop: 12, gap: 10 },
  mapTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  mapDesc: { marginTop: 8, fontSize: 13, color: colors.gray, lineHeight: 20 },
  legendRow: { flexDirection: 'row', gap: 14, marginTop: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 11, height: 11, borderRadius: 6 },
  legendText: { fontSize: 12, color: colors.gray, fontWeight: '500' },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  alertDesc: { fontSize: 13, color: colors.gray, lineHeight: 20 },
  recoverBtn: {
    marginTop: 14,
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  recoverBtnText: { fontSize: 13, fontWeight: '700', color: colors.card },
});
