import React, { memo, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import cowV1 from '../../assets/v1.png';
import cowV2 from '../../assets/v2.png';
import cowV3 from '../../assets/v3.png';
import cowV4 from '../../assets/v4.png';

const COLORS = {
  primary: '#2E412D',
  primaryDark: '#243624',
  cream: '#F6F6EC',
  card: '#FFFFFF',
  border: '#E5E3D6',
  sage: '#AFB2A1',
  dark: '#3E3E32',
  black: '#010101',
  white: '#FFFFFF',
  success: '#4F8F63',
  danger: '#C84C4C',
  warning: '#D9962F',
  blue: '#3478F6',
  pasture: '#DDE8D2',
  pasture2: '#C9DDBD',
  road: '#C7B99D',
  water: '#9EC8D8',
};

const cowImages = {
  '07': cowV1,
  '12': cowV2,
  '03': cowV3,
  '05': cowV4,
  '09': cowV1,
  '14': cowV2,
  '18': cowV3,
  '21': cowV4,
  '24': cowV1,
};

const COWS_ON_MAP = [
  {
    id: '07',
    name: 'Marguerite',
    status: 'out',
    x: 82,
    y: 20,
    image: cowImages['07'],
    lastSeen: '09:28',
    distance: '290 m',
  },
  {
    id: '12',
    name: 'Rosette',
    status: 'out',
    x: 76,
    y: 72,
    image: cowImages['12'],
    lastSeen: '09:34',
    distance: '180 m',
  },
  {
    id: '24',
    name: 'Louna',
    status: 'out',
    x: 14,
    y: 76,
    image: cowImages['24'],
    lastSeen: '09:31',
    distance: '120 m',
  },
  {
    id: '03',
    name: 'Blanchette',
    status: 'in',
    x: 24,
    y: 31,
    image: cowImages['03'],
    lastSeen: '09:42',
    distance: 'Dans la zone',
  },
  {
    id: '05',
    name: 'Noisette',
    status: 'in',
    x: 39,
    y: 43,
    image: cowImages['05'],
    lastSeen: '09:40',
    distance: 'Dans la zone',
  },
  {
    id: '09',
    name: 'Bellina',
    status: 'in',
    x: 29,
    y: 58,
    image: cowImages['09'],
    lastSeen: '09:39',
    distance: 'Dans la zone',
  },
  {
    id: '14',
    name: 'Sara',
    status: 'in',
    x: 55,
    y: 34,
    image: cowImages['14'],
    lastSeen: '09:41',
    distance: 'Dans la zone',
  },
  {
    id: '18',
    name: 'Amina',
    status: 'in',
    x: 50,
    y: 61,
    image: cowImages['18'],
    lastSeen: '09:37',
    distance: 'Dans la zone',
  },
  {
    id: '21',
    name: 'Rima',
    status: 'in',
    x: 64,
    y: 50,
    image: cowImages['21'],
    lastSeen: '09:38',
    distance: 'Dans la zone',
  },
];

function getStatusMeta(status) {
  if (status === 'out') {
    return {
      label: 'Hors zone',
      color: COLORS.danger,
      bg: 'rgba(200,76,76,0.12)',
    };
  }

  return {
    label: 'Dans la zone',
    color: COLORS.blue,
    bg: 'rgba(52,120,246,0.12)',
  };
}

const MiniCowMarker = memo(function MiniCowMarker({ cow, selected, zoom, onPress }) {
  const meta = getStatusMeta(cow.status);
  const size = 44 + zoom * 3;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress(cow)}
      style={[
        styles.cowMarker,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left: `${cow.x}%`,
          top: `${cow.y}%`,
          borderColor: meta.color,
          transform: [
            { translateX: -size / 2 },
            { translateY: -size / 2 },
            { scale: selected ? 1.18 : 1 },
          ],
        },
      ]}
    >
      <Image source={cow.image} style={styles.cowMarkerImage} />

      <View style={[styles.markerStatusDot, { backgroundColor: meta.color }]} />

      {selected && (
        <View style={styles.markerLabel}>
          <Text style={styles.markerLabelText}>
            {cow.name} #{cow.id}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

function FakeRouteLine({ left, top, width, rotate }) {
  return (
    <View
      style={[
        styles.routeLine,
        {
          left: `${left}%`,
          top: `${top}%`,
          width,
          transform: [{ rotate }],
        },
      ]}
    />
  );
}

export default function GPSScreen() {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const [selectedCow, setSelectedCow] = useState(
    COWS_ON_MAP.find((cow) => cow.status === 'out')
  );
  const [zoom, setZoom] = useState(1);
  const [rotationValue, setRotationValue] = useState(0);

  const stats = useMemo(() => {
    const inZone = COWS_ON_MAP.filter((cow) => cow.status === 'in').length;
    const outZone = COWS_ON_MAP.filter((cow) => cow.status === 'out').length;

    return {
      total: COWS_ON_MAP.length,
      inZone,
      outZone,
    };
  }, []);

  const selectedMeta = selectedCow ? getStatusMeta(selectedCow.status) : null;

  const rotateMap = () => {
    const next = rotationValue + 90;
    setRotationValue(next);

    Animated.spring(rotateAnim, {
      toValue: next,
      friction: 9,
      tension: 70,
      useNativeDriver: true,
    }).start();
  };

  const zoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 1.75));
  };

  const zoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.75));
  };

  const resetMap = () => {
    setZoom(1);
    setRotationValue(0);

    Animated.spring(rotateAnim, {
      toValue: 0,
      friction: 9,
      tension: 70,
      useNativeDriver: true,
    }).start();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroOrb} />

          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroKicker}>SUIVI TEMPS RÉEL</Text>
              <Text style={styles.heroTitle}>Carte du pâturage</Text>
              <Text style={styles.heroSub}>Vue 360° · zoom · colliers GPS</Text>
            </View>

            <View style={styles.collarsBadge}>
              <MaterialCommunityIcons name="cow" size={16} color={COLORS.white} />
              <Text style={styles.collarsText}>{stats.total} colliers</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.mapCard}>
            <View style={styles.mapHeader}>
              <View>
                <Text style={styles.mapTitle}>Carte GPS interactive</Text>
                <Text style={styles.mapSubtitle}>
                  Simulation premium · zoom x{zoom.toFixed(2)}
                </Text>
              </View>

              <TouchableOpacity style={styles.recenterBtn} activeOpacity={0.84} onPress={resetMap}>
                <Ionicons name="locate" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.mapCanvas}>
              <Animated.View
                style={[
                  styles.mapWorld,
                  {
                    transform: [{ scale: zoom }, { rotate }],
                  },
                ]}
              >
                <View style={styles.mapBackground} />

                <View style={styles.satellitePatchA} />
                <View style={styles.satellitePatchB} />
                <View style={styles.satellitePatchC} />
                <View style={styles.satellitePatchD} />

                <View style={styles.zoneMain}>
                  <View style={styles.zoneGridA} />
                  <View style={styles.zoneGridB} />
                  <View style={styles.zoneGridC} />
                  <Text style={styles.zoneLabel}>Zone sécurisée</Text>
                </View>

                <View style={styles.waterArea} />
                <View style={styles.forestPatchOne} />
                <View style={styles.forestPatchTwo} />
                <View style={styles.pathOne} />
                <View style={styles.pathTwo} />
                <View style={styles.pathThree} />

                <FakeRouteLine left={17} top={39} width={110} rotate="19deg" />
                <FakeRouteLine left={34} top={56} width={120} rotate="-18deg" />
                <FakeRouteLine left={50} top={42} width={92} rotate="30deg" />
                <FakeRouteLine left={19} top={68} width={88} rotate="-36deg" />

                <View style={styles.dangerAreaTop}>
                  <Text style={styles.dangerAreaText}>Hors zone</Text>
                </View>

                <View style={styles.dangerAreaBottom}>
                  <Text style={styles.dangerAreaText}>Hors zone</Text>
                </View>

                {COWS_ON_MAP.map((cow) => (
                  <MiniCowMarker
                    key={cow.id}
                    cow={cow}
                    zoom={zoom}
                    selected={selectedCow?.id === cow.id}
                    onPress={setSelectedCow}
                  />
                ))}
              </Animated.View>

              <View style={styles.compass}>
                <Ionicons name="navigate" size={18} color={COLORS.primary} />
                <Text style={styles.compassText}>{rotationValue % 360}°</Text>
              </View>

              <View style={styles.zoomControls}>
                <TouchableOpacity style={styles.mapBtn} onPress={zoomIn}>
                  <Ionicons name="add" size={18} color={COLORS.white} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.mapBtn} onPress={zoomOut}>
                  <Ionicons name="remove" size={18} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              <View style={styles.leftControls}>
                <TouchableOpacity style={styles.mapBtn} onPress={rotateMap}>
                  <Ionicons name="refresh" size={18} color={COLORS.white} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.mapBtn} onPress={resetMap}>
                  <Ionicons name="scan-outline" size={18} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.layerBtn}>
                <Ionicons name="layers-outline" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.mapFooter}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.blue }]} />
                <Text style={styles.legendText}>Dans la zone ({stats.inZone})</Text>
              </View>

              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} />
                <Text style={styles.legendText}>Hors zone ({stats.outZone})</Text>
              </View>

              <View style={styles.legendItem}>
                <Ionicons name="move-outline" size={14} color={COLORS.primary} />
                <Text style={styles.legendText}>Carte 360°</Text>
              </View>
            </View>
          </View>

          {selectedCow && (
            <View style={[styles.selectedCard, { borderLeftColor: selectedMeta.color }]}>
              <View style={styles.selectedTop}>
                <View style={styles.selectedIdentity}>
                  <Image source={selectedCow.image} style={styles.selectedImage} />

                  <View>
                    <Text style={styles.selectedName}>
                      {selectedCow.name} #{selectedCow.id}
                    </Text>
                    <Text style={styles.selectedMeta}>
                      Dernière position · {selectedCow.lastSeen}
                    </Text>
                  </View>
                </View>

                <View style={[styles.selectedBadge, { backgroundColor: selectedMeta.bg }]}>
                  <Text style={[styles.selectedBadgeText, { color: selectedMeta.color }]}>
                    {selectedMeta.label}
                  </Text>
                </View>
              </View>

              <View style={styles.selectedInfoGrid}>
                <View style={styles.infoMiniCard}>
                  <Ionicons name="navigate-outline" size={17} color={COLORS.primary} />
                  <Text style={styles.infoMiniValue}>{selectedCow.distance}</Text>
                  <Text style={styles.infoMiniLabel}>
                    {selectedCow.status === 'out' ? 'Distance clôture' : 'Position'}
                  </Text>
                </View>

                <View style={styles.infoMiniCard}>
                  <Ionicons name="battery-half-outline" size={17} color={COLORS.primary} />
                  <Text style={styles.infoMiniValue}>82%</Text>
                  <Text style={styles.infoMiniLabel}>Batterie collier</Text>
                </View>
              </View>

              {selectedCow.status === 'out' ? (
                <TouchableOpacity style={styles.recoverBtn} activeOpacity={0.86}>
                  <Text style={styles.recoverBtnText}>Voir l’itinéraire de récupération</Text>
                  <Ionicons name="arrow-forward" size={17} color={COLORS.white} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.safeBtn} activeOpacity={0.86}>
                  <Text style={styles.safeBtnText}>Position stable dans la zone</Text>
                  <Ionicons name="checkmark-circle" size={17} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={styles.sectionKicker}>ALERTES ACTIVES</Text>

          {COWS_ON_MAP.filter((cow) => cow.status === 'out').map((cow) => (
            <TouchableOpacity
              key={cow.id}
              activeOpacity={0.86}
              style={styles.alertCard}
              onPress={() => setSelectedCow(cow)}
            >
              <View style={styles.alertLeft}>
                <Image source={cow.image} style={styles.alertImage} />

                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>
                    {cow.name} #{cow.id}
                  </Text>

                  <Text style={styles.alertDesc}>
                    Sortie détectée à {cow.lastSeen} · {cow.distance} de la clôture.
                  </Text>
                </View>
              </View>

              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>Hors zone</Text>
              </View>
            </TouchableOpacity>
          ))}

          <Text style={styles.sectionKicker}>ZONES SÉCURISÉES</Text>

          <View style={styles.zonesCard}>
            {[
              { name: 'Pâturage principal', area: '4.2 ha', count: stats.inZone },
              { name: 'Zone nord', area: '2.8 ha', count: 2 },
              { name: 'Zone repos', area: '0.5 ha', count: 0 },
            ].map((zone, index) => (
              <View
                key={zone.name}
                style={[
                  styles.zoneRow,
                  index < 2 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: COLORS.border,
                  },
                ]}
              >
                <View style={styles.zoneIcon}>
                  <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.zoneName}>{zone.name}</Text>
                  <Text style={styles.zoneMeta}>
                    {zone.area} · {zone.count} vache(s)
                  </Text>
                </View>

                <View style={styles.zoneActiveBadge}>
                  <Text style={styles.zoneActiveText}>Active</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const glass = {
  backgroundColor: 'rgba(46,65,45,0.72)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.18)',
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },

  scroll: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },

  content: {
    paddingBottom: Platform.OS === 'ios' ? 118 : 108,
  },

  hero: {
    minHeight: 122,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 22,
    overflow: 'hidden',
  },

  heroOrb: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
    right: -60,
    top: -70,
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  heroKicker: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.68)',
    marginBottom: 5,
  },

  heroTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 28,
    lineHeight: 32,
    color: COLORS.white,
    letterSpacing: -0.8,
  },

  heroSub: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 7,
  },

  collarsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },

  collarsText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 11,
    color: COLORS.white,
  },

  body: {
    paddingHorizontal: 15,
    marginTop: -14,
  },

  mapCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },

  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 12,
  },

  mapTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 17,
    color: COLORS.black,
    letterSpacing: -0.4,
  },

  mapSubtitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: COLORS.sage,
    marginTop: 3,
  },

  recenterBtn: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: COLORS.cream,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mapCanvas: {
    height: 410,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: COLORS.pasture,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(46,65,45,0.12)',
  },

  mapWorld: {
    position: 'absolute',
    left: '-16%',
    top: '-16%',
    width: '132%',
    height: '132%',
  },

  mapBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.pasture,
  },

  satellitePatchA: {
    position: 'absolute',
    left: '5%',
    top: '4%',
    width: '42%',
    height: '34%',
    borderRadius: 90,
    backgroundColor: 'rgba(93,137,79,0.20)',
    transform: [{ rotate: '-18deg' }],
  },

  satellitePatchB: {
    position: 'absolute',
    right: '0%',
    top: '8%',
    width: '44%',
    height: '32%',
    borderRadius: 90,
    backgroundColor: 'rgba(46,65,45,0.17)',
    transform: [{ rotate: '21deg' }],
  },

  satellitePatchC: {
    position: 'absolute',
    left: '12%',
    bottom: '4%',
    width: '52%',
    height: '28%',
    borderRadius: 100,
    backgroundColor: 'rgba(199,185,157,0.24)',
    transform: [{ rotate: '10deg' }],
  },

  satellitePatchD: {
    position: 'absolute',
    right: '7%',
    bottom: '10%',
    width: '36%',
    height: '30%',
    borderRadius: 90,
    backgroundColor: 'rgba(79,143,99,0.18)',
    transform: [{ rotate: '-23deg' }],
  },

  zoneMain: {
    position: 'absolute',
    left: '19%',
    top: '20%',
    width: '56%',
    height: '54%',
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.19)',
    borderWidth: 2,
    borderColor: 'rgba(46,65,45,0.45)',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },

  zoneGridA: {
    position: 'absolute',
    width: '140%',
    height: 1,
    backgroundColor: 'rgba(46,65,45,0.08)',
    top: '30%',
    left: '-20%',
    transform: [{ rotate: '-12deg' }],
  },

  zoneGridB: {
    position: 'absolute',
    width: '140%',
    height: 1,
    backgroundColor: 'rgba(46,65,45,0.08)',
    top: '58%',
    left: '-20%',
    transform: [{ rotate: '10deg' }],
  },

  zoneGridC: {
    position: 'absolute',
    width: 1,
    height: '140%',
    backgroundColor: 'rgba(46,65,45,0.08)',
    left: '48%',
    top: '-20%',
    transform: [{ rotate: '18deg' }],
  },

  zoneLabel: {
    position: 'absolute',
    top: 10,
    left: 12,
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 11,
    color: COLORS.primary,
    backgroundColor: 'rgba(246,246,236,0.86)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },

  waterArea: {
    position: 'absolute',
    left: '-8%',
    bottom: '12%',
    width: '50%',
    height: '18%',
    borderRadius: 80,
    backgroundColor: 'rgba(158,200,216,0.55)',
    transform: [{ rotate: '-18deg' }],
  },

  forestPatchOne: {
    position: 'absolute',
    right: '-8%',
    top: '10%',
    width: '30%',
    height: '26%',
    borderRadius: 80,
    backgroundColor: 'rgba(46,65,45,0.18)',
  },

  forestPatchTwo: {
    position: 'absolute',
    left: '6%',
    top: '6%',
    width: '22%',
    height: '20%',
    borderRadius: 80,
    backgroundColor: 'rgba(46,65,45,0.14)',
  },

  pathOne: {
    position: 'absolute',
    left: '4%',
    top: '48%',
    width: '92%',
    height: 18,
    borderRadius: 99,
    backgroundColor: 'rgba(199,185,157,0.58)',
    transform: [{ rotate: '-13deg' }],
  },

  pathTwo: {
    position: 'absolute',
    right: '-8%',
    top: '34%',
    width: '62%',
    height: 15,
    borderRadius: 99,
    backgroundColor: 'rgba(199,185,157,0.45)',
    transform: [{ rotate: '44deg' }],
  },

  pathThree: {
    position: 'absolute',
    left: '-6%',
    top: '18%',
    width: '64%',
    height: 12,
    borderRadius: 99,
    backgroundColor: 'rgba(199,185,157,0.36)',
    transform: [{ rotate: '28deg' }],
  },

  routeLine: {
    position: 'absolute',
    height: 3,
    borderRadius: 99,
    backgroundColor: 'rgba(46,65,45,0.45)',
  },

  dangerAreaTop: {
    position: 'absolute',
    right: '8%',
    top: '8%',
    width: '22%',
    height: '22%',
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'rgba(200,76,76,0.45)',
    backgroundColor: 'rgba(200,76,76,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dangerAreaBottom: {
    position: 'absolute',
    left: '7%',
    bottom: '7%',
    width: '22%',
    height: '20%',
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'rgba(200,76,76,0.45)',
    backgroundColor: 'rgba(200,76,76,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dangerAreaText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 10,
    color: COLORS.danger,
  },

  cowMarker: {
    position: 'absolute',
    backgroundColor: COLORS.white,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 7,
  },

  cowMarkerImage: {
    width: '78%',
    height: '78%',
    borderRadius: 999,
    resizeMode: 'cover',
    backgroundColor: COLORS.cream,
  },

  markerStatusDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.white,
  },

  markerLabel: {
    position: 'absolute',
    top: -28,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    minWidth: 72,
    alignItems: 'center',
  },

  markerLabelText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 10,
    color: COLORS.white,
  },

  compass: {
    position: 'absolute',
    top: 12,
    left: 12,
    minWidth: 60,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  compassText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 11,
    color: COLORS.primary,
  },

  zoomControls: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    gap: 8,
  },

  leftControls: {
    position: 'absolute',
    left: 12,
    top: 58,
    gap: 8,
  },

  mapBtn: {
    ...glass,
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  layerBtn: {
    ...glass,
    position: 'absolute',
    left: 12,
    bottom: 12,
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mapFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 12,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  legendDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },

  legendText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: COLORS.dark,
  },

  selectedCard: {
    marginTop: 16,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 5,
    padding: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },

  selectedTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'flex-start',
  },

  selectedIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },

  selectedImage: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: COLORS.cream,
  },

  selectedName: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16,
    color: COLORS.black,
    letterSpacing: -0.4,
  },

  selectedMeta: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: COLORS.sage,
    marginTop: 3,
  },

  selectedBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },

  selectedBadgeText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 10,
  },

  selectedInfoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 12,
  },

  infoMiniCard: {
    flex: 1,
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: COLORS.cream,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
  },

  infoMiniValue: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 14,
    color: COLORS.black,
    marginTop: 5,
  },

  infoMiniLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: COLORS.sage,
    marginTop: 2,
  },

  recoverBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  recoverBtnText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 13,
    color: COLORS.white,
  },

  safeBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(46,65,45,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(46,65,45,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  safeBtnText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 13,
    color: COLORS.primary,
  },

  sectionKicker: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: COLORS.sage,
    marginTop: 26,
    marginBottom: 10,
  },

  alertCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },

  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },

  alertImage: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.cream,
  },

  alertTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 14,
    color: COLORS.black,
  },

  alertDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: COLORS.dark,
    marginTop: 3,
    lineHeight: 16,
  },

  alertBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(200,76,76,0.12)',
  },

  alertBadgeText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 10,
    color: COLORS.danger,
  },

  zonesCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    marginBottom: 20,
  },

  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 10,
  },

  zoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },

  zoneName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: COLORS.black,
  },

  zoneMeta: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: COLORS.sage,
    marginTop: 2,
  },

  zoneActiveBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(79,143,99,0.12)',
  },

  zoneActiveText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 10,
    color: COLORS.success,
  },
});