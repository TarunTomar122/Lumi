import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize, getResponsiveHeight } from '../utils/responsive';
import { useTheme } from '@/hooks/useTheme';
import { clientTools } from '@/utils/tools';
import type { Task } from '@/utils/database';
import { DateTime } from 'luxon';

type TimeRange = 'weekly' | 'monthly' | 'yearly';

export default function TaskHistory() {
  const router = useRouter();
  const { colors, createThemedStyles } = useTheme();
  const [refreshing, setRefreshing] = React.useState(false);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [timeRange, setTimeRange] = React.useState<TimeRange>('weekly');

  const loadTaskHistory = React.useCallback(async () => {
    try {
      setLoading(true);
      // Load all data at once (1 year)
      const result = await clientTools.getTaskHistory(365);
      if (result.success && result.tasks) {
        setTasks(result.tasks);
      }
    } catch (error) {
      console.error('Error loading task history:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadTaskHistory();
    setRefreshing(false);
  }, [loadTaskHistory]);

  React.useEffect(() => {
    loadTaskHistory();
  }, [loadTaskHistory]);

  // Aggregate tasks by time period
  const chartData = React.useMemo(() => {
    if (!tasks.length) return [];

    const now = DateTime.now();
    const dataPoints: { label: string; count: number; date: DateTime }[] = [];

    if (timeRange === 'weekly') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = now.minus({ days: i }).startOf('day');
        const count = tasks.filter(task => {
          if (!task.completed_at) return false;
          const completedDate = DateTime.fromISO(task.completed_at).startOf('day');
          return completedDate.equals(date);
        }).length;
        
        dataPoints.push({
          label: date.toFormat('ccc'), // Mon, Tue, etc
          count,
          date,
        });
      }
    } else if (timeRange === 'monthly') {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekStart = now.minus({ weeks: i }).startOf('week');
        const weekEnd = weekStart.endOf('week');
        const count = tasks.filter(task => {
          if (!task.completed_at) return false;
          const completedDate = DateTime.fromISO(task.completed_at);
          return completedDate >= weekStart && completedDate <= weekEnd;
        }).length;
        
        dataPoints.push({
          label: `W${weekStart.weekNumber}`,
          count,
          date: weekStart,
        });
      }
    } else {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const monthStart = now.minus({ months: i }).startOf('month');
        const monthEnd = monthStart.endOf('month');
        const count = tasks.filter(task => {
          if (!task.completed_at) return false;
          const completedDate = DateTime.fromISO(task.completed_at);
          return completedDate >= monthStart && completedDate <= monthEnd;
        }).length;
        
        dataPoints.push({
          label: monthStart.toFormat('MMM'), // Jan, Feb, etc
          count,
          date: monthStart,
        });
      }
    }

    return dataPoints;
  }, [tasks, timeRange]);

  const maxCount = Math.max(...chartData.map(d => d.count), 1);
  const totalCompleted = chartData.reduce((sum, d) => sum + d.count, 0);
  const avgPerPeriod = chartData.length > 0 ? (totalCompleted / chartData.length).toFixed(1) : '0';

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
    },
    scrollContainer: {
      paddingHorizontal: getResponsiveSize(20),
      paddingTop: getResponsiveSize(24),
      paddingBottom: getResponsiveSize(40),
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: getResponsiveSize(60),
    },
    loadingText: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
      marginTop: getResponsiveSize(12),
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: getResponsiveSize(60),
      paddingHorizontal: getResponsiveSize(20),
    },
    emptyIcon: {
      marginBottom: getResponsiveSize(24),
    },
    emptyTitle: {
      fontSize: getResponsiveSize(20),
      fontFamily: 'MonaSans-SemiBold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: getResponsiveSize(8),
    },
    emptyText: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: getResponsiveSize(24),
    },
    timeRangeContainer: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: getResponsiveSize(8),
      padding: getResponsiveSize(4),
      marginBottom: getResponsiveSize(24),
      borderWidth: 1,
      borderColor: colors.border,
    },
    timeRangeButton: {
      flex: 1,
      paddingVertical: getResponsiveSize(10),
      borderRadius: getResponsiveSize(6),
      alignItems: 'center',
    },
    timeRangeButtonActive: {
      backgroundColor: colors.primary,
    },
    timeRangeText: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Medium',
      color: colors.textSecondary,
    },
    timeRangeTextActive: {
      color: colors.background,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: getResponsiveSize(32),
      paddingVertical: getResponsiveSize(16),
      backgroundColor: colors.card,
      borderRadius: getResponsiveSize(12),
      borderWidth: 1,
      borderColor: colors.border,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: getResponsiveSize(28),
      fontFamily: 'MonaSans-Bold',
      color: colors.text,
    },
    statLabel: {
      fontSize: getResponsiveSize(12),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
      marginTop: getResponsiveSize(4),
    },
    chartContainer: {
      marginBottom: getResponsiveSize(24),
    },
    chartTitle: {
      fontSize: getResponsiveSize(18),
      fontFamily: 'MonaSans-SemiBold',
      color: colors.text,
      marginBottom: getResponsiveSize(20),
    },
    chart: {
      height: getResponsiveSize(200),
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingHorizontal: getResponsiveSize(8),
      marginBottom: getResponsiveSize(12),
    },
    barContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    bar: {
      width: '80%',
      backgroundColor: colors.primary,
      borderRadius: getResponsiveSize(4),
      minHeight: getResponsiveSize(4),
    },
    barCount: {
      fontSize: getResponsiveSize(10),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
      marginBottom: getResponsiveSize(4),
    },
    labelsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: getResponsiveSize(8),
    },
    label: {
      flex: 1,
      fontSize: getResponsiveSize(11),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
    },
  }));

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
        
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={getResponsiveSize(24)} color={colors.text} />
            <Text style={styles.backText}>Analysis</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={getResponsiveSize(48)} color={colors.textSecondary} />
          <Text style={styles.loadingText}>Loading your task history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (tasks.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
        
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={getResponsiveSize(24)} color={colors.text} />
            <Text style={styles.backText}>Analysis</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="analytics-outline" size={getResponsiveSize(64)} color={colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>No Task History</Text>
          <Text style={styles.emptyText}>
            Complete some tasks to see your productivity patterns here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={getResponsiveSize(24)} color={colors.text} />
          <Text style={styles.backText}>Analysis</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
          />
        }
      >
        <View style={styles.scrollContainer}>
          {/* Time Range Selector */}
          <View style={styles.timeRangeContainer}>
            <TouchableOpacity
              style={[
                styles.timeRangeButton,
                timeRange === 'weekly' && styles.timeRangeButtonActive,
              ]}
              onPress={() => setTimeRange('weekly')}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  timeRange === 'weekly' && styles.timeRangeTextActive,
                ]}
              >
                Weekly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeRangeButton,
                timeRange === 'monthly' && styles.timeRangeButtonActive,
              ]}
              onPress={() => setTimeRange('monthly')}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  timeRange === 'monthly' && styles.timeRangeTextActive,
                ]}
              >
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeRangeButton,
                timeRange === 'yearly' && styles.timeRangeButtonActive,
              ]}
              onPress={() => setTimeRange('yearly')}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  timeRange === 'yearly' && styles.timeRangeTextActive,
                ]}
              >
                Yearly
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalCompleted}</Text>
              <Text style={styles.statLabel}>Total Tasks</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{avgPerPeriod}</Text>
              <Text style={styles.statLabel}>
                {timeRange === 'weekly' ? 'Avg/Day' : timeRange === 'monthly' ? 'Avg/Week' : 'Avg/Month'}
              </Text>
            </View>
          </View>

          {/* Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Tasks Completed</Text>
            <View style={styles.chart}>
              {chartData.map((point, index) => {
                const height = maxCount > 0 ? (point.count / maxCount) * 100 : 0;
                return (
                  <View key={index} style={styles.barContainer}>
                    {point.count > 0 && (
                      <Text style={styles.barCount}>{point.count}</Text>
                    )}
                    <View
                      style={[
                        styles.bar,
                        { height: `${Math.max(2, height)}%` },
                      ]}
                    />
                  </View>
                );
              })}
            </View>
            <View style={styles.labelsContainer}>
              {chartData.map((point, index) => (
                <Text key={index} style={styles.label}>
                  {point.label}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
