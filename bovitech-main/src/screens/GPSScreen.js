import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Badge, Card, SectionTitle } from '../components/UIComponents';
import { t, getLanguage } from '../i18n';

const MAP_H = Math.round(Dimensions.get('window').width * 0.92 * 0.72);

/** Centre pâturage (rural MA — ajustable). Coordonnées = contexte satellite réaliste. */
const MAP_ANCHOR = { latitude: 33.6065, longitude: -7.5135 };
const SPAN_BASE = { latitudeDelta: 0.0048, longitudeDelta: 0.0055 };

const cowPositions = [
  { id: '03', xn: 0.25, yn: 0.3, status: 'in', name: 'Blanchette' },
  { id: '05', xn: 0.37, yn: 0.42, status: 'in', name: 'Noisette' },
  { id: '09', xn: 0.3, yn: 0.55, status: 'in', name: 'Bellina' },
  { id: '12', xn: 0.5, yn: 0.38, status: 'in', name: 'Rosette' },
  { id: '02', xn: 0.58, yn: 0.25, status: 'in', name: 'Leila' },
  { id: '14', xn: 0.62, yn: 0.5, status: 'in', name: 'Sara' },
  { id: '01', xn: 0.2, yn: 0.65, status: 'in', name: 'Amina' },
  { id: '08', xn: 0.43, yn: 0.65, status: 'in', name: 'Rima' },
  { id: '07', xn: 0.88, yn: 0.18, status: 'out', name: 'Marguerite' },
];

function toLatLng(xn, yn) {
  return {
    latitude: MAP_ANCHOR.latitude + (0.5 - yn) * SPAN_BASE.latitudeDelta * 2.1,
    longitude: MAP_ANCHOR.longitude + (xn - 0.5) * SPAN_BASE.longitudeDelta * 2.1,
  };
}

/** Parcours type « piste » reliant les points (ordre visité simulé) */
function buildTrackCoords() {
  const order = ['01', '09', '08', '05', '12', '14', '02', '03', '12', '05'];
  const coords = order.map((id) => {
    const c = cowPositions.find((x) => x.id === id);
    return toLatLng(c.xn, c.yn);
  });
  coords.push({ ...coords[0] });
  return coords;
}

const TRACK_COORDS = buildTrackCoords();

const initialRegion = {
  latitude: MAP_ANCHOR.latitude,
  longitude: MAP_ANCHOR.longitude,
  latitudeDelta: SPAN_BASE.latitudeDelta * 2.4,
  longitudeDelta: SPAN_BASE.longitudeDelta * 2.4,
};

export default function GPSScreen() {
  const mapRef = useRef(null);
  const regionRef = useRef(initialRegion);
  const [selectedCow, setSelectedCow] = useState(null);

  const cowsLatLng = useMemo(
    () =>
      cowPositions.map((c) => ({
        ...c,
        coordinate: toLatLng(c.xn, c.yn),
      })),
    []
  );

  const zoomBy = useCallback((factor) => {
    const r = regionRef.current;
    const next = {
      ...r,
      latitudeDelta: Math.max(0.00035, r.latitudeDelta * factor),
      longitudeDelta: Math.max(0.00035, r.longitudeDelta * factor),
    };
    regionRef.current = next;
    mapRef.current?.animateToRegion?.(next, 200);
  }, []);

  const recenter = useCallback(() => {
    regionRef.current = initialRegion;
    mapRef.current?.animateToRegion?.(initialRegion, 350);
  }, []);

  const mapProvider = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View style={styles.topHeader}>
          <View style={styles.topHeaderDecor} />
          <View style={styles.heroRow}>
            <View style={styles.heroText}>
              <Text style={styles.headerKicker}>{t('gps.headerKicker')}</Text>
              <Text style={styles.headerTitle}>{t('gps.headerTitle')}</Text>
              <Text style={styles.headerSub}>{t('gps.headerSub')}</Text>
            </View>
            <View style={styles.collierPill}>
              <Text style={styles.collierPillText}>24 {t('gps.collars')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.mapCard}>
            <View style={[styles.mapFrame, { height: MAP_H }]}>
              <MapView
            ref={mapRef}
            provider={mapProvider}
            style={StyleSheet.absoluteFill}
            mapType="satellite"
            initialRegion={initialRegion}
            onRegionChangeComplete={(r) => {
              regionRef.current = r;
            }}
            showsCompass={false}
            showsScale={false}
            toolbarEnabled={false}
            loadingEnabled
            pitchEnabled={false}
          >
            <Polyline
              coordinates={TRACK_COORDS}
              strokeColor="rgba(120, 120, 120, 0.92)"
              strokeWidth={5}
              lineJoin="round"
              lineCap="round"
            />
            {cowsLatLng.map((cow) => {
              const selected = selectedCow === cow.id;
              const isOut = cow.status === 'out';
              const pinColor = isOut ? colors.red : '#2563EB';
              return (
                <Marker
                  key={cow.id}
                  coordinate={cow.coordinate}
                  anchor={{ x: 0.5, y: 0.5 }}
                  onPress={() => setSelectedCow(selected ? null : cow.id)}
                >
                  <View
                    style={[
                      styles.pinOuter,
                      { borderColor: pinColor, transform: [{ scale: selected ? 1.35 : 1 }] },
                    ]}
                  >
                    <View style={[styles.pinInner, { backgroundColor: pinColor }]} />
                  </View>
                </Marker>
              );
            })}
          </MapView>

          <TouchableOpacity style={[styles.floatBtn, styles.floatTopLeft]} activeOpacity={0.8}>
            <Ionicons name="menu" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.floatZoomCol}>
            <TouchableOpacity style={styles.floatBtn} onPress={() => zoomBy(0.62)} activeOpacity={0.8}>
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.floatBtn} onPress={() => zoomBy(1.55)} activeOpacity={0.8}>
              <Ionicons name="remove" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.floatStackLeft}>
            <TouchableOpacity style={styles.floatBtn} activeOpacity={0.8}>
              <Ionicons name="compass-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.floatBtn} activeOpacity={0.8}>
              <Ionicons name="move-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.floatBtn} onPress={recenter} activeOpacity={0.8}>
              <Ionicons name="locate" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {cowPositions.some((c) => c.status === 'out') && (
            <View style={styles.outTag}>
              <Text style={styles.outTagTitle}>Marguerite #07</Text>
              <Text style={styles.outTagSub}>{t('gps.outOfZone')}</Text>
            </View>
          )}
        </View>

        <View style={styles.mapFooter}>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: '#2563EB' }]} />
              <Text style={styles.legendText}>
                {t('gps.inZone')} (23)
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: colors.red }]} />
              <Text style={styles.legendText}>
                {t('gps.outZone')} (1)
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine]} />
              <Text style={styles.legendText}>{t('gps.track')}</Text>
            </View>
          </View>
          {selectedCow && (
            <Text style={styles.selectedHint}>
              Sélection #{selectedCow} · toucher à nouveau le marqueur pour retirer
            </Text>
          )}
        </View>
      </View>

      <SectionTitle>{t('gps.activeAlert')}</SectionTitle>
      <Card>
        <View style={styles.alertHeader}>
          <Text style={styles.alertTitle}>⚠️ {t('gps.activeAlert')} — Marguerite #07</Text>
          <Badge type="danger" label={t('gps.outOfZone')} />
        </View>
        <Text style={styles.alertDesc}>
          Dernière position : Zone nord-est, 290m de la clôture. Sortie détectée
          à 09:28. Route de récupération suggérée via chemin principal.
        </Text>
        <TouchableOpacity style={styles.recoverBtn} activeOpacity={0.85}>
          <Text style={styles.recoverBtnText}>{t('gps.recoverRoute')}</Text>
        </TouchableOpacity>
      </Card>

      <SectionTitle>{t('gps.securedZones')}</SectionTitle>
      <Card>
        {[
          { name: t('gps.zoneMain'), area: '4.2 ha', status: 'ok', count: '18' },
          { name: t('gps.zoneNorth'), area: '2.8 ha', status: 'ok', count: '5' },
          { name: t('gps.zoneRest'), area: '0.5 ha', status: 'ok', count: '0' },
        ].map((zone, i) => (
          <View
            key={zone.name}
            style={[
              styles.zoneRow,
              i < 2 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
            ]}
          >
            <View style={styles.zoneIcon}>
              <Text style={{ fontSize: 16 }}>📍</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.zoneName}>{zone.name}</Text>
              <Text style={styles.zoneMeta}>{zone.area} · {zone.count}</Text>
            </View>
            <Badge type={zone.status} label={t('common.active')} />
          </View>
        ))}
      </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const glass = {
  backgroundColor: 'rgba(0,0,0,0.52)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.14)',
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 100 },

  topHeader: {
    backgroundColor: colors.green,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  topHeaderDecor: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -80,
    right: -50,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  heroText: { flex: 1, paddingRight: 12 },
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
  collierPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  collierPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  body: {
    paddingHorizontal: 16,
    marginTop: -12,
  },

  mapCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 26,
    elevation: 6,
  },
  mapFrame: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },

  floatBtn: {
    ...glass,
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatTopLeft: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  floatZoomCol: {
    position: 'absolute',
    top: 72,
    right: 12,
    gap: 10,
  },
  floatStackLeft: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    gap: 10,
  },

  pinOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  pinInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  outTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.red,
  },
  outTagTitle: { fontSize: 10, fontWeight: '800', color: colors.red },
  outTagSub: { fontSize: 9, fontWeight: '700', color: colors.red, marginTop: 2 },

  mapFooter: { marginTop: 12, gap: 8 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendSwatch: {
    width: 11,
    height: 11,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  legendLine: {
    width: 20,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(120,120,120,0.85)',
  },
  legendText: { fontSize: 12, color: colors.gray, fontWeight: '500' },
  selectedHint: { fontSize: 11, color: colors.greenMid, fontStyle: 'italic' },

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

  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  zoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoneName: { fontSize: 14, fontWeight: '600', color: colors.text },
  zoneMeta: { fontSize: 12, color: colors.grayMid, marginTop: 2 },
});
