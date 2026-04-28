import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
  Linking,
  I18nManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { getLanguage, setLanguage, t } from '../i18n';
import { CHATBOT_API_BASE_URL } from '../config/api';
import {
  classifySkinImage,
  sendChatMessage,
  synthesizeToFile,
  transcribeAudio,
} from '../services/chatbotApi';

const SESSION_KEY = 'bovitech.chat.session';

const cardShadow =
  Platform.OS === 'ios'
    ? {
        shadowColor: '#1B4332',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.06,
        shadowRadius: 22,
      }
    : { elevation: 3 };

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function agentTtsText(agent, data, lang) {
  if (!data || typeof data !== 'object') return '';
  const ar = lang === 'ar';
  if (agent === 'skin') {
    const header = ar
      ? data.is_healthy
        ? 'الجلد يبدو سليماً'
        : 'تم اكتشاف حالة جلدية محتملة'
      : data.is_healthy
        ? 'Peau apparemment saine'
        : 'Condition cutanée potentielle détectée';
    const disc = ar
      ? 'هذا النتيجة للمساعدة فقط وليست تشخيصاً طبياً نهائياً.'
      : 'Ce résultat est une aide au repérage, pas un diagnostic définitif.';
    return `${header}. ${data.predicted_class || ''}. ${data.description || ''}. ${disc}`;
  }
  if (agent === 'vet') {
    if (!data.found || !data.best) return ar ? 'لم يتم العثور على طبيب بيطري' : 'Aucun vétérinaire trouvé';
    return `${data.best.name}. ${data.best.distance_km} km. ${data.best.phone || ''}`;
  }
  if (agent === 'meteo') {
    return [data.decision, data.temp, data.reason, data.tip].filter(Boolean).join('. ');
  }
  if (agent === 'feed') {
    return [data.main_feed, data.supplement, data.water, data.tip].filter(Boolean).join('. ');
  }
  return JSON.stringify(data);
}

function SkinAgentCard({ data, lang }) {
  const ar = lang === 'ar';
  const pct = Math.round((data.confidence || 0) * 100);
  const levelLabels = {
    high: ar ? 'ثقة عالية' : 'Confiance élevée',
    medium: ar ? 'ثقة متوسطة' : 'Confiance moyenne',
    low: ar ? 'ثقة منخفضة' : 'Confiance faible',
  };
  const barColors = {
    Healthy: '#2d6a4f',
    Lumpy: '#c0392b',
    Dermatophilosis: '#e67e22',
    Pediculosis: '#8e44ad',
    Ringworm: '#2980b9',
  };
  const sorted = data.probabilities
    ? Object.entries(data.probabilities).sort((a, b) => b[1] - a[1])
    : [];
  const headerText = ar
    ? data.is_healthy
      ? 'الجلد يبدو سليماً'
      : 'تم اكتشاف حالة جلدية محتملة'
    : data.is_healthy
      ? 'Peau apparemment saine'
      : 'Condition cutanée potentielle détectée';
  const disclaimer = ar
    ? 'هذا النتيجة للمساعدة فقط وليست تشخيصاً طبياً نهائياً. استشر طبيباً بيطرياً للتأكيد.'
    : 'Ce résultat est une aide au repérage, pas un diagnostic définitif. Consultez un vétérinaire pour confirmation.';

  return (
    <View style={[styles.agentCard, styles.skinCard]}>
      <Text style={styles.skinHeader}>
        {data.is_healthy ? '✅ ' : '🔬 '}
        {headerText}
      </Text>
      <View style={[styles.skinBadge, styles[`skinBadge_${data.level || 'medium'}`]]}>
        <Text style={styles.skinBadgeText}>
          {(levelLabels[data.level] || data.level) + ` — ${pct}%`}
        </Text>
      </View>
      <Text style={styles.skinClass}>{data.predicted_class}</Text>
      <Text style={styles.skinDesc}>{data.description}</Text>
      <View style={styles.skinBars}>
        {sorted.map(([cls, prob]) => {
          const p = Math.round(Number(prob) * 100);
          const fill = barColors[cls] || '#888';
          return (
            <View key={cls} style={styles.skinBarRow}>
              <Text style={styles.skinBarLabel} numberOfLines={1}>
                {cls}
              </Text>
              <View style={styles.skinBarTrack}>
                <View style={[styles.skinBarFill, { width: `${p}%`, backgroundColor: fill }]} />
              </View>
              <Text style={styles.skinBarPct}>{p}%</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.skinDisclaimer}>⚕️ {disclaimer}</Text>
    </View>
  );
}

function VetAgentCard({ data, lang }) {
  const ar = lang === 'ar';
  if (!data.found || !data.best) {
    return (
      <View style={[styles.agentCard, styles.vetCard]}>
        <Text style={styles.vetTitle}>{ar ? '❌ لم يتم العثور على طبيب بيطري' : '❌ Aucun vétérinaire trouvé'}</Text>
        <Text style={styles.mutedSmall}>
          {ar ? 'حاول Google Maps أو وسّع نطاق البحث.' : 'Essayez Google Maps ou augmentez la zone de recherche.'}
        </Text>
      </View>
    );
  }
  const { name, distance_km, phone, map_url } = data.best;
  return (
    <View style={[styles.agentCard, styles.vetCard]}>
      {!!data.warning && <Text style={styles.vetWarning}>⚠️ {data.warning}</Text>}
      <Text style={styles.vetTitle}>🐄 {ar ? 'الطبيب البيطري الموصى به' : 'Vétérinaire recommandé'}</Text>
      <Text style={styles.vetName}>
        📍 {name} — <Text style={styles.mutedSmall}>{distance_km} km</Text>
      </Text>
      <Text style={styles.vetPhone}>📞 {phone || (ar ? 'غير متوفر' : 'Téléphone non disponible')}</Text>
      {!!map_url && (
        <TouchableOpacity style={styles.mapBtn} onPress={() => Linking.openURL(map_url)} activeOpacity={0.85}>
          <Text style={styles.mapBtnText}>📍 {ar ? 'عرض على خرائط Google' : 'Voir sur Google Maps'}</Text>
        </TouchableOpacity>
      )}
      {Array.isArray(data.others) && data.others.length > 0 && (
        <View style={styles.vetOthers}>
          <Text style={styles.mutedSmall}>🔹 {ar ? 'خيارات أخرى' : 'Autres options'}</Text>
          {data.others.map((v) => (
            <TouchableOpacity key={v.name} onPress={() => v.map_url && Linking.openURL(v.map_url)}>
              <Text style={styles.vetOtherLine}>• {v.name} — {v.distance_km} km</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function MeteoAgentCard({ data, lang }) {
  const ar = lang === 'ar';
  const { decision, temp, rain, wind, is_day, next_3h_rain_pct, reason, tip } = data;
  const configs = {
    out: { color: '#2d6a4f', header: ar ? '🌤️ الطقس مناسب' : '🌤️ Conditions favorables', verdict: ar ? '✅ يمكن إخراج الأبقار' : '✅ Les vaches peuvent sortir' },
    in: {
      color: '#c0392b',
      header: is_day ? (ar ? '🌧️ الطقس غير مناسب' : '🌧️ Conditions défavorables') : ar ? '🌙 وقت الليل' : '🌙 C’est la nuit',
      verdict: is_day ? (ar ? '❌ أبقِ الأبقار في الداخل' : '❌ Gardez les vaches à l’intérieur') : ar ? '❌ الأبقار تبقى في الداخل' : '❌ Les vaches restent à l’intérieur',
    },
    limited: { color: '#e67e22', header: ar ? '⚠️ خروج محدود' : '⚠️ Sortie limitée', verdict: ar ? '⚠️ الخروج صباحاً أو مساءً فقط' : '⚠️ Sortir tôt matin / soir uniquement' },
  };
  const cfg = configs[decision] || configs.out;
  const timeLabel = is_day ? '☀️ Jour' : '🌙 Nuit';
  const rainWarn =
    next_3h_rain_pct > 60
      ? ar
        ? `🌂 احتمال مطر خلال 3 ساعات (${next_3h_rain_pct}%)`
        : `🌂 Pluie probable dans 3h (${next_3h_rain_pct}%)`
      : null;

  return (
    <View style={[styles.agentCard, styles.meteoCard, { borderColor: cfg.color }]}>
      <Text style={styles.meteoHeader}>{cfg.header}</Text>
      <Text style={[styles.meteoVerdict, { color: cfg.color }]}>{cfg.verdict}</Text>
      <Text style={styles.meteoStats}>
        🌡️ {temp}°C | 🌧️ {rain}mm | 💨 {wind} km/h | {timeLabel}
      </Text>
      {rainWarn ? <Text style={styles.meteoRain}>{rainWarn}</Text> : null}
      <Text style={styles.meteoReason}>• {reason}</Text>
      <Text style={styles.meteoTip}>👉 {tip}</Text>
    </View>
  );
}

function FeedAgentCard({ data, lang }) {
  const ar = lang === 'ar';
  const { season, temp, is_day, main_feed, supplement, water, warning, tip } = data;
  const seasonEmoji = { hiver: '❄️', printemps: '🌱', été: '☀️', automne: '🍂' }[season] || '🌿';
  const timeLabel = is_day ? (ar ? 'صباح' : 'matin') : ar ? 'مساء/ليل' : 'soir/nuit';
  const labels = ar
    ? { title: 'توصيات التغذية اليوم', main: '🌾 العلف الأساسي', supp: '💊 المكملات', water: '💧 الماء', tip: '👉 نصيحة' }
    : { title: "Alimentation recommandée aujourd'hui", main: '🌾 Fourrage principal', supp: '💊 Compléments', water: '💧 Eau', tip: '👉 Conseil' };

  return (
    <View style={[styles.agentCard, styles.feedCard]}>
      <Text style={styles.feedTitle}>
        {seasonEmoji} {labels.title}
      </Text>
      <Text style={styles.feedStats}>
        🌡️ {temp}°C | {seasonEmoji} {season} | 🕐 {timeLabel}
      </Text>
      <View style={styles.feedRow}>
        <Text style={styles.feedLabel}>{labels.main}</Text>
        <Text style={styles.feedVal}>{main_feed}</Text>
      </View>
      <View style={styles.feedRow}>
        <Text style={styles.feedLabel}>{labels.supp}</Text>
        <Text style={styles.feedVal}>{supplement}</Text>
      </View>
      <View style={styles.feedRow}>
        <Text style={styles.feedLabel}>{labels.water}</Text>
        <Text style={styles.feedVal}>{water}</Text>
      </View>
      {!!warning && <Text style={styles.feedWarning}>⚠️ {warning}</Text>}
      <Text style={styles.feedTip}>
        {labels.tip} {tip}
      </Text>
    </View>
  );
}

function TypingDots() {
  return (
    <View style={styles.typingBubble}>
      <View style={styles.typingDot} />
      <View style={[styles.typingDot, { opacity: 0.7 }]} />
      <View style={[styles.typingDot, { opacity: 0.4 }]} />
    </View>
  );
}

export default function ChatbotScreen() {
  const [text, setText] = React.useState('');
  const [messages, setMessages] = React.useState(() => [
    {
      id: 'seed-1',
      role: 'assistant',
      createdAt: nowTime(),
      msgKind: 'text',
      text: t('assistant.hello'),
    },
  ]);
  const [imageUri, setImageUri] = React.useState(null);
  /** MIME expo-image-picker (aide le multipart + copie content://) */
  const [imageMimeType, setImageMimeType] = React.useState(null);
  const [pending, setPending] = React.useState(false);
  const [showTyping, setShowTyping] = React.useState(false);
  const [backendOnline, setBackendOnline] = React.useState(true);
  const [langModal, setLangModal] = React.useState(false);
  const [uiLang, setUiLang] = React.useState(() => getLanguage());
  const [ttsBusyId, setTtsBusyId] = React.useState(null);
  const [playingId, setPlayingId] = React.useState(null);

  const sessionIdRef = React.useRef(`mobile-${Date.now()}`);
  const flatRef = React.useRef(null);
  const recordingRef = React.useRef(null);
  const soundRef = React.useRef(null);
  const [isRecording, setIsRecording] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem(SESSION_KEY);
        if (s) sessionIdRef.current = s;
        else {
          await AsyncStorage.setItem(SESSION_KEY, sessionIdRef.current);
        }
      } catch (e) {
        /* ignore */
      }
    })();
  }, []);

  React.useEffect(
    () => () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    },
    [],
  );

  const scrollEnd = React.useCallback(() => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const appendAssistantText = React.useCallback(
    (txt) => {
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          role: 'assistant',
          createdAt: nowTime(),
          msgKind: 'text',
          text: txt,
        },
      ]);
      scrollEnd();
    },
    [scrollEnd],
  );

  const appendAssistantAgent = React.useCallback(
    (agent, data, lang) => {
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          role: 'assistant',
          createdAt: nowTime(),
          msgKind: 'agent',
          agent,
          agentData: data,
          lang,
        },
      ]);
      scrollEnd();
    },
    [scrollEnd],
  );

  const resolveLocation = React.useCallback(async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm?.granted) return { lat: null, lon: null };
      const pos = await Location.getCurrentPositionAsync({});
      return { lat: pos?.coords?.latitude ?? null, lon: pos?.coords?.longitude ?? null };
    } catch (e) {
      return { lat: null, lon: null };
    }
  }, []);

  const stopPlayback = React.useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (e) {
      /* ignore */
    }
    setPlayingId(null);
  }, []);

  const playTtsForMessage = React.useCallback(
    async (msgId, plainText, langCode) => {
      await stopPlayback();
      if (!plainText?.trim()) return;
      setTtsBusyId(msgId);
      try {
        const path = await synthesizeToFile({ text: plainText, lang: langCode });
        const { sound } = await Audio.Sound.createAsync({ uri: path });
        soundRef.current = sound;
        setPlayingId(msgId);
        sound.setOnPlaybackStatusUpdate((s) => {
          if (s.didJustFinish) {
            stopPlayback();
          }
        });
        await sound.playAsync();
      } catch (e) {
        appendAssistantText(`❌ TTS: ${e.message || 'erreur'}`);
      } finally {
        setTtsBusyId(null);
      }
    },
    [appendAssistantText, stopPlayback],
  );

  const send = async (payload = {}) => {
    const userText = (payload.text ?? text).trim();
    const userImage = payload.imageUri ?? imageUri;
    const userMime = payload.imageMimeType ?? imageMimeType;
    if (!userText && !userImage) return;

    const langCode = getLanguage() === 'ar' ? 'ar' : 'fr';

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      createdAt: nowTime(),
      text:
        userText ||
        (userImage ? (langCode === 'ar' ? '(صورة)' : '(image)') : ''),
      imageUri: userImage || null,
    };

    setMessages((m) => [...m, userMsg]);
    setText('');
    setImageUri(null);
    setImageMimeType(null);
    setPending(true);
    setBackendOnline(true);

    try {
      if (userImage) {
        const skinResponse = await classifySkinImage({
          imageUri: userImage,
          lang: langCode,
          message: userText || undefined,
          mimeType: userMime || undefined,
        });
        if (skinResponse?.type === 'agent' && skinResponse.agent === 'skin') {
          appendAssistantAgent('skin', skinResponse.data, langCode);
        } else if (skinResponse?.type === 'text') {
          appendAssistantText(skinResponse.content || '');
        } else {
          appendAssistantText(JSON.stringify(skinResponse));
        }
        setPending(false);
        scrollEnd();
        return;
      }

      if (!userText) {
        setPending(false);
        return;
      }

      setShowTyping(true);
      let streamMsgId = null;
      let firstChunk = false;

      const loc = await resolveLocation();
      const result = await sendChatMessage({
        message: userText,
        sessionId: sessionIdRef.current,
        lang: langCode,
        lat: loc.lat,
        lon: loc.lon,
        onStreamChunk: (_chunk, full) => {
          if (!firstChunk) {
            firstChunk = true;
            setShowTyping(false);
          }
          if (!streamMsgId) {
            streamMsgId = `stream-${Date.now()}`;
            setMessages((m) => [
              ...m,
              {
                id: streamMsgId,
                role: 'assistant',
                createdAt: nowTime(),
                msgKind: 'text',
                text: full,
                streaming: true,
              },
            ]);
          } else {
            setMessages((m) =>
              m.map((x) => (x.id === streamMsgId ? { ...x, text: full, streaming: true } : x)),
            );
          }
          scrollEnd();
        },
      });

      setShowTyping(false);

      if (result?.type === 'agent') {
        if (streamMsgId) setMessages((m) => m.filter((x) => x.id !== streamMsgId));
        appendAssistantAgent(result.agent, result.data, langCode);
      } else if (result?.type === 'text') {
        if (streamMsgId) {
          setMessages((m) =>
            m.map((x) =>
              x.id === streamMsgId ? { ...x, text: result.content || '', streaming: false } : x,
            ),
          );
        } else {
          appendAssistantText(result.content || '');
        }
      }

      scrollEnd();
    } catch (e) {
      setBackendOnline(false);
      appendAssistantText(`❌ ${e.message || 'Erreur réseau'}`);
    } finally {
      setPending(false);
      setShowTyping(false);
    }
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm?.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
    });
    if (result?.canceled) return;
    const asset = result?.assets?.[0];
    if (asset?.uri) {
      setImageUri(asset.uri);
      setImageMimeType(asset.mimeType || null);
    }
  };

  const captureFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm?.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
    });
    if (result?.canceled) return;
    const asset = result?.assets?.[0];
    if (asset?.uri) {
      setImageUri(asset.uri);
      setImageMimeType(asset.mimeType || null);
    }
  };

  const toggleMic = async () => {
    const langCode = getLanguage() === 'ar' ? 'ar' : 'fr';
    if (!isRecording) {
      try {
        const perm = await Audio.requestPermissionsAsync();
        if (!perm.granted) return;
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const rec = new Audio.Recording();
        await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await rec.startAsync();
        recordingRef.current = rec;
        setIsRecording(true);
      } catch (e) {
        appendAssistantText(langCode === 'ar' ? '⚠️ لا يمكن استخدام الميكروفون' : '⚠️ Microphone inaccessible');
      }
    } else {
      try {
        const rec = recordingRef.current;
        recordingRef.current = null;
        setIsRecording(false);
        if (!rec) return;
        await rec.stopAndUnloadAsync();
        const uri = rec.getURI();
        if (!uri) return;
        const data = await transcribeAudio({ uri, lang: langCode });
        if (data.status === 'incomprehensible' || !data.text?.trim()) {
          setText('');
          return;
        }
        send({ text: data.text.trim(), imageUri: null });
      } catch (e) {
        appendAssistantText(langCode === 'ar' ? '⚠️ خطأ STT' : '⚠️ Erreur STT');
      }
    }
  };

  const onPickLanguage = async (code) => {
    await setLanguage(code);
    setUiLang(code);
    setLangModal(false);
  };

  const placeholder =
    imageUri && !text
      ? t('assistant.placeholderImageHint')
      : t('assistant.placeholder');

  const renderAgent = (item) => {
    const lang = item.lang || (getLanguage() === 'ar' ? 'ar' : 'fr');
    switch (item.agent) {
      case 'skin':
        return <SkinAgentCard data={item.agentData} lang={lang} />;
      case 'vet':
        return <VetAgentCard data={item.agentData} lang={lang} />;
      case 'meteo':
        return <MeteoAgentCard data={item.agentData} lang={lang} />;
      case 'feed':
        return <FeedAgentCard data={item.agentData} lang={lang} />;
      default:
        return <Text style={styles.msgTextBot}>{JSON.stringify(item.agentData, null, 2)}</Text>;
    }
  };

  const renderItem = ({ item }) => {
    const isUser = item.role === 'user';
    const isRtl = I18nManager.isRTL;

    if (isUser) {
      return (
        <View style={[styles.msgRow, isRtl ? styles.msgRowUserRtl : styles.msgRowUser]}>
          <View style={[styles.msgUser]}>
            {!!item.imageUri && <Image source={{ uri: item.imageUri }} style={styles.msgImage} />}
            {!!item.text ? <Text style={styles.msgTextUser}>{item.text}</Text> : null}
            <Text style={styles.msgMetaUser}>{item.createdAt}</Text>
          </View>
        </View>
      );
    }

    const langCode = getLanguage() === 'ar' ? 'ar' : 'fr';
    const ttsSource =
      item.msgKind === 'agent'
        ? agentTtsText(item.agent, item.agentData, langCode)
        : item.text || '';

    return (
      <View style={[styles.msgRow, styles.msgRowBot]}>
        <View style={[styles.msgBot]}>
          {item.msgKind === 'agent' ? renderAgent(item) : <Text style={styles.msgTextBot}>{item.text}</Text>}
          <View style={styles.ttsRow}>
            <TouchableOpacity
              style={[styles.ttsBtn, playingId === item.id && styles.ttsBtnPlaying]}
              disabled={!!ttsBusyId}
              onPress={() => playTtsForMessage(item.id, ttsSource, langCode)}
            >
              {ttsBusyId === item.id ? (
                <Text style={styles.ttsBtnText}>{t('assistant.ttsLoading')}</Text>
              ) : (
                <Text style={styles.ttsBtnText}>{playingId === item.id ? '🔊 …' : `🔊 ${t('assistant.listen')}`}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ttsBtn}
              onPress={stopPlayback}
              disabled={playingId !== item.id}
            >
              <Text style={[styles.ttsBtnText, { opacity: playingId === item.id ? 1 : 0.4 }]}>⏹ {t('assistant.stop')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.msgMetaBot}>{item.createdAt}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <View style={styles.headerDecor} />
          <View style={styles.headerTop}>
            <View style={styles.headerIcon}>
              <Text style={{ fontSize: 22 }}>🐄</Text>
            </View>
            <View style={styles.headerTitles}>
              <View style={styles.headerKickerPill}>
                <Text style={styles.headerKickerText}>{t('assistant.headerKicker')}</Text>
              </View>
              <Text style={styles.headerTitle}>{t('assistant.headerTitle')}</Text>
              <Text style={styles.headerSub}>{t('assistant.headerSub')}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.langBtn} onPress={() => setLangModal(true)} activeOpacity={0.85}>
                <Text style={styles.langBtnText}>{uiLang === 'ar' ? 'العربية' : 'Français'} ▾</Text>
              </TouchableOpacity>
              <View style={styles.statusDot} />
            </View>
          </View>
        </View>

        <View style={[styles.chatCard, cardShadow]}>
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            onContentSizeChange={scrollEnd}
            contentContainerStyle={styles.chatList}
            ListFooterComponent={
              showTyping ? (
                <View style={styles.msgRowBot}>
                  <TypingDots />
                </View>
              ) : null
            }
            showsVerticalScrollIndicator={false}
          />
        </View>

        {!!imageUri && (
          <View style={styles.previewStrip}>
            <Image source={{ uri: imageUri }} style={styles.previewThumb} />
            <Text style={styles.previewName} numberOfLines={1}>
              {t('assistant.photoSelected')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setImageUri(null);
                setImageMimeType(null);
              }}
              hitSlop={12}
            >
              <Text style={styles.previewRemove}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.composer}>
          <View style={styles.composerRow}>
            <TouchableOpacity
              style={[styles.roundBtn, styles.micBtn, isRecording && styles.micRecording]}
              onPress={toggleMic}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 17 }}>🎤</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roundBtn, styles.imgBtn, !!imageUri && styles.imgBtnActive]} onPress={pickFromGallery} activeOpacity={0.85}>
              <Text style={{ fontSize: 18 }}>🔬</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roundBtn, styles.imgBtn]} onPress={captureFromCamera} activeOpacity={0.85}>
              <Ionicons name="camera-outline" size={20} color={imageUri ? colors.green : colors.grayMid} />
            </TouchableOpacity>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={placeholder}
              placeholderTextColor={colors.grayMid}
              style={styles.input}
              multiline
            />
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={() => {
                if (!pending) send({ text, imageUri });
              }}
              activeOpacity={0.85}
            >
              {pending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
          {typeof __DEV__ !== 'undefined' && __DEV__ ? (
            <Text style={styles.hintUrl} numberOfLines={1}>
              API {backendOnline ? '' : '(offline) '}
              {CHATBOT_API_BASE_URL}
            </Text>
          ) : null}
        </View>
      </View>

      <Modal visible={langModal} transparent animationType="fade" onRequestClose={() => setLangModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setLangModal(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('assistant.headerKicker')}</Text>
            <TouchableOpacity style={styles.modalRow} onPress={() => onPickLanguage('fr')}>
              <Text style={styles.modalRowText}>Français</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalRow} onPress={() => onPickLanguage('ar')}>
              <Text style={styles.modalRowText}>العربية</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f5f0' },
  shell: { flex: 1, backgroundColor: '#f4f7f5' },
  header: {
    backgroundColor: colors.green,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  headerDecor: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    right: -50,
    top: -80,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', zIndex: 1, paddingBottom: 2 },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitles: { flex: 1, marginLeft: 12 },
  headerKickerPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 8,
  },
  headerKickerText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 6,
    lineHeight: 18,
    fontWeight: '400',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  langBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  langBtnText: { fontSize: 12, color: '#fff' },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#52b788',
    borderWidth: 2,
    borderColor: '#d8f3dc',
  },

  chatCard: {
    flex: 1,
    marginHorizontal: 0,
    backgroundColor: '#f4f7f5',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  chatList: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 24 },

  msgRow: { marginBottom: 12, flexDirection: 'row' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowUserRtl: { justifyContent: 'flex-start' },
  msgRowBot: { justifyContent: 'flex-start' },

  msgUser: {
    maxWidth: '82%',
    backgroundColor: colors.greenMid,
    borderRadius: 18,
    borderBottomRightRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  msgBot: {
    maxWidth: '92%',
    backgroundColor: '#fff',
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  msgTextUser: { color: '#fff', fontSize: 14, lineHeight: 20 },
  msgTextBot: { color: colors.text, fontSize: 14, lineHeight: 22 },
  msgMetaUser: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 6, textAlign: 'right' },
  msgMetaBot: { fontSize: 10, color: colors.grayMid, marginTop: 6, textAlign: 'right' },
  msgImage: { width: '100%', height: 160, borderRadius: 10, marginBottom: 8 },

  ttsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, paddingLeft: 2 },
  ttsBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  ttsBtnPlaying: { backgroundColor: colors.greenLight, borderColor: colors.greenMid },
  ttsBtnText: { fontSize: 12, color: colors.grayMid },

  typingBubble: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.grayMid,
  },

  agentCard: { borderRadius: 14, paddingVertical: 4 },
  skinCard: { borderWidth: 2, borderColor: '#7b5ea7', padding: 12, borderRadius: 14 },
  skinHeader: { fontWeight: '700', fontSize: 15, marginBottom: 6, color: colors.text },
  skinBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginBottom: 8 },
  skinBadge_high: { backgroundColor: '#e8f5e9' },
  skinBadge_medium: { backgroundColor: '#fff3e0' },
  skinBadge_low: { backgroundColor: '#fce4ec' },
  skinBadgeText: { fontSize: 12, fontWeight: '600', color: colors.text },
  skinClass: { fontWeight: '600', fontSize: 16, marginBottom: 4 },
  skinDesc: { color: colors.grayMid, fontSize: 13, marginBottom: 10 },
  skinBars: { gap: 6, marginBottom: 10 },
  skinBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  skinBarLabel: { minWidth: 110, maxWidth: 130, fontSize: 12, color: colors.text },
  skinBarTrack: { flex: 1, height: 6, backgroundColor: '#f0ede8', borderRadius: 3, overflow: 'hidden' },
  skinBarFill: { height: '100%', borderRadius: 3 },
  skinBarPct: { width: 40, fontSize: 12, color: colors.grayMid, textAlign: 'right' },
  skinDisclaimer: { fontSize: 12, color: colors.grayMid, fontStyle: 'italic', borderTopWidth: 1, borderColor: colors.border, paddingTop: 8, marginTop: 4 },

  vetCard: { backgroundColor: colors.greenLight, borderWidth: 1, borderColor: colors.greenMid, padding: 12, borderRadius: 14 },
  vetTitle: { fontWeight: '700', fontSize: 15, color: colors.green, marginBottom: 6 },
  vetName: { fontWeight: '600', fontSize: 14 },
  vetPhone: { fontSize: 13, color: colors.grayMid, marginTop: 4 },
  vetWarning: { color: colors.amber, fontSize: 13, marginBottom: 6 },
  vetOthers: { marginTop: 8, borderTopWidth: 1, borderColor: colors.border, paddingTop: 8 },
  vetOtherLine: { fontSize: 13, color: colors.greenMid, marginTop: 4 },
  mutedSmall: { fontSize: 12, color: colors.grayMid },
  mapBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.green,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  mapBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  meteoCard: { borderWidth: 2, padding: 12, borderRadius: 14, backgroundColor: '#fff' },
  meteoHeader: { fontWeight: '600', fontSize: 15, marginBottom: 2 },
  meteoVerdict: { fontWeight: '700', fontSize: 15, marginBottom: 6 },
  meteoStats: {
    fontSize: 12,
    color: colors.grayMid,
    backgroundColor: '#f7f5f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  meteoRain: { color: colors.blue, fontSize: 13, marginVertical: 4 },
  meteoReason: { marginTop: 4 },
  meteoTip: { marginTop: 6, fontStyle: 'italic', color: colors.grayMid },

  feedCard: { borderWidth: 2, borderColor: '#52b788', padding: 12, borderRadius: 14, backgroundColor: '#fff' },
  feedTitle: { fontWeight: '700', fontSize: 15, color: colors.green, marginBottom: 6 },
  feedStats: {
    fontSize: 12,
    color: colors.grayMid,
    backgroundColor: '#f7f5f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  feedRow: { flexDirection: 'row', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.border },
  feedLabel: { fontWeight: '600', minWidth: 120, color: colors.text },
  feedVal: { flex: 1, color: colors.text },
  feedWarning: { color: colors.amber, fontWeight: '600', marginTop: 8 },
  feedTip: { marginTop: 8, fontStyle: 'italic', color: colors.grayMid },

  previewStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  previewThumb: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  previewName: { flex: 1, fontSize: 12, color: colors.grayMid },
  previewRemove: { fontSize: 16, color: colors.grayMid, paddingHorizontal: 6 },

  composer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
  },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBtn: { backgroundColor: colors.greenLight },
  micRecording: { backgroundColor: '#ffe0e0' },
  imgBtn: { backgroundColor: '#f0f0e8' },
  imgBtnActive: { backgroundColor: colors.greenLight },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#f7f5f0',
    color: colors.text,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintUrl: { fontSize: 10, color: colors.grayMid, marginTop: 6 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12, color: colors.text },
  modalRow: { paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.divider },
  modalRowText: { fontSize: 16, color: colors.text },
});
