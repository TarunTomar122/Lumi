import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useHabitStore } from '@/app/store/habitStore';
import type { Habit } from '@/utils/database';
import { DateTime } from 'luxon';
import { useTheme } from '@/hooks/useTheme';

interface HabitHistoryProps {
  habit: Habit;
  onClose: () => void;
  onMonthChange?: (month: number, year: number) => void;
  initialMonth?: number;
  initialYear?: number;
}

export const HabitHistory: React.FC<HabitHistoryProps> = ({ 
  habit, 
  onMonthChange, 
  initialMonth, 
  initialYear 
}) => {
  const { colors, createThemedStyles, isDark } = useTheme();
  const updateProgress = useHabitStore(state => state.updateHabitProgress);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState<number>(initialMonth ?? DateTime.now().month);
  const [visibleYear, setVisibleYear] = useState<number>(initialYear ?? DateTime.now().year);

  // Sync with parent's initial month/year when they change
  React.useEffect(() => {
    if (initialMonth !== undefined && initialYear !== undefined) {
      setVisibleMonth(initialMonth);
      setVisibleYear(initialYear);
    }
  }, [initialMonth, initialYear]);

  // Notify parent when visible month changes (including initial mount)
  React.useEffect(() => {
    onMonthChange?.(visibleMonth, visibleYear);
  }, [visibleMonth, visibleYear, onMonthChange]);

  // Convert habit completions to marked dates format
  const markedDates = React.useMemo(() => {
    const dates: { [key: string]: any } = {};
    
    // Add completed dates
    Object.entries(habit.completions).forEach(([date, completed]) => {
      if (completed) {
        const dt = DateTime.fromISO(date);
        if (dt.year === visibleYear && dt.month === visibleMonth) {
          dates[date] = {
            selected: true,
            selectedColor: habit.color,
          };
        }
      }
    });

    // Add selected date highlight if it's different from a completed date
    if (selectedDate) {
      const dtSel = DateTime.fromISO(selectedDate);
      const isInVisibleMonth = dtSel.isValid && dtSel.year === visibleYear && dtSel.month === visibleMonth;
      if (isInVisibleMonth && !dates[selectedDate]?.selected) {
      dates[selectedDate] = {
        selected: true,
        selectedColor: '#F5A6B9',
      };
      }
    }

    return dates;
  }, [habit.completions, selectedDate, habit.color, visibleMonth, visibleYear]);

  const handleDayPress = async (day: { dateString: string }) => {
    const isCompleted = habit.completions[day.dateString];
    const isCurrentlySelected = selectedDate === day.dateString;

    // If the date is already selected or completed, clear the selection
    if (isCurrentlySelected || isCompleted) {
      setSelectedDate(null);
    } else {
      setSelectedDate(day.dateString);
    }

    // Update the habit progress
    if (habit.id) {
      await updateProgress(habit.id.toString(), day.dateString);
    }
  };

  const styles = createThemedStyles(colors => ({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden'
    },
  }));

  return (
    <View style={styles.container}>
      <Calendar
        current={DateTime.fromObject({ year: visibleYear, month: visibleMonth, day: 1 }).toISODate() || undefined}
        onDayPress={handleDayPress}
        markedDates={markedDates}
        firstDay={1}
        onMonthChange={(m) => {
          setVisibleMonth(m.month);
          setVisibleYear(m.year);
        }}
        disableAllTouchEventsForDisabledDays={true}
        theme={{
          backgroundColor: colors.surface,
          calendarBackground: colors.card,
          textSectionTitleColor: colors.textSecondary,
          selectedDayBackgroundColor: habit.color,
          selectedDayBackgroundStyle: {
            opacity: isDark ? 0.8 : 1,
          },
          selectedDayTextColor: colors.primaryText,
          todayTextColor: colors.text,
          dayTextColor: colors.text,
          textDisabledColor: colors.textTertiary,
          dotColor: habit.color,
          monthTextColor: colors.text,
          textMonthFontFamily: 'MonaSans-Medium',
          textDayFontFamily: 'MonaSans-Regular',
          textDayHeaderFontFamily: 'MonaSans-Regular',
          textMonthFontSize: 18,
          textDayFontSize: 16,
          textDayHeaderFontSize: 12,
        }}
        enableSwipeMonths={true}
      />
    </View>
  );
};

 