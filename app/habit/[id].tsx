import React from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHabitStore, PASTEL_COLORS } from '@/app/store/habitStore';
import type { Habit } from '@/utils/database';
import { useTheme } from '@/hooks/useTheme';
import { getResponsiveHeight, getResponsiveSize } from '@/utils/responsive';
import { HabitHistory } from '@/app/components/HabitHistory';
import { clientTools } from '@/utils/tools';
import { DateTime } from 'luxon';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export default function HabitDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const habitId = Number(params.id);
  const { colors, createThemedStyles } = useTheme();
  const { habits, refreshHabits, updateHabitColor, archiveHabit, unarchiveHabit, deleteHabit } =
    useHabitStore();

  const habit = habits.find(h => h.id === habitId) as Habit | undefined;
  const [title, setTitle] = React.useState(habit?.title || '');
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [selectedColor, setSelectedColor] = React.useState<string>(
    habit?.color || PASTEL_COLORS[0]
  );

  React.useEffect(() => {
    refreshHabits();
  }, []);

  React.useEffect(() => {
    if (habit) {
      setTitle(habit.title);
      setSelectedColor(habit.color);
    }
  }, [habit?.title, habit?.color]);

  const styles = createThemedStyles(colors => ({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: getResponsiveHeight(28),
    },
    header: {
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
      justifyContent: 'flex-start',
      gap: getResponsiveSize(12),
    },
    backText: {
      fontSize: getResponsiveSize(24),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
      marginBottom: getResponsiveSize(3),
    },
    container: {
      flex: 1,
      paddingHorizontal: getResponsiveSize(20),
      paddingTop: getResponsiveSize(24),
    },
    contentContainer: {
      paddingBottom: getResponsiveSize(40),
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: getResponsiveSize(6),
      padding: getResponsiveSize(16),
      marginBottom: getResponsiveSize(12),
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: getResponsiveSize(6),
    },
    titleText: {
      fontSize: getResponsiveSize(24),
      fontFamily: 'MonaSans-Bold',
      color: colors.text,
      flex: 1,
    },
    titleInput: {
      fontSize: getResponsiveSize(22),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: getResponsiveSize(6),
      paddingHorizontal: getResponsiveSize(10),
      paddingVertical: getResponsiveSize(8),
      backgroundColor: colors.background,
      flex: 1,
      marginRight: getResponsiveSize(12),
    },
    subtitle: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
    },
    iconButton: {
      padding: getResponsiveSize(8),
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: getResponsiveSize(12),
    },
    statCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: getResponsiveSize(6),
      padding: getResponsiveSize(12),
      alignItems: 'flex-start',
      justifyContent: 'center',
      flex: 1,
      minWidth: '48%',
      marginBottom: getResponsiveSize(8),
    },
    statValue: {
      fontSize: getResponsiveSize(20),
      fontFamily: 'MonaSans-Bold',
      color: colors.text,
    },
    statLabel: {
      fontSize: getResponsiveSize(12),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
    },
    sectionTitle: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-SemiBold',
      color: colors.text,
      marginBottom: getResponsiveSize(8),
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: getResponsiveSize(8),
    },
    shareButton: {
      padding: getResponsiveSize(6),
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
    },
    colorSwatch: {
      width: getResponsiveSize(32),
      height: getResponsiveSize(32),
      borderRadius: getResponsiveSize(16),
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: getResponsiveSize(10),
      marginBottom: getResponsiveSize(10),
    },
    colorSelected: {
      borderWidth: 4,
      borderColor: colors.text,
    },
    actionRow: {
      flexDirection: 'row',
      marginTop: getResponsiveSize(8),
      justifyContent: 'space-between',
      marginBottom: getResponsiveSize(36),
    },
    actionButton: {
      flex: 1,
      paddingVertical: getResponsiveSize(12),
      borderRadius: getResponsiveSize(8),
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    actionDanger: {
      borderColor: colors.error || '#FF6B6B',
    },
    actionText: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
    },
    actionDangerText: {
      color: colors.error || '#FF6B6B',
    },
  }));

  if (!habit) {
    return null;
  }

  const completions = habit.completions || {};
  const today = DateTime.now().toISODate() || '';

  const getCurrentStreak = (): number => {
    let streak = 0;
    let day = DateTime.now();
    // cap at 365 for performance
    for (let i = 0; i < 365; i++) {
      const key = day.toISODate() || '';
      if (completions[key]) {
        streak++;
        day = day.minus({ days: 1 });
      } else {
        break;
      }
    }
    return streak;
  };

  const getTotals = () => {
    // Month-to-date completion rate
    const now = DateTime.now();
    const startOfMonth = now.startOf('month');

    // Count completed days in current month up to today (inclusive)
    const completedDays = Object.entries(completions).reduce((count, [date, done]) => {
      if (!done) return count;
      const dt = DateTime.fromISO(date);
      if (!dt.isValid) return count;
      if (dt >= startOfMonth && dt <= now) return count + 1;
      return count;
    }, 0);

    // Days so far in this month (inclusive of today)
    const totalDays = Math.max(1, Math.floor(now.diff(startOfMonth, 'days').days || 0) + 1);
    const completionRate = Math.min(100, Math.round((completedDays / totalDays) * 100));
    return { completedDays, totalDays, completionRate };
  };

  const { completedDays, completionRate } = getTotals();

  const saveTitle = async () => {
    try {
      if (habit.id && title.trim() && title.trim() !== habit.title) {
        await clientTools.updateHabit({ id: habit.id.toString(), title: title.trim() });
        await refreshHabits();
      }
      setIsEditingTitle(false);
    } catch (e) {
      setIsEditingTitle(false);
    }
  };

  const changeColor = async (c: string) => {
    if (!habit.id) return;
    setSelectedColor(c);
    await updateHabitColor(habit.id.toString(), c);
  };

  const calendarShotRef = React.useRef<ViewShot>(null);

  const handleShareCalendar = async () => {
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing not available', 'Your device does not support sharing.');
        return;
      }
      const uri = await calendarShotRef.current?.capture?.({
        format: 'png',
        quality: 1,
      });
      if (!uri) return;
      // Ensure file exists at a stable path
      const targetPath = FileSystem.cacheDirectory + `habit_calendar_${habit.id}.png`;
      if (!uri.startsWith(FileSystem.cacheDirectory)) {
        const data = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        await FileSystem.writeAsStringAsync(targetPath, data, { encoding: FileSystem.EncodingType.Base64 });
      }
      await Sharing.shareAsync(uri.startsWith(FileSystem.cacheDirectory) ? uri : targetPath, {
        dialogTitle: `Share ${habit.title} - Monthly Stats`,
        mimeType: 'image/png',
      });
    } catch (e) {
      console.log('Error sharing calendar', e);
      Alert.alert('Error', 'Could not share the calendar image.');
    }
  };

  const handleArchiveToggle = async () => {
    if (!habit.id) return;
    if (habit.archived) {
      await unarchiveHabit(habit.id.toString());
    } else {
      await archiveHabit(habit.id.toString());
    }
    router.back();
  };

  const handleDelete = () => {
    if (!habit.id) return;
    Alert.alert(
      'Delete Streak',
      `Are you sure you want to delete "${habit.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteHabit(habit.id!.toString());
            router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBarStyle} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={getResponsiveSize(28)} color={colors.text} />
          <Text style={styles.backText}>Habit</Text>
        </TouchableOpacity>
        <View />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.titleRow}>
            {isEditingTitle ? (
              <>
                <TextInput
                  style={styles.titleInput}
                  value={title}
                  onChangeText={setTitle}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveTitle}
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity onPress={saveTitle} style={styles.iconButton}>
                  <Ionicons name="checkmark" size={getResponsiveSize(24)} color={colors.text} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.titleText} numberOfLines={2}>
                  {habit.title}
                </Text>
                <TouchableOpacity onPress={() => setIsEditingTitle(true)} style={styles.iconButton}>
                  <Ionicons
                    name="create-outline"
                    size={getResponsiveSize(24)}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{getCurrentStreak()} days</Text>
            <Text style={styles.statLabel}>Current streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completionRate}%</Text>
            <Text style={styles.statLabel}>Completion rate</Text>
          </View>
        </View>

        <View style={[styles.card, { marginTop: getResponsiveSize(16) }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Monthly Stats</Text>
            <TouchableOpacity onPress={handleShareCalendar} style={styles.shareButton}>
              <Ionicons name="share-social-outline" size={getResponsiveSize(20)} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ViewShot ref={calendarShotRef} options={{ format: 'png', quality: 1 }}>
            <HabitHistory habit={habit} onClose={() => {}} />
          </ViewShot>
        </View>

        <View style={[styles.card, { marginTop: getResponsiveSize(16) }]}>
          <Text style={styles.sectionTitle}>Color</Text>
          <View style={styles.colorGrid}>
            {PASTEL_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => changeColor(c)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  selectedColor === c && styles.colorSelected,
                ]}
              />
            ))}
          </View>
        </View>
        <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, { marginRight: getResponsiveSize(12) }]}
              onPress={handleArchiveToggle}>
              <Text style={styles.actionText}>{habit.archived ? 'Unarchive' : 'Archive'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionDanger]}
              onPress={handleDelete}>
              <Text style={[styles.actionText, styles.actionDangerText]}>Delete</Text>
            </TouchableOpacity>
          </View>
      </ScrollView>
    </SafeAreaView>
  );
}
