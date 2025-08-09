import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Dimensions,
} from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHabitStore } from './store/habitStore';
import { getResponsiveSize, getResponsiveHeight } from '../utils/responsive';
import { useTheme } from '@/hooks/useTheme';
import { DateTime } from 'luxon';
import { HabitHeatmap } from './components/HabitHeatmap';

export default function HabitsAnalysis() {
  const router = useRouter();
  const { colors, createThemedStyles } = useTheme();
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedHabits, setSelectedHabits] = React.useState<number[]>([]);
  const { habits, refreshHabits } = useHabitStore();
  const [viewMode, setViewMode] = React.useState<'stripes' | 'blend' | 'dots' | 'intensity'>('stripes');

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshHabits();
    } catch (error) {
      console.error('Error refreshing habits:', error);
    }
    setRefreshing(false);
  }, []);

  React.useEffect(() => {
    refreshHabits();
  }, []);

  React.useEffect(() => {
    // Select all habits by default when habits are loaded
    if (habits.length > 0) {
      setSelectedHabits(habits.map(habit => habit.id!));
    }
  }, [habits]);

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
    content: {
      flex: 1,
    },
    habitFilterContainer: {
      marginBottom: getResponsiveSize(24),
    },
    viewModeContainer: {
      marginBottom: getResponsiveSize(16),
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: getResponsiveSize(6),
      padding: getResponsiveSize(3),
    },
    viewModeButton: {
      flex: 1,
      paddingVertical: getResponsiveSize(6),
      borderRadius: getResponsiveSize(4),
      alignItems: 'center',
    },
    viewModeButtonActive: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    viewModeText: {
      fontSize: getResponsiveSize(12),
      fontFamily: 'MonaSans-Medium',
      color: colors.textSecondary,
    },
    viewModeTextActive: {
      color: colors.text,
    },
    habitFilterTitle: {
      fontSize: getResponsiveSize(18),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
      marginBottom: getResponsiveSize(12),
    },
    habitFilterList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: getResponsiveSize(8),
    },
    habitFilterItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: getResponsiveSize(12),
      paddingVertical: getResponsiveSize(6),
      borderRadius: getResponsiveSize(16),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    habitFilterItemSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    habitFilterText: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
      marginLeft: getResponsiveSize(6),
    },
    habitFilterTextSelected: {
      color: colors.background,
    },
    heatmapContainer: {
      marginTop: getResponsiveSize(8),
      marginBottom: getResponsiveSize(80),
    },
  }));

  const toggleHabitSelection = (habitId: number) => {
    setSelectedHabits(prev => 
      prev.includes(habitId) 
        ? prev.filter(id => id !== habitId)
        : [...prev, habitId]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBarStyle} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/habits')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={getResponsiveSize(28)} color={colors.text} />
          <Text style={styles.backText}>Analysis</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }>
        <View style={styles.content}>
          {/* Heatmap */}
          <View style={styles.heatmapContainer}>
            {/* View mode selector */}
            <View style={styles.viewModeContainer}>
              {[
                { key: 'stripes', label: 'Stripes' },
                { key: 'blend', label: 'Blend' },
                { key: 'dots', label: 'Dots' },
                { key: 'intensity', label: 'Intensity' },
              ].map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[
                    styles.viewModeButton,
                    viewMode === m.key && styles.viewModeButtonActive,
                  ]}
                  onPress={() => setViewMode(m.key as any)}
                >
                  <Text
                    style={[
                      styles.viewModeText,
                      viewMode === m.key && styles.viewModeTextActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <HabitHeatmap habits={habits} selectedHabits={selectedHabits} viewMode={viewMode} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 