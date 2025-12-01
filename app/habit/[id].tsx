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
import Share from 'react-native-share';

import ViewShot from 'react-native-view-shot';

export default function HabitDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const habitId = Number(params.id);
  const { colors, createThemedStyles } = useTheme();
  const { habits, refreshHabits, updateHabitColor, archiveHabit, unarchiveHabit, deleteHabit } =
    useHabitStore();

  const habit = habits.find(h => h.id === habitId) as Habit | undefined;
  
  // Early return MUST be after all hooks but before conditional hooks
  // to avoid "Rendered fewer hooks than expected" error
  const [title, setTitle] = React.useState(habit?.title || '');
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [selectedColor, setSelectedColor] = React.useState<string>(
    habit?.color || PASTEL_COLORS[0]
  );
  // Track the currently visible month in the calendar
  const [visibleMonth, setVisibleMonth] = React.useState<number>(DateTime.now().month);
  const [visibleYear, setVisibleYear] = React.useState<number>(DateTime.now().year);

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
      borderWidth: 2,
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
    shareImageContainer: {
      backgroundColor: colors.background,
      padding: getResponsiveSize(16),
    },
    shareImageHeader: {
      marginBottom: getResponsiveSize(16),
      alignItems: 'center',
    },
    shareImageTitle: {
      fontSize: getResponsiveSize(24),
      fontFamily: 'MonaSans-Bold',
      color: colors.text,
      textAlign: 'center',
    },
    shareImageSubtitle: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
      marginTop: getResponsiveSize(4),
      textAlign: 'center',
    },
    hiddenViewShot: {
      position: 'absolute',
      left: -9999,
      opacity: 0,
    },
  }));

  // Don't early return here to avoid hook violation - handle in render instead
  const completions = habit?.completions || {};
  const today = DateTime.now().toISODate() || '';

  const getLongestStreakInMonth = (): number => {
    const visibleDate = DateTime.fromObject({ year: visibleYear, month: visibleMonth });
    const startOfMonth = visibleDate.startOf('month');
    const endOfMonth = visibleDate.endOf('month');
    
    let longestStreak = 0;
    let currentStreak = 0;
    
    // Iterate through each day in the visible month
    let day = startOfMonth;
    while (day <= endOfMonth) {
      const key = day.toISODate() || '';
      if (completions[key]) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
      day = day.plus({ days: 1 });
    }
    
    return longestStreak;
  };

  const getTotals = () => {
    // Calculate stats for the visible month
    const visibleDate = DateTime.fromObject({ year: visibleYear, month: visibleMonth });
    const startOfMonth = visibleDate.startOf('month');
    const endOfMonth = visibleDate.endOf('month');
    const now = DateTime.now();
    
    // If viewing current month, only count up to today
    // If viewing past month, count entire month
    // If viewing future month, show 0
    const isCurrentMonth = visibleYear === now.year && visibleMonth === now.month;
    const isPastMonth = visibleDate < now.startOf('month');
    const isFutureMonth = visibleDate > now.endOf('month');
    
    const endDate = isCurrentMonth ? now : endOfMonth;

    // Count completed days in visible month
    const completedDays = Object.entries(completions).reduce((count, [date, done]) => {
      if (!done) return count;
      const dt = DateTime.fromISO(date);
      if (!dt.isValid) return count;
      if (dt >= startOfMonth && dt <= endDate) return count + 1;
      return count;
    }, 0);

    // Days to consider for completion rate
    const totalDays = isFutureMonth 
      ? 1 // Avoid division by zero
      : Math.max(1, Math.floor(endDate.diff(startOfMonth, 'days').days || 0) + 1);
    
    const completionRate = isFutureMonth 
      ? 0 
      : Math.min(100, Math.round((completedDays / totalDays) * 100));
    
    // Total days in the visible month
    const totalDaysInMonth = visibleDate.daysInMonth || 30;
    
    return { completedDays, totalDays, completionRate, totalDaysInMonth, isCurrentMonth, isPastMonth };
  };

  const { completedDays, completionRate, totalDaysInMonth, isCurrentMonth } = getTotals();
  
  const handleMonthChange = React.useCallback((month: number, year: number) => {
    setVisibleMonth(month);
    setVisibleYear(year);
  }, []);

  const saveTitle = async () => {
    try {
      if (habit?.id && title.trim() && title.trim() !== habit.title) {
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

  const captureCalendar = async (): Promise<string | null> => {
    try {
      if (calendarShotRef.current) {
        // Delay to ensure the hidden calendar has fully rendered with the correct month
        await new Promise(resolve => setTimeout(resolve, 300));
        const uri = await calendarShotRef.current.capture();
        return uri;
      }
      return null;
    } catch (error) {
      console.error('Error capturing calendar:', error);
      Alert.alert('Error', 'Failed to capture calendar image');
      return null;
    }
  };

  const handleShareCalendar = async () => {
    try {
      const uri = await captureCalendar();
      if (!uri) return;

      const monthName = DateTime.fromObject({ year: visibleYear, month: visibleMonth }).toFormat('MMMM yyyy');
      const timeframe = isCurrentMonth ? 'this month so far' : `in ${monthName}`;

      await Share.open({
        url: uri,
        message: `My ${habit.title} progress - ${completionRate}% completion rate ${timeframe}!`,
        title: 'Share Habit Progress',
      });
    } catch (error: any) {
      console.error('Error sharing calendar:', error);
      // User cancelled the share dialog, don't show error
      if (error?.message !== 'User did not share') {
        console.error('Error sharing calendar:', error);
      }
    }
  };

  // Handle case where habit doesn't exist (e.g., after archiving/deleting)
  if (!habit) {
    return null;
  }

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
            <Text style={styles.statValue}>{getLongestStreakInMonth()} days</Text>
            <Text style={styles.statLabel}>Longest streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completionRate}%</Text>
            <Text style={styles.statLabel}>Completion rate</Text>
          </View>
        </View>

        <View style={[styles.card, { marginTop: getResponsiveSize(16) }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {isCurrentMonth 
                ? 'Monthly Stats' 
                : `Stats - ${DateTime.fromObject({ year: visibleYear, month: visibleMonth }).toFormat('MMMM yyyy')}`
              }
            </Text>
            <TouchableOpacity onPress={handleShareCalendar} style={styles.iconButton}>
              <Ionicons name="arrow-redo-outline" size={getResponsiveSize(24)} color={colors.text} />
            </TouchableOpacity>
          </View>
          <HabitHistory habit={habit} onClose={() => {}} onMonthChange={handleMonthChange} />
        </View>

        {/* Hidden ViewShot for sharing - includes header */}
        <ViewShot 
          ref={calendarShotRef} 
          options={{ format: 'png', quality: 1 }} 
          style={styles.hiddenViewShot}
          key={`${visibleYear}-${visibleMonth}`}
        >
          <View style={styles.shareImageContainer}>
            <View style={styles.shareImageHeader}>
              <Text style={styles.shareImageTitle}>{habit.title}</Text>
              <Text style={styles.shareImageSubtitle}>
                {DateTime.fromObject({ year: visibleYear, month: visibleMonth }).toFormat('MMMM yyyy')} • {completedDays}/{totalDaysInMonth} days completed
              </Text>
            </View>
            <HabitHistory 
              habit={habit} 
              onClose={() => {}} 
              initialMonth={visibleMonth}
              initialYear={visibleYear}
            />
          </View>
        </ViewShot>

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
