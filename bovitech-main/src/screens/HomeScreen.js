import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline, Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { colors } from '../theme/colors';
import { alerts, milkData, weatherFarm } from '../theme/mockData';
import { fetchOpenMeteoCurrent, DEFAULT_FARM_COORDS } from '../services/openMeteo';
import { fetchBarnSensor } from '../services/barnSensors';
import { linesFromGeocode, fetchNamedPlaceLinesFromCoords } from '../utils/geocodeFormat';
import { Badge, Card, SectionTitle, AlertDot, ProgressBar } from '../components/UIComponents';
import { t, setLanguage, getLanguage } from '../i18n';

const MAX_MILK = 200;
const SCREEN_W = Dimensions.get('window').width;
const CHART_INNER_W = SCREEN_W - 32 - 32;
const CHART_H = 118;
const CHART_PAD = 8;

function MilkChartGraphic() {
  const n = milkData.length;
  const gap = 7;
  const barW = (CHART_INNER_W - gap * (n + 1)) / n;
  const baseY = CHART_H - 14;
  const topY = 12;

  const points = milkData
    .map((d, i) => {
      const cx = gap + i * (barW + gap) + barW / 2;
      const cy = baseY - (d.value / MAX_MILK) * (baseY - topY);
      return `${cx},${cy}`;
    })
    .join(' ');

  return (
    <View style={styles.chartSvgWrap}>
      <Svg width={CHART_INNER_W} height={CHART_H}>
        <Defs>
          <SvgLinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.tealMid} stopOpacity={1} />
            <Stop offset="1" stopColor={colors.greenMid} stopOpacity={0.85} />
          </SvgLinearGradient>
          <SvgLinearGradient id="barGradHi" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#74C69D" stopOpacity={1} />
            <Stop offset="1" stopColor={colors.green} stopOpacity={0.95} />
          </SvgLinearGradient>
        </Defs>
        {/* grille légère */}
        {[0.25, 0.5, 0.75].map((t) => {
          const y = topY + (baseY - topY) * (1 - t);
          return (
            <Rect
              key={t}
              x={CHART_PAD}
              y={y}
              width={CHART_INNER_W - CHART_PAD * 2}
              height={1}
              fill={colors.divider}
              opacity={0.6}
            />
          );
        })}
        {milkData.map((d, i) => {
          const x = gap + i * (barW + gap);
          const h = (d.value / MAX_MILK) * (baseY - topY);
          const isLast = i === n - 1;
          return (
            <Rect
              key={d.day}
              x={x}
              y={baseY - h}
              width={barW}
              height={Math.max(h, 4)}
              rx={6}
              ry={6}
              fill={isLast ? 'url(#barGradHi)' : 'url(#barGrad)'}
            />
          );
        })}
        <Polyline
          points={points}
          fill="none"
          stroke={colors.amberMid}
          strokeWidth={2.5}
          strokeDasharray="4 4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <View style={styles.chartLabels}>
        {milkData.map((d) => (
          <Text key={d.day} style={styles.chartLabel}>
            {d.day}
          </Text>
        ))}
      </View>
      <View style={styles.chartFooter}>
        <Text style={styles.chartFooterLabel}>{t('home.weekAvg')}</Text>
        <Text style={styles.chartFooterVal}>182 L</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const [lang, setLang] = React.useState(getLanguage());
  const isAr = lang === 'ar';

  const [weatherLive, setWeatherLive] = React.useState(null);
  const [weatherLoading, setWeatherLoading] = React.useState(true);
  const [weatherError, setWeatherError] = React.useState(null);
  /** Libellés issus du géocodage inverse (toujours pour les coords météo, GPS ou défaut) */
  const [locationLines, setLocationLines] = React.useState({ header: null, card: null });
  const [usingDefaultCoords, setUsingDefaultCoords] = React.useState(false);

  const [barn, setBarn] = React.useState(null);
  const [barnLoading, setBarnLoading] = React.useState(true);
  const [barnError, setBarnError] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setWeatherLoading(true);
      setWeatherError(null);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        let coords = { ...DEFAULT_FARM_COORDS };
        let defaultCoords = true;
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          defaultCoords = false;
        }
        if (!cancelled) setUsingDefaultCoords(defaultCoords);

        let nextLines = { header: null, card: null };
        try {
          const geoList = await Location.reverseGeocodeAsync(coords);
          const geo = geoList && geoList[0];
          if (geo) {
            nextLines = linesFromGeocode(geo);
          }
        } catch (e) {
          /* ignore */
        }
        if (!nextLines.header && !nextLines.card) {
          const named = await fetchNamedPlaceLinesFromCoords(
            coords,
            getLanguage() === 'ar' ? 'ar' : 'fr'
          );
          if (named) nextLines = named;
        }
        if (!cancelled) setLocationLines(nextLines);

        const data = await fetchOpenMeteoCurrent(coords);
        if (!cancelled) setWeatherLive(data);
      } catch (e) {
        if (!cancelled) setWeatherError(e?.message || 'weather');
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchBarnSensor();
        if (!cancelled) {
          setBarn(data);
          setBarnError(null);
        }
      } catch (e) {
        if (!cancelled) setBarnError(e?.message || 'barn');
      } finally {
        if (!cancelled) setBarnLoading(false);
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const switchLang = async (next) => {
    const updated = await setLanguage(next);
    setLang(updated);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerDecor} />
          <View style={styles.headerTop}>
            <View style={styles.headerBrand}>
              <View style={styles.logoMark}>
                <Ionicons name="leaf" size={18} color={colors.green} />
              </View>
              <View>
                <Text style={styles.headerTitle}>BoviTech</Text>
                <Text style={styles.headerSub}>
                  {t('home.dashboard')} ·{' '}
                  {locationLines.header ||
                    (isAr ? weatherFarm.region_ar : weatherFarm.region)}
                </Text>
              </View>
            </View>
            <View style={styles.onlinePill}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>{t('common.online')}</Text>
            </View>
          </View>

          <View style={styles.langRow}>
            <View style={styles.langPill}>
              <Text style={styles.langLabel}>{lang === 'ar' ? 'اللغة' : 'Lang'}</Text>
              <View style={styles.langBtns}>
                <Text
                  onPress={() => switchLang('fr')}
                  style={[styles.langBtn, lang === 'fr' && styles.langBtnActive]}
                >
                  FR
                </Text>
                <Text
                  onPress={() => switchLang('ar')}
                  style={[styles.langBtn, lang === 'ar' && styles.langBtnActive]}
                >
                  AR
                </Text>
              </View>
            </View>
            <Text style={styles.langHint}>
              {lang === 'ar' ? 'RTL قد يتطلب إعادة تشغيل التطبيق' : 'RTL peut nécessiter un redémarrage'}
            </Text>
          </View>

          <View style={styles.statsRow}>
            {[
              { val: '24', lbl: t('home.cows'), icon: 'stats-chart-outline' },
              { val: '2', lbl: t('home.alerts'), icon: 'notifications-outline' },
              { val: '186 L', lbl: t('home.milkPerDay'), icon: 'water-outline' },
            ].map((s) => (
              <View key={s.lbl} style={styles.statTile}>
                <Ionicons name={s.icon} size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLbl}>{s.lbl}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.mainPad}>
          {/* Weather — Open-Meteo (réel) */}
          <View style={styles.weatherCard}>
            <View style={styles.weatherTop}>
              <View style={styles.weatherTitleRow}>
                <Text style={styles.weatherIcon}>
                  {weatherLoading ? '…' : weatherLive?.icon || weatherFarm.icon}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.weatherHeading}>{t('home.weatherAtFarm')}</Text>
                  <Text style={styles.weatherLoc}>
                    {locationLines.card ||
                      locationLines.header ||
                      weatherFarm.location}
                    {usingDefaultCoords ? ` · ${t('home.weatherLocationFallback')}` : ''}
                  </Text>
                </View>
              </View>
              <Text style={styles.weatherUpdated}>
                {weatherLoading
                  ? t('home.weatherLoading')
                  : `${t('common.updated')} ${weatherLive?.updated || '—'}`}
              </Text>
            </View>
            {weatherLoading ? (
              <View style={styles.weatherLoadingRow}>
                <ActivityIndicator color={colors.greenMid} />
              </View>
            ) : weatherError || !weatherLive ? (
              <View style={styles.weatherLoadingRow}>
                <Text style={styles.weatherErrText}>
                  {weatherError ? `${t('home.weatherUnavailable')} (${String(weatherError)})` : t('home.weatherUnavailable')}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.weatherMain}>
                  <Text style={styles.weatherTemp}>{weatherLive.temp}°</Text>
                  <View style={styles.weatherRight}>
                    <Text style={styles.weatherSummary}>
                      {isAr ? weatherLive.summaryAr : weatherLive.summaryFr}
                    </Text>
                    <Text style={styles.weatherFeels}>
                      {t('common.feelsLike')} {weatherLive.feelsLike}° · {t('common.wind')}{' '}
                      {isAr ? weatherLive.windDirAr : weatherLive.windDirFr} {weatherLive.windKmh}{' '}
                      km/h
                    </Text>
                  </View>
                </View>
                <View style={styles.weatherMeta}>
                  <View style={styles.weatherChip}>
                    <Ionicons name="water-outline" size={14} color={colors.greenMid} />
                    <Text style={styles.weatherChipText}>
                      {weatherLive.humidity}% {t('common.humidity')}
                    </Text>
                  </View>
                  <View style={styles.weatherChip}>
                    <Ionicons name="partly-sunny-outline" size={14} color={colors.amberMid} />
                    <Text style={styles.weatherChipText}>
                      {isAr ? weatherLive.pastureAr : weatherLive.pastureFr}
                    </Text>
                  </View>
                </View>
              </>
            )}
            <Text style={styles.weatherAttribution}>{t('home.weatherDataBy')}</Text>
          </View>

          <View style={styles.barnCard}>
            <View style={styles.barnTop}>
              <View style={styles.barnTitleRow}>
                <Text style={styles.barnIcon}>🌡️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.barnHeading}>{t('home.barnSensorTitle')}</Text>
                </View>
              </View>
              <Text style={styles.barnUpdated}>
                {barnLoading
                  ? t('home.barnSensorLoading')
                  : barn?.ok && barn?.updated_iso
                    ? `${t('common.updated')} ${new Date(barn.updated_iso).toLocaleString(isAr ? 'ar-TN' : 'fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : `${t('common.updated')} —`}
              </Text>
            </View>
            {barnLoading && !barn ? (
              <View style={styles.weatherLoadingRow}>
                <ActivityIndicator color={colors.tealMid} />
              </View>
            ) : barnError ? (
              <View style={styles.weatherLoadingRow}>
                <Text style={styles.weatherErrText}>{String(barnError)}</Text>
              </View>
            ) : !barn?.ok ? (
              <View style={styles.weatherLoadingRow}>
                <Text style={styles.barnEmptyText}>{t('home.barnSensorEmpty')}</Text>
              </View>
            ) : (
              <>
                <View style={styles.barnMain}>
                  <Text style={styles.barnTemp}>
                    {Number(barn.temp_c).toFixed(1)}°
                  </Text>
                  <View style={styles.barnRight}>
                    <Text style={styles.barnSub}>
                      {t('herd.temperature')}
                    </Text>
                  </View>
                </View>
                <View style={styles.weatherMeta}>
                  <View style={styles.barnChip}>
                    <Ionicons name="water-outline" size={14} color={colors.tealMid} />
                    <Text style={styles.weatherChipText}>
                      {Number(barn.humidity).toFixed(1)}% {t('common.humidity')}
                    </Text>
                  </View>
                  <View style={styles.barnChip}>
                    <Ionicons name="pulse-outline" size={14} color={colors.amberMid} />
                    <Text style={styles.weatherChipText}>
                      THI {Number(barn.thi).toFixed(1)}
                    </Text>
                  </View>
                </View>
              </>
            )}
            <Text style={styles.barnAttribution}>{t('home.barnSensorDataBy')}</Text>
          </View>

          <SectionTitle>{t('home.recentAlerts')}</SectionTitle>
          <Card style={styles.cardTight}>
            {alerts.map((alert, i) => (
              <View
                key={alert.id}
                style={[
                  styles.alertRow,
                  i < alerts.length - 1 && styles.alertBorder,
                  alert.type === 'danger' && styles.alertAccent_danger,
                  alert.type === 'warn' && styles.alertAccent_warn,
                  alert.type === 'ok' && styles.alertAccent_ok,
                  alert.type === 'info' && styles.alertAccent_info,
                ]}
              >
                <AlertDot type={alert.type} />
                <View style={styles.alertBody}>
                  <Text style={styles.alertText}>
                    {alert.icon}{' '}
                    <Text style={styles.alertStrong}>
                      {(isAr ? alert.text_ar : alert.text).split(':')[0]}
                    </Text>
                    {(isAr ? alert.text_ar : alert.text).includes(':')
                      ? ':' +
                        (isAr ? alert.text_ar : alert.text)
                          .split(':')
                          .slice(1)
                          .join(':')
                      : ''}
                  </Text>
                  <Text style={styles.alertTime}>{isAr ? alert.time_ar : alert.time}</Text>
                </View>
                <Badge type={alert.type} label={isAr ? alert.label_ar : alert.label} />
              </View>
            ))}
          </Card>

          <SectionTitle>{t('home.milk7d')}</SectionTitle>
          <Card style={styles.cardTight}>
            <View style={styles.chartLegend}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>{t('home.volumeLegend')}</Text>
              <View style={[styles.legendLine]} />
              <Text style={styles.legendText}>{t('home.trendLegend')}</Text>
            </View>
            <MilkChartGraphic />
          </Card>

          <SectionTitle>{t('home.herdStatus')}</SectionTitle>
          <Card style={styles.cardTight}>
            <View style={styles.progressRow}>
              <View style={styles.progressCol}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>{t('home.overallHealth')}</Text>
                  <Text style={[styles.progressVal, { color: colors.green }]}>91%</Text>
                </View>
                <ProgressBar value={91} color={colors.greenMid} />
              </View>
              <View style={styles.progressGutter} />
              <View style={styles.progressCol}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>{t('home.activeCollars')}</Text>
                  <Text style={[styles.progressVal, { color: colors.teal }]}>22/24</Text>
                </View>
                <ProgressBar value={91} color={colors.tealMid} />
              </View>
            </View>
            <View style={styles.progressBlock}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>{t('home.pregnantCows')}</Text>
                <Text style={[styles.progressVal, { color: colors.amber }]}>4</Text>
              </View>
              <ProgressBar value={16} color={colors.amberMid} />
            </View>
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
  mainPad: { paddingHorizontal: 16 },

  header: {
    backgroundColor: colors.green,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  headerDecor: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -90,
    right: -60,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.78)', marginTop: 2 },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.online,
  },
  onlineText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    zIndex: 1,
  },
  langRow: { marginTop: 12, zIndex: 1 },
  langPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  langLabel: { color: 'rgba(255,255,255,0.88)', fontSize: 11, fontWeight: '700' },
  langBtns: { flexDirection: 'row', gap: 8 },
  langBtn: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  langBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    color: colors.green,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  langHint: { marginTop: 6, fontSize: 10, color: 'rgba(255,255,255,0.62)', fontWeight: '600' },
  statTile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statVal: {
    fontSize: 19,
    fontWeight: '700',
    color: '#fff',
  },
  statLbl: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },

  weatherCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    marginTop: -28,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.divider,
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 28,
    elevation: 6,
  },
  weatherTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  weatherTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weatherIcon: { fontSize: 36 },
  weatherHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weatherLoc: { fontSize: 12, color: colors.grayMid, marginTop: 2 },
  weatherUpdated: { fontSize: 10, fontWeight: '600', color: colors.grayMid },
  weatherMain: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginBottom: 14 },
  weatherTemp: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.green,
    lineHeight: 52,
    letterSpacing: -2,
  },
  weatherRight: { flex: 1, paddingBottom: 6 },
  weatherSummary: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  weatherFeels: {
    fontSize: 12,
    color: colors.grayMid,
    marginTop: 4,
    lineHeight: 17,
  },
  weatherMeta: { gap: 8 },
  weatherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.greenLight,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  weatherChipText: { flex: 1, fontSize: 12, color: colors.gray, lineHeight: 17 },
  weatherLoadingRow: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherErrText: { fontSize: 12, color: colors.amber, textAlign: 'center', lineHeight: 18 },
  weatherAttribution: {
    marginTop: 10,
    fontSize: 10,
    color: colors.grayMid,
    textAlign: 'right',
  },

  barnCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    marginTop: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.divider,
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  barnTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  barnTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  barnIcon: { fontSize: 28 },
  barnHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  barnUpdated: { fontSize: 10, fontWeight: '600', color: colors.grayMid, marginLeft: 8 },
  barnMain: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 12 },
  barnTemp: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.tealMid,
    lineHeight: 44,
    letterSpacing: -1.5,
  },
  barnRight: { flex: 1, paddingBottom: 4 },
  barnSub: { fontSize: 13, color: colors.grayMid, fontWeight: '500' },
  barnChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(45, 106, 79, 0.08)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  barnEmptyText: { fontSize: 12, color: colors.grayMid, textAlign: 'center', lineHeight: 18, paddingHorizontal: 4 },
  barnAttribution: {
    marginTop: 8,
    fontSize: 10,
    color: colors.grayMid,
    textAlign: 'right',
  },

  cardTight: { paddingVertical: 14 },

  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  alertAccent_danger: { borderLeftColor: colors.red },
  alertAccent_warn: { borderLeftColor: colors.amberMid },
  alertAccent_ok: { borderLeftColor: colors.greenMid },
  alertAccent_info: { borderLeftColor: colors.blue },
  alertBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  alertBody: { flex: 1 },
  alertText: { fontSize: 13, color: colors.text, lineHeight: 19 },
  alertStrong: { fontWeight: '700' },
  alertTime: { fontSize: 11, color: colors.grayMid, marginTop: 3 },

  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: colors.tealMid,
  },
  legendLine: {
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.amberMid,
    borderStyle: 'dashed',
  },
  legendText: { fontSize: 10, color: colors.grayMid },

  chartSvgWrap: { alignItems: 'center' },
  chartLabels: {
    flexDirection: 'row',
    width: CHART_INNER_W,
    marginTop: 4,
  },
  chartLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    color: colors.grayMid,
    fontWeight: '600',
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: CHART_INNER_W,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  chartFooterLabel: { fontSize: 12, color: colors.grayMid },
  chartFooterVal: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.green,
  },

  progressRow: { flexDirection: 'row' },
  progressCol: { flex: 1 },
  progressGutter: { width: 14 },
  progressBlock: { marginTop: 16 },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  progressLabel: { fontSize: 12, color: colors.grayMid, fontWeight: '500' },
  progressVal: { fontSize: 12, fontWeight: '700' },
});
