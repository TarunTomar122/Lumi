import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { DateTime } from 'luxon';
import { useTheme } from '@/hooks/useTheme';
import { getResponsiveSize } from '@/utils/responsive';
import type { Habit } from '@/utils/database';
import { Ionicons } from '@expo/vector-icons';

type HeatmapViewMode = 'stripes' | 'blend' | 'dots' | 'intensity';

interface HabitHeatmapProps {
  habits: Habit[];
  selectedHabits: number[];
  viewMode?: HeatmapViewMode;
}

interface DayData {
  date: string;
  count: number;
  total: number;
  intensity: number;
  habitColors: string[];
}

type TimePeriod = '7d' | '1m' | '6m';

const HABIT_COLOR = '#FFB3BA'; // The pinkish color used for habits

export const HabitHeatmap: React.FC<HabitHeatmapProps> = ({ habits, selectedHabits, viewMode = 'stripes' }) => {
  const { colors, createThemedStyles } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = React.useState<TimePeriod>('1m');
  const screenWidth = Dimensions.get('window').width;

  // Calculate cell size based on screen width and period
  const getCellSize = (period: TimePeriod) => {
    let maxCells = 31; // Default for 1 month
    if (period === '7d') maxCells = 7;
    else if (period === '6m') maxCells = 180;

    if (period === '7d') {
      return Math.min(getResponsiveSize(42), (screenWidth + 420) / Math.min(maxCells, 30));
    } else {
      return Math.min(getResponsiveSize(50), (screenWidth + 500) / Math.min(maxCells, 30));
    }
  };

  const cellSize = getCellSize(selectedPeriod);
  const cellGap = getResponsiveSize(1);

  // Generate data based on selected period
  const generateHeatmapData = React.useMemo(() => {
    const endDate = DateTime.now();
    let startDate: DateTime;

    switch (selectedPeriod) {
      case '7d':
        startDate = endDate.minus({ days: 6 });
        break;
      case '1m':
        startDate = endDate.minus({ days: 29 });
        break;
      case '6m':
        startDate = endDate.minus({ days: 179 });
        break;
    }

    const data: DayData[] = [];

    // Get filtered habits
    const filteredHabits = habits.filter(habit => selectedHabits.includes(habit.id!));

    let currentDate = startDate;
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISODate() || '';

      // Count completions for this date across selected habits
      let completedCount = 0;
      const habitColors: string[] = [];

      filteredHabits.forEach(habit => {
        if (habit.completions[dateStr]) {
          completedCount++;
          habitColors.push(habit.color);
        }
      });

      const totalHabits = filteredHabits.length;
      const intensity = totalHabits > 0 ? completedCount / totalHabits : 0;

      data.push({
        date: dateStr,
        count: completedCount,
        total: totalHabits,
        intensity,
        habitColors,
      });

      currentDate = currentDate.plus({ days: 1 });
    }

    return data;
  }, [habits, selectedHabits, selectedPeriod]);

  // Group data by rows for horizontal layout
  const getHeatmapRows = () => {
    const rows: DayData[][] = [];
    const itemsPerRow = Math.floor((screenWidth - 80) / (cellSize + cellGap));

    for (let i = 0; i < generateHeatmapData.length; i += itemsPerRow) {
      rows.push(generateHeatmapData.slice(i, i + itemsPerRow));
    }

    return rows;
  };

  const getIntensityColor = (day: DayData) => {
    if (day.intensity === 0) return colors.background;

    // Always use the pinkish habit color with intensity-based opacity
    const opacity = Math.min(0.4 + day.intensity * 0.8, 1);
    const hex = Math.round(opacity * 255)
      .toString(16)
      .padStart(2, '0');
    return HABIT_COLOR + hex;
  };

  const hexToRgb = (hex: string) => {
    const cleaned = hex.replace('#', '');
    const r = parseInt(cleaned.substring(0, 2), 16);
    const g = parseInt(cleaned.substring(2, 4), 16);
    const b = parseInt(cleaned.substring(4, 6), 16);
    return { r, g, b };
  };

  const getBlendedRgba = (colorsHex: string[], alpha: number) => {
    if (colorsHex.length === 0) return `rgba(0,0,0,0)`;
    const rgbs = colorsHex.map(hexToRgb);
    const avgR = Math.round(rgbs.reduce((sum, c) => sum + c.r, 0) / rgbs.length);
    const avgG = Math.round(rgbs.reduce((sum, c) => sum + c.g, 0) / rgbs.length);
    const avgB = Math.round(rgbs.reduce((sum, c) => sum + c.b, 0) / rgbs.length);
    return `rgba(${avgR}, ${avgG}, ${avgB}, ${alpha})`;
  };

  const timePeriods = [
    { key: '7d' as TimePeriod, label: '7 Days' },
    { key: '1m' as TimePeriod, label: '1 Month' },
    { key: '6m' as TimePeriod, label: '6 Months' },
  ];

  const styles = createThemedStyles(colors => ({
    container: {
      gap: getResponsiveSize(12),
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: getResponsiveSize(6),
      padding: getResponsiveSize(16),
    },
    cardTitle: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-Bold',
      color: colors.text,
      marginBottom: getResponsiveSize(12),
    },
    periodSelector: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: getResponsiveSize(6),
      padding: getResponsiveSize(3),
      marginBottom: getResponsiveSize(12),
    },
    periodButton: {
      flex: 1,
      paddingVertical: getResponsiveSize(6),
      borderRadius: getResponsiveSize(4),
      alignItems: 'center',
    },
    periodButtonActive: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    periodButtonText: {
      fontSize: getResponsiveSize(12),
      fontFamily: 'MonaSans-Medium',
      color: colors.textSecondary,
    },
    periodButtonTextActive: {
      color: colors.text,
    },
    heatmapContainer: {
      alignItems: 'center',
    },
    heatmapGrid: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    heatmapRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: cellGap,
    },
    dayCell: {
      width: cellSize,
      height: cellSize,
      marginRight: cellGap,
      borderRadius: getResponsiveSize(1),
      borderWidth: 1,
      borderColor: colors.border,
    },
    dayCellInnerRow: {
      flex: 1,
      flexDirection: 'row',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      borderRadius: getResponsiveSize(1),
    },
    dayCellDotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: getResponsiveSize(2),
      width: '100%',
      height: '100%',
    },
    dayCellDot: {
      width: Math.max(4, Math.floor(cellSize / 5)),
      height: Math.max(4, Math.floor(cellSize / 5)),
      borderRadius: getResponsiveSize(2),
      borderWidth: 1,
      borderColor: colors.border,
    },
    periodLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: getResponsiveSize(8),
      paddingHorizontal: getResponsiveSize(8),
    },
    periodLabel: {
      fontSize: getResponsiveSize(10),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
    },
    legendContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: getResponsiveSize(12),
      gap: getResponsiveSize(3),
    },
    legendText: {
      fontSize: getResponsiveSize(10),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
      marginHorizontal: getResponsiveSize(6),
    },
    legendCell: {
      width: getResponsiveSize(8),
      height: getResponsiveSize(8),
      borderRadius: getResponsiveSize(1),
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: getResponsiveSize(1),
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: getResponsiveSize(8),
    },
    statCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: getResponsiveSize(6),
      padding: getResponsiveSize(12),
      paddingHorizontal: getResponsiveSize(12),
      maxHeight: getResponsiveSize(120),
      alignItems: 'center',
      justifyContent: 'space-between',
      flex: 1,
      minWidth: '47%',
    },
    statIcon: {
      marginBottom: getResponsiveSize(4),
    },
    statValue: {
      fontSize: getResponsiveSize(20),
      fontFamily: 'MonaSans-Bold',
      color: colors.text,
      marginBottom: getResponsiveSize(2),
    },
    statLabel: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: getResponsiveSize(6),
      padding: getResponsiveSize(32),
      alignItems: 'center',
      justifyContent: 'center',
      gap: getResponsiveSize(8),
    },
    emptyText: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
    },
  }));

  // Calculate stats
  const totalDays = generateHeatmapData.length;
  const completedDays = generateHeatmapData.filter(day => day.count > 0).length;
  const currentStreak = React.useMemo(() => {
    let streak = 0;
    for (let i = generateHeatmapData.length - 1; i >= 0; i--) {
      if (generateHeatmapData[i].count > 0) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [generateHeatmapData]);

  const longestStreak = React.useMemo(() => {
    let maxStreak = 0;
    let currentStreak = 0;

    generateHeatmapData.forEach(day => {
      if (day.count > 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    return maxStreak;
  }, [generateHeatmapData]);

  if (selectedHabits.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyCard}>
          <Ionicons
            name="analytics-outline"
            size={getResponsiveSize(32)}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyText}>Select habits to view heatmap</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Heatmap Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Activity Heatmap</Text>

        {/* Time Period Selector */}
        <View style={styles.periodSelector}>
          {timePeriods.map(period => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodButton,
                selectedPeriod === period.key && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period.key)}>
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period.key && styles.periodButtonTextActive,
                ]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.heatmapContainer}>
          {/* Heatmap Grid - Horizontal Layout */}
          <View style={styles.heatmapGrid}>
            {getHeatmapRows().map((row, rowIndex) => (
              <View key={rowIndex} style={styles.heatmapRow}>
                {row.map((day, dayIndex) => {
                  const hasCompletions = day.count > 0;
                  const limitedColors = day.habitColors.slice(0, 4);
                  if (!hasCompletions) {
                    return (
                      <View
                        key={`${rowIndex}-${dayIndex}`}
                        style={[styles.dayCell, { backgroundColor: colors.background }]}
                      />
                    );
                  }

                  if (viewMode === 'intensity') {
                    return (
                      <View
                        key={`${rowIndex}-${dayIndex}`}
                        style={[styles.dayCell, { backgroundColor: getIntensityColor(day) }]}
                      />
                    );
                  }

                  if (viewMode === 'blend') {
                    const opacity = Math.min(0.4 + day.intensity * 0.8, 1);
                    const bg = getBlendedRgba(day.habitColors, opacity);
                    return (
                      <View
                        key={`${rowIndex}-${dayIndex}`}
                        style={[styles.dayCell, { backgroundColor: bg }]}
                      />
                    );
                  }

                  if (viewMode === 'dots') {
                    return (
                      <View key={`${rowIndex}-${dayIndex}`} style={[styles.dayCell, { backgroundColor: colors.background }]}> 
                        <View style={styles.dayCellDotRow}>
                          {limitedColors.map((c, idx) => (
                            <View key={idx} style={[styles.dayCellDot, { backgroundColor: c }]} />
                          ))}
                        </View>
                      </View>
                    );
                  }

                  // stripes (default)
                  return (
                    <View key={`${rowIndex}-${dayIndex}`} style={[styles.dayCell, { backgroundColor: colors.background }]}> 
                      <View style={styles.dayCellInnerRow}>
                        {limitedColors.map((c, idx) => (
                          <View key={idx} style={{ flex: 1, backgroundColor: c }} />
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Legend */}
          {viewMode === 'intensity' ? (
            <View style={styles.legendContainer}>
              <Text style={styles.legendText}>Less</Text>
              <View style={[styles.legendCell, { backgroundColor: colors.background }]} />
              <View style={[styles.legendCell, { backgroundColor: HABIT_COLOR + '4D' }]} />
              <View style={[styles.legendCell, { backgroundColor: HABIT_COLOR + '80' }]} />
              <View style={[styles.legendCell, { backgroundColor: HABIT_COLOR + 'B3' }]} />
              <View style={[styles.legendCell, { backgroundColor: HABIT_COLOR }]} />
              <Text style={styles.legendText}>More</Text>
            </View>
          ) : (
            <View style={styles.legendContainer}>
              <Text style={styles.legendText}>Each color represents a completed habit</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="checkmark-circle" size={getResponsiveSize(32)} color={HABIT_COLOR} />
          </View>
          <Text style={styles.statValue}>{completedDays}</Text>
          <Text style={styles.statLabel}>Days Active</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="flame" size={getResponsiveSize(32)} color={HABIT_COLOR} />
          </View>
          <Text style={styles.statValue}>{currentStreak}</Text>
          <Text style={styles.statLabel}>Current Streak</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="trophy" size={getResponsiveSize(32)} color={HABIT_COLOR} />
          </View>
          <Text style={styles.statValue}>{longestStreak}</Text>
          <Text style={styles.statLabel}>Longest Streak</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="analytics" size={getResponsiveSize(32)} color={HABIT_COLOR} />
          </View>
          <Text style={styles.statValue}>{Math.round((completedDays / totalDays) * 100)}%</Text>
          <Text style={styles.statLabel}>Activity Rate</Text>
        </View>
      </View>
    </View>
  );
};
