import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Pressable,
  Modal,
  GestureResponderEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DateTime } from 'luxon';
import { useReflectionStore } from './store/reflectionStore';
import { getResponsiveSize, getResponsiveHeight } from '../utils/responsive';
import { useTheme } from '@/hooks/useTheme';
import type { Reflection } from '@/utils/database';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

type MoodKey = 'bright' | 'calm' | 'reflective' | 'heavy' | 'neutral';
type EnergyLevel = 'low' | 'medium' | 'high';

const POSITIVE_WORDS = [
  'joy',
  'happy',
  'excited',
  'love',
  'grateful',
  'grace',
  'proud',
  'sun',
  'light',
  'smile',
  'good',
  'win',
  'progress',
  'fun',
  'peaceful',
  'delight',
];

const HEAVY_WORDS = [
  'tired',
  'sad',
  'lonely',
  'stress',
  'anxious',
  'angry',
  'frustrated',
  'overwhelmed',
  'cry',
  'pain',
  'stuck',
  'lost',
  'worried',
  'fear',
];

const CALM_WORDS = [
  'calm',
  'slow',
  'still',
  'quiet',
  'rest',
  'breathe',
  'breath',
  'meditate',
  'balance',
  'gentle',
  'soft',
  'cozy',
];

const REFLECTIVE_WORDS = [
  'learned',
  'noticed',
  'realize',
  'wonder',
  'question',
  'journal',
  'ponder',
  'insight',
  'observe',
  'thought',
  'reflect',
];

const ENERGY_WORDS = [
  'running',
  'gym',
  'adventure',
  'travel',
  'buzzing',
  'charged',
  'wild',
  'dance',
];

const THEME_KEYWORDS: Record<string, string[]> = {
  gratitude: ['thankful', 'grateful', 'appreciate', 'blessed'],
  growth: ['habit', 'progress', 'learn', 'improve', 'practice', 'skill'],
  relationships: ['friend', 'family', 'call', 'together', 'hug', 'talk'],
  health: ['run', 'workout', 'sleep', 'breathe', 'yoga', 'meditate'],
  creativity: ['write', 'draw', 'design', 'music', 'create', 'paint'],
  calm: ['calm', 'peace', 'quiet', 'slow', 'still'],
};

const THEME_LABELS: Record<string, string> = {
  gratitude: 'Gratitude',
  growth: 'Growth',
  relationships: 'Connection',
  health: 'Health',
  creativity: 'Creativity',
  calm: 'Calm',
};

const MOOD_META: Record<
  MoodKey,
  { label: string; color: string; description: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  bright: {
    label: 'Bright Sparks',
    color: '#FFC857',
    description: 'uplifts & gratitude',
    icon: 'sunny',
  },
  calm: {
    label: 'Calm Waters',
    color: '#7FD1B9',
    description: 'slow + grounded days',
    icon: 'leaf',
  },
  reflective: {
    label: 'Deep Dive',
    color: '#A68DD8',
    description: 'thoughtful check-ins',
    icon: 'compass',
  },
  heavy: {
    label: 'Heavy Skies',
    color: '#FF7F87',
    description: 'stormy feels + venting',
    icon: 'cloudy',
  },
  neutral: {
    label: 'Everyday Notes',
    color: '#9FA4C4',
    description: 'observations + logs',
    icon: 'ellipse',
  },
};

interface EnhancedReflection extends Reflection {
  prompt: string;
  response: string;
  moodKey: MoodKey;
  moodLabel: string;
  moodColor: string;
  moodDescription: string;
  tags: string[];
  sentimentScore: number;
  energy: EnergyLevel;
  monthKey: string;
  snippet: string;
}

interface MonthSummary {
  month: string;
  entries: EnhancedReflection[];
  total: number;
  topMood: { key: MoodKey; label: string; color: string };
  moodBreakdown: { key: MoodKey; count: number }[];
}

const parseContent = (content: string) => {
  const lines = content.split('\n');
  const promptLineIndex = lines.findIndex(line => line.toLowerCase().startsWith('prompt:'));

  if (promptLineIndex === -1) {
    return { prompt: '', response: content };
  }

  const prompt = lines[promptLineIndex].substring(7).trim();
  const response = lines
    .slice(promptLineIndex + 1)
    .join('\n')
    .trim();

  return { prompt, response };
};

const analyzeMood = (text: string, prompt?: string) => {
  const combined = `${text} ${prompt || ''}`.toLowerCase();
  const tokens = combined.match(/[a-z']+/g) || [];

  const positiveHits = tokens.filter(word => POSITIVE_WORDS.includes(word)).length;
  const heavyHits = tokens.filter(word => HEAVY_WORDS.includes(word)).length;
  const calmHits = tokens.filter(word => CALM_WORDS.includes(word)).length;
  const reflectiveHits = tokens.filter(word => REFLECTIVE_WORDS.includes(word)).length;
  const energyHits = tokens.filter(word => ENERGY_WORDS.includes(word)).length;
  const exclamations = (text.match(/!/g) || []).length;
  const questionMarks = (text.match(/\?/g) || []).length;
  const gratitudeCue = combined.includes('gratitude') || combined.includes('thank');

  const sentimentScore = positiveHits - heavyHits;
  let moodKey: MoodKey = 'neutral';

  if (heavyHits >= 1 || sentimentScore <= -2) {
    moodKey = 'heavy';
  } else if (positiveHits >= 1 || sentimentScore >= 1 || gratitudeCue) {
    moodKey = 'bright';
  } else if (calmHits >= 1) {
    moodKey = 'calm';
  } else if (reflectiveHits >= 1 || questionMarks >= 1) {
    moodKey = 'reflective';
  }

  const meta = MOOD_META[moodKey];
  const tags = Object.entries(THEME_KEYWORDS).reduce<string[]>((acc, [key, words]) => {
    if (words.some(word => combined.includes(word))) {
      acc.push(THEME_LABELS[key]);
    }
    return acc;
  }, []);

  const energy: EnergyLevel =
    moodKey === 'heavy'
      ? 'low'
      : energyHits + exclamations >= 2 || positiveHits >= 2
        ? 'high'
        : 'medium';

  return {
    moodKey,
    moodLabel: meta.label,
    moodColor: meta.color,
    moodDescription: meta.description,
    tags: tags.slice(0, 3),
    sentimentScore,
    energy,
  };
};

const enhanceReflection = (reflection: Reflection): EnhancedReflection => {
  const { prompt, response } = parseContent(reflection.content);
  const textBody = (response || reflection.content || '').trim();
  const mood = analyzeMood(textBody, prompt);
  const monthKey = DateTime.fromISO(reflection.date).toFormat('MMMM yyyy');

  return {
    ...reflection,
    prompt,
    response,
    ...mood,
    monthKey,
    snippet: textBody.replace(/\s+/g, ' '),
  };
};

const groupByMonth = (entries: EnhancedReflection[]) => {
  const sorted = [...entries].sort(
    (a, b) => DateTime.fromISO(b.date).toMillis() - DateTime.fromISO(a.date).toMillis()
  );
  const groups = new Map<string, EnhancedReflection[]>();

  sorted.forEach(item => {
    if (!groups.has(item.monthKey)) {
      groups.set(item.monthKey, []);
    }
    groups.get(item.monthKey)!.push(item);
  });

  return Array.from(groups.entries());
};

const computeWritingStreak = (entries: EnhancedReflection[]) => {
  const dateSet = Array.from(new Set(entries.map(item => item.date))).sort();
  if (dateSet.length === 0) return 0;

  let longest = 0;
  let current = 0;
  let previous: DateTime | null = null;

  dateSet.forEach(dateStr => {
    const dt = DateTime.fromISO(dateStr).startOf('day');
    if (previous && dt.diff(previous, 'days').days === 1) {
      current += 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
    previous = dt;
  });

  return longest;
};

const computeStats = (entries: EnhancedReflection[]) => {
  if (!entries.length) {
    return {
      total: 0,
      months: 0,
      streak: 0,
      dominantMood: null,
      moodBreakdown: [] as { key: MoodKey; count: number }[],
      lastEntry: null as DateTime | null,
    };
  }

  const moodCounts: Record<MoodKey, number> = {
    bright: 0,
    calm: 0,
    reflective: 0,
    heavy: 0,
    neutral: 0,
  };

  entries.forEach(entry => {
    moodCounts[entry.moodKey] += 1;
  });

  const breakdown = Object.entries(moodCounts).map(([key, count]) => ({
    key: key as MoodKey,
    count,
  }));

  const dominant = breakdown.reduce((best, current) => {
    if (current.count > best.count) return current;
    return best;
  }, breakdown[0]);

  const lastEntry = entries.reduce<DateTime | null>((latest, item) => {
    const date = DateTime.fromISO(item.date);
    if (!latest || date > latest) return date;
    return latest;
  }, null);

  return {
    total: entries.length,
    months: new Set(entries.map(entry => entry.monthKey)).size,
    streak: computeWritingStreak(entries),
    dominantMood: dominant.count > 0 ? { key: dominant.key, ...MOOD_META[dominant.key] } : null,
    moodBreakdown: breakdown,
    lastEntry,
  };
};

export default function ReflectionWall() {
  const router = useRouter();
  const { colors, createThemedStyles } = useTheme();
  const { reflections, refreshReflections } = useReflectionStore();
  const [capsule, setCapsule] = React.useState<EnhancedReflection | null>(null);
  const [openBook, setOpenBook] = React.useState<{
    summary: MonthSummary;
    pageIndex: number;
  } | null>(null);

  React.useEffect(() => {
    refreshReflections();
  }, []);

  const enhancedEntries = React.useMemo(
    () => reflections.map(reflection => enhanceReflection(reflection)),
    [reflections]
  );

  const stats = React.useMemo(() => computeStats(enhancedEntries), [enhancedEntries]);

  const groupedEntries = React.useMemo(() => groupByMonth(enhancedEntries), [enhancedEntries]);

  const monthSummaries: MonthSummary[] = React.useMemo(() => {
    return groupedEntries.map(([month, entries]) => {
      const moodCounts: Record<MoodKey, number> = {
        bright: 0,
        calm: 0,
        reflective: 0,
        heavy: 0,
        neutral: 0,
      };
      entries.forEach(entry => {
        moodCounts[entry.moodKey] += 1;
      });
      const breakdown = Object.entries(moodCounts).map(([key, count]) => ({
        key: key as MoodKey,
        count,
      }));
      const topMoodKey =
        (breakdown.sort((a, b) => b.count - a.count)[0]?.key as MoodKey) ?? 'neutral';
      return {
        month,
        entries,
        total: entries.length,
        topMood: { key: topMoodKey, ...MOOD_META[topMoodKey] },
        moodBreakdown: breakdown,
      };
    });
  }, [groupedEntries]);

  const heroMood: { key: MoodKey } & {
    label: string;
    color: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
  } = stats.dominantMood ?? { key: 'neutral', ...MOOD_META.neutral };

  const styles = createThemedStyles(theme => ({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: getResponsiveHeight(24),
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: getResponsiveSize(24),
      paddingTop: getResponsiveHeight(20),
      paddingBottom: getResponsiveSize(10),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getResponsiveSize(12),
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getResponsiveSize(8),
    },
    iconButton: {
      padding: getResponsiveSize(8),
      borderRadius: getResponsiveSize(12),
    },
    heroCard: {
      marginHorizontal: getResponsiveSize(24),
      marginVertical: getResponsiveSize(16),
      padding: getResponsiveSize(20),
      borderRadius: getResponsiveSize(18),
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroMoodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    heroEyebrow: {
      fontFamily: 'MonaSans-Medium',
      fontSize: getResponsiveSize(13),
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    heroTitle: {
      fontFamily: 'MonaSans-Bold',
      fontSize: getResponsiveSize(28),
      marginTop: getResponsiveSize(6),
      marginBottom: getResponsiveSize(4),
      color: colors.text,
    },
    heroSubtitle: {
      fontFamily: 'MonaSans-Regular',
      fontSize: getResponsiveSize(14),
      color: colors.textSecondary,
      marginBottom: getResponsiveSize(16),
    },
    heroMoodBadge: {
      paddingHorizontal: getResponsiveSize(10),
      paddingVertical: getResponsiveSize(4),
      borderRadius: getResponsiveSize(999),
    },
    heroMoodBadgeText: {
      fontFamily: 'MonaSans-Medium',
      fontSize: getResponsiveSize(12),
      color: colors.background,
    },
    heroStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: getResponsiveSize(12),
    },
    heroStatBlock: {
      flex: 1,
      paddingRight: getResponsiveSize(12),
    },
    statValue: {
      fontFamily: 'MonaSans-Bold',
      fontSize: getResponsiveSize(20),
      color: colors.text,
    },
    statLabel: {
      fontFamily: 'MonaSans-Regular',
      fontSize: getResponsiveSize(12),
      color: colors.textSecondary,
      marginTop: getResponsiveSize(4),
    },
    moodBarTrack: {
      flexDirection: 'row',
      overflow: 'hidden',
      borderRadius: getResponsiveSize(999),
      height: getResponsiveSize(10),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      marginTop: getResponsiveSize(14),
    },
    sectionHeading: {
      fontFamily: 'MonaSans-Medium',
      fontSize: getResponsiveSize(16),
      color: colors.text,
      marginHorizontal: getResponsiveSize(24),
      marginTop: getResponsiveSize(12),
      marginBottom: getResponsiveSize(6),
    },
    shelfGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingHorizontal: getResponsiveSize(24),
      paddingVertical: getResponsiveSize(8),
    },
    bookCard: {
      width: '48%',
      marginBottom: getResponsiveSize(18),
      borderRadius: getResponsiveSize(18),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: getResponsiveSize(16),
    },
    bookMonth: {
      fontFamily: 'MonaSans-SemiBold',
      fontSize: getResponsiveSize(16),
      color: colors.text,
      marginBottom: getResponsiveSize(4),
    },
    bookMood: {
      fontFamily: 'MonaSans-Medium',
      fontSize: getResponsiveSize(14),
      marginBottom: getResponsiveSize(4),
    },
    bookMoodBar: {
      flexDirection: 'row',
      height: getResponsiveSize(10),
      borderRadius: getResponsiveSize(999),
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      marginTop: getResponsiveSize(10),
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: getResponsiveSize(8),
    },
    tagPill: {
      paddingHorizontal: getResponsiveSize(10),
      paddingVertical: getResponsiveSize(4),
      borderRadius: getResponsiveSize(999),
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tagText: {
      fontFamily: 'MonaSans-Medium',
      fontSize: getResponsiveSize(12),
      color: colors.textSecondary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: getResponsiveSize(32),
    },
    emptyText: {
      fontFamily: 'MonaSans-Regular',
      fontSize: getResponsiveSize(16),
      color: colors.textSecondary,
      textAlign: 'center',
    },
    capsuleOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: getResponsiveSize(24),
    },
    capsuleCard: {
      width: '100%',
      borderRadius: getResponsiveSize(24),
      padding: getResponsiveSize(20),
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    capsuleMood: {
      fontFamily: 'MonaSans-Medium',
      fontSize: getResponsiveSize(13),
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: getResponsiveSize(6),
    },
    capsuleTitle: {
      fontFamily: 'MonaSans-Bold',
      fontSize: getResponsiveSize(22),
      color: colors.text,
      marginBottom: getResponsiveSize(10),
    },
    capsuleBody: {
      fontFamily: 'MonaSans-Regular',
      fontSize: getResponsiveSize(15),
      color: colors.text,
      lineHeight: getResponsiveSize(24),
      marginBottom: getResponsiveSize(14),
    },
    capsuleClose: {
      alignSelf: 'flex-end',
      paddingHorizontal: getResponsiveSize(14),
      paddingVertical: getResponsiveSize(8),
      borderRadius: getResponsiveSize(999),
      borderWidth: 1,
      borderColor: colors.border,
    },
    capsuleCloseText: {
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
    },
    bookOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: getResponsiveSize(24),
    },
    bookReaderCard: {
      width: '100%',
      borderRadius: getResponsiveSize(24),
      padding: getResponsiveSize(20),
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      gap: getResponsiveSize(16),
    },
    bookReaderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    bookReaderMonth: {
      fontFamily: 'MonaSans-Bold',
      fontSize: getResponsiveSize(20),
      color: colors.text,
    },
    bookReaderMood: {
      fontFamily: 'MonaSans-Medium',
      fontSize: getResponsiveSize(14),
      marginTop: getResponsiveSize(4),
    },
    bookCloseButton: {
      padding: getResponsiveSize(4),
    },
    bookControls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: getResponsiveSize(12),
    },
    controlButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: getResponsiveSize(6),
      paddingVertical: getResponsiveSize(10),
      borderRadius: getResponsiveSize(12),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    controlButtonText: {
      fontFamily: 'MonaSans-Medium',
      fontSize: getResponsiveSize(14),
      color: colors.text,
    },
    pageCard: {
      borderRadius: getResponsiveSize(16),
      borderWidth: 1,
      borderColor: colors.border,
      padding: getResponsiveSize(16),
      backgroundColor: colors.background,
      gap: getResponsiveSize(10),
    },
    pageDate: {
      fontFamily: 'MonaSans-Medium',
      fontSize: getResponsiveSize(13),
      color: colors.textSecondary,
    },
    pageMood: {
      fontFamily: 'MonaSans-SemiBold',
      fontSize: getResponsiveSize(16),
    },
    pageBody: {
      fontFamily: 'MonaSans-Regular',
      fontSize: getResponsiveSize(15),
      lineHeight: getResponsiveSize(22),
      color: colors.text,
    },
  }));

  const currentPage = openBook ? openBook.summary.entries[openBook.pageIndex] : null;

  const openBookShelf = (summary: MonthSummary) => {
    if (!summary.entries.length) return;
    setOpenBook({ summary, pageIndex: 0 });
  };

  const closeBookShelf = () => setOpenBook(null);

  const goToNextPage = () =>
    setOpenBook(prev =>
      prev
        ? {
            summary: prev.summary,
            pageIndex: (prev.pageIndex + 1) % prev.summary.entries.length,
          }
        : prev
    );

  const goToRandomPage = () =>
    setOpenBook(prev =>
      prev
        ? {
            summary: prev.summary,
            pageIndex: Math.floor(Math.random() * prev.summary.entries.length),
          }
        : prev
    );

  const handleMemoryCapsule = () => {
    if (!enhancedEntries.length) return;
    const pick = enhancedEntries[Math.floor(Math.random() * enhancedEntries.length)];
    setCapsule(pick);
  };

  if (!reflections.length) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={colors.statusBarStyle} />
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={getResponsiveSize(28)} color={colors.text} />
            <Text
              style={{
                fontSize: getResponsiveSize(24),
                fontFamily: 'MonaSans-Medium',
                color: colors.text,
                marginBottom: getResponsiveSize(3),
              }}>
              Reflections Wall
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Once you log reflections they will bloom here 🌱</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBarStyle} />
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={getResponsiveSize(28)} color={colors.text} />
          <Text
            style={{
              fontSize: getResponsiveSize(24),
              fontFamily: 'MonaSans-Medium',
              color: colors.text,
              marginBottom: getResponsiveSize(3),
            }}>
            Reflections Wall
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroMoodRow}>
            <View>
              <Text style={styles.heroEyebrow}>Mood compass</Text>
              <Text style={styles.heroTitle}>{heroMood.label}</Text>
            </View>
            <View style={[styles.heroMoodBadge, { backgroundColor: heroMood.color }]}>
              <Text style={styles.heroMoodBadgeText}>
                {heroMood.key === 'neutral'
                  ? 'Balanced'
                  : heroMood.key.replace(/^\w/, s => s.toUpperCase())}
              </Text>
            </View>
          </View>
          <Text style={styles.heroSubtitle}>{heroMood.description}</Text>

          <View style={styles.moodBarTrack}>
            {stats.moodBreakdown.map(section => (
              <View
                key={section.key}
                style={{
                  flex: Math.max(1, section.count || 1),
                  backgroundColor: MOOD_META[section.key].color,
                  opacity: section.count === 0 ? 0.15 : 1,
                }}
              />
            ))}
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatBlock}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>entries captured</Text>
            </View>
            <View style={styles.heroStatBlock}>
              <Text style={styles.statValue}>{stats.months}</Text>
              <Text style={styles.statLabel}>months of journaling</Text>
            </View>
            <View style={styles.heroStatBlock}>
              <Text style={styles.statValue}>{stats.streak}</Text>
              <Text style={styles.statLabel}>day streak best</Text>
            </View>
          </View>

          {stats.lastEntry && (
            <Text style={[styles.heroSubtitle, { marginTop: getResponsiveSize(12) }]}>
              Last entry • {stats.lastEntry.toFormat('MMM d, yyyy')}
            </Text>
          )}
        </View>
        <Text style={styles.sectionHeading}>Monthly shelf</Text>
        <View style={styles.shelfGrid}>
          {monthSummaries.map(summary => (
            <TouchableOpacity
              key={summary.month}
              style={styles.bookCard}
              activeOpacity={0.85}
              onPress={() => openBookShelf(summary)}>
              <Text style={styles.bookMonth}>{summary.month}</Text>
              <Text style={[styles.bookMood, { color: summary.topMood.color }]}>
                {summary.topMood.label}
              </Text>
                <View style={styles.bookMoodBar}>
                  {summary.moodBreakdown.map(section => (
                    <View
                      key={`${summary.month}-${section.key}`}
                      style={{
                        flex: Math.max(1, section.count || 1),
                        backgroundColor: MOOD_META[section.key].color,
                        opacity: section.count === 0 ? 0.15 : 1,
                      }}
                    />
                  ))}
                </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal
        transparent
        visible={!!capsule}
        animationType="fade"
        onRequestClose={() => setCapsule(null)}>
        <Pressable style={styles.capsuleOverlay} onPress={() => setCapsule(null)}>
          {capsule && (
            <Animated.View entering={ZoomIn.springify()} style={styles.capsuleCard}>
              <Text style={[styles.capsuleMood, { color: capsule.moodColor }]}>
                {capsule.moodLabel}
              </Text>
              <Text style={styles.capsuleTitle}>
                {DateTime.fromISO(capsule.date).toFormat('MMM d, yyyy')}
              </Text>
              <Text style={styles.capsuleBody}>{capsule.snippet}</Text>
              <TouchableOpacity style={styles.capsuleClose} onPress={() => setCapsule(null)}>
                <Text style={styles.capsuleCloseText}>Close</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Pressable>
      </Modal>

      <Modal transparent visible={!!openBook} animationType="fade" onRequestClose={closeBookShelf}>
        <Pressable style={styles.bookOverlay} onPress={closeBookShelf}>
          {openBook && (
            <Pressable style={styles.bookReaderCard} onPress={event => event.stopPropagation()}>
              <View style={styles.bookReaderHeader}>
                <View>
                  <Text style={styles.bookReaderMonth}>{openBook.summary.month}</Text>
                  <Text style={[styles.bookReaderMood, { color: openBook.summary.topMood.color }]}>
                    {openBook.summary.topMood.label}
                  </Text>
                </View>
                <TouchableOpacity onPress={closeBookShelf} style={styles.bookCloseButton}>
                  <Ionicons name="close" size={getResponsiveSize(22)} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.bookControls}>
                <TouchableOpacity style={styles.controlButton} onPress={goToRandomPage}>
                  <Ionicons name="shuffle" size={getResponsiveSize(18)} color={colors.text} />
                  <Text style={styles.controlButtonText}>Random page</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={goToNextPage}>
                  <Ionicons name="arrow-forward" size={getResponsiveSize(18)} color={colors.text} />
                  <Text style={styles.controlButtonText}>Next entry</Text>
                </TouchableOpacity>
              </View>

              {currentPage && (
                <View style={styles.pageCard}>
                  <Text style={styles.pageDate}>
                    {DateTime.fromISO(currentPage.date).toFormat('MMM d, yyyy')}
                  </Text>
                  <Text style={[styles.pageMood, { color: currentPage.moodColor }]}>
                    {currentPage.moodLabel}
                  </Text>
                  <Text style={styles.pageBody}>{currentPage.snippet}</Text>
                  <View style={styles.tagRow}>
                    {currentPage.tags.length > 0 ? (
                      currentPage.tags.map(tag => (
                        <View key={`${currentPage.id}-${tag}`} style={styles.tagPill}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))
                    ) : (
                      <View style={styles.tagPill}>
                        <Text style={styles.tagText}>
                          {currentPage.energy === 'high'
                            ? 'High energy'
                            : currentPage.energy === 'low'
                              ? 'Soft pace'
                              : 'Steady pace'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
