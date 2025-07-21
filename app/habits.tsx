import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  StatusBar,
  LayoutAnimation,
  Platform,
  UIManager,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHabitStore } from './store/habitStore';
import { HabitHistory } from './components/HabitHistory';
import type { Habit } from '@/utils/database';
import { DateTime } from 'luxon';
import { getResponsiveSize, getResponsiveHeight } from '../utils/responsive';
import { useTheme } from '@/hooks/useTheme';
import { clientTools } from '@/utils/tools';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function Habits() {
  const router = useRouter();
  const { colors, createThemedStyles, isDark } = useTheme();
  const [refreshing, setRefreshing] = React.useState(false);
  const [expandedHabitId, setExpandedHabitId] = React.useState<number | null>(null);
  const [isAddingHabit, setIsAddingHabit] = React.useState(false);
  const [newHabitTitle, setNewHabitTitle] = React.useState('');
  const [editingHabitId, setEditingHabitId] = React.useState<number | null>(null);
  const [editHabitTitle, setEditHabitTitle] = React.useState('');
  const scrollViewRef = React.useRef<ScrollView>(null);
  const { habits, updateHabitProgress, refreshHabits, getWeekProgress, addHabit, deleteHabit } =
    useHabitStore();

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

  // Handle keyboard dismiss for edit mode
  React.useEffect(() => {
    if (!editingHabitId) return;

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setTimeout(() => {
        handleSaveEdit();
      }, 100);
    });

    return () => {
      keyboardDidHideListener.remove();
    };
  }, [editingHabitId, editHabitTitle]);

  const toggleExpand = (habitId: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedHabitId(expandedHabitId === habitId ? null : habitId);
  };

  const ProgressCircles = ({
    habit,
    onDayPress,
  }: {
    habit: Habit;
    onDayPress: (date: string) => void;
  }) => {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const progress = getWeekProgress(habit);

    // Get array of ISO date strings for current week starting from Monday
    const weekDates = React.useMemo(() => {
      const now = DateTime.now();
      const monday = now.startOf('week'); // Luxon uses Monday as start of week by default
      return Array.from({ length: 7 }, (_, i) => monday.plus({ days: i }).toISODate() || '');
    }, []);

    return (
      <View style={styles.progressContainer}>
        {days.map((day, index) => (
          <View key={index} style={styles.dayColumn}>
            <Text style={styles.dayLabel}>{day}</Text>
            <TouchableOpacity
              onPress={() => onDayPress(weekDates[index])}
              style={[
                styles.circle,
                progress[index] && { backgroundColor: habit.color, opacity: isDark ? 0.9 : 1 },
                !progress[index] && { backgroundColor: colors.background }, // Light pink background for non-completed days
              ]}
            />
          </View>
        ))}
      </View>
    );
  };

  const handleDayPress = (habit: Habit, date: string) => {
    if (habit.id !== undefined) {
      updateHabitProgress(habit.id.toString(), date);
    }
  };

  const handleAddHabit = async () => {
    if (!newHabitTitle.trim()) return;

    await addHabit(newHabitTitle.trim());

    setNewHabitTitle('');
    setIsAddingHabit(false);
    refreshHabits();
  };

  const handleAddHabitPress = () => {
    setIsAddingHabit(true);
    // Scroll to bottom to ensure input is visible
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleDeleteHabit = async (habitId: number, habitTitle: string) => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${habitTitle}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteHabit(habitId.toString());
            refreshHabits();
          },
        },
      ]
    );
  };

  const handleEditHabit = (habitId: number, currentTitle: string) => {
    setEditingHabitId(habitId);
    setEditHabitTitle(currentTitle);
  };

  const handleSaveEdit = async () => {
    if (!editingHabitId || !editHabitTitle.trim()) {
      setEditingHabitId(null);
      return;
    }

    try {
      const result = await clientTools.updateHabit({
        id: editingHabitId.toString(),
        title: editHabitTitle.trim()
      });

      if (result.success) {
        await refreshHabits();
      }
    } catch (error) {
      console.error('Error updating habit:', error);
    }

    setEditingHabitId(null);
    setEditHabitTitle('');
  };

  const handleCancelEdit = () => {
    setEditingHabitId(null);
    setEditHabitTitle('');
  };

  const handleOutsidePress = () => {
    if (editingHabitId !== null) {
      Keyboard.dismiss();
    }
  };

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
    analysisButton: {
      padding: getResponsiveSize(4),
    },
    container: {
      flex: 1,
      paddingHorizontal: getResponsiveSize(20),
      paddingTop: getResponsiveSize(24),
    },
    habitsList: {
      flex: 1,
    },
    habitItem: {
      marginBottom: getResponsiveSize(24),
      padding: getResponsiveSize(16),
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: getResponsiveSize(6),
    },
    habitHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: getResponsiveSize(16),
    },
    habitHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getResponsiveSize(12),
    },
    habitHeaderContent: {
      flex: 1,
      justifyContent: 'center',
      minWidth: 0,
    },
    habitTitle: {
      fontSize: getResponsiveSize(24),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
    },
    progressContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: getResponsiveSize(2),
    },
    dayColumn: {
      alignItems: 'center',
    },
    dayLabel: {
      fontSize: getResponsiveSize(12),
      color: colors.textSecondary,
      marginBottom: getResponsiveSize(4),
    },
    circle: {
      width: getResponsiveSize(36),
      height: getResponsiveSize(36),
      borderRadius: getResponsiveSize(20),
      borderWidth: 1,
      borderColor: colors.border,
    },
    habitHistoryContainer: {
      marginTop: getResponsiveSize(0),

    },
    addHabitContainer: {
      marginTop: 0,
      alignItems: 'center',
      opacity: 0.4,
    },
    addHabitButton: {
      padding: getResponsiveSize(12),
    },
    addHabitInputContainer: {
      width: '100%',
      padding: getResponsiveSize(24),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: getResponsiveSize(12),
      marginBottom: getResponsiveSize(24),
    },
    addHabitInput: {
      fontSize: getResponsiveSize(18),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
    },

    noHabitsContainer: {
      flex: 1,
      alignItems: 'center',
      marginTop: getResponsiveHeight(100),
      marginBottom: getResponsiveSize(24),
    },
    noHabitsText: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
    },
    editHabitInput: {
      flex: 1,
      fontSize: getResponsiveSize(24),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: getResponsiveSize(6),
      paddingHorizontal: getResponsiveSize(8),
      paddingVertical: getResponsiveSize(4),
      backgroundColor: colors.background,
      marginRight: getResponsiveSize(12),
    },
    bottomActions: {
      flexDirection: 'row',
      marginTop: getResponsiveSize(16),
      paddingTop: getResponsiveSize(12),
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    compactButton: {
      flex: 1,
      paddingHorizontal: getResponsiveSize(12),
      paddingVertical: getResponsiveSize(8),
      backgroundColor: 'transparent',
    },
    compactButtonWithDivider: {
      flex: 1,
      paddingHorizontal: getResponsiveSize(12),
      paddingVertical: getResponsiveSize(8),
      backgroundColor: 'transparent',
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    compactButtonText: {
      fontSize: getResponsiveSize(12),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
      textAlign: 'center',
    },
    deleteText: {
      color: colors.error || '#FF6B6B',
    },
  }));

  return (
    <TouchableWithoutFeedback 
      onPress={handleOutsidePress}
      disabled={editingHabitId === null}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={colors.statusBarStyle} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={getResponsiveSize(28)} color={colors.text} />
            <Text style={styles.backText}>Habits</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/habits-analysis')} style={styles.analysisButton}>
            <Ionicons name="analytics-outline" size={getResponsiveSize(28)} color={colors.text} />
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.habitsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
          }>

          {habits.length === 0 && (
            <View style={styles.noHabitsContainer}>
              <Text style={styles.noHabitsText}>No habits yet.</Text>
              <Text style={styles.noHabitsText}>Start by adding a habit.</Text>
            </View>
          )}

          {habits.map(habit => (
            <View key={habit.id} style={styles.habitItem}>
              <TouchableOpacity
                onPress={() => habit.id && editingHabitId !== habit.id && toggleExpand(habit.id)}
                style={styles.habitHeader}
                disabled={editingHabitId === habit.id}>
                <View style={styles.habitHeaderContent}>
                  {editingHabitId === habit.id ? (
                    <TextInput
                      style={styles.editHabitInput}
                      value={editHabitTitle}
                      onChangeText={setEditHabitTitle}
                      onEndEditing={handleSaveEdit}
                      onSubmitEditing={handleSaveEdit}
                      autoFocus
                      returnKeyType="done"
                      blurOnSubmit={true}
                      placeholderTextColor={colors.textTertiary}
                    />
                  ) : (
                    <Text style={styles.habitTitle}>{habit.title}</Text>
                  )}
                </View>
                <View style={styles.habitHeaderActions}>
                  <Ionicons
                    name={expandedHabitId === habit.id ? 'chevron-up' : 'chevron-down'}
                    size={getResponsiveSize(24)}
                    color={colors.text}
                  />
                </View>
              </TouchableOpacity>
              
              {expandedHabitId === habit.id ? (
                <View>
                  <View style={styles.habitHistoryContainer}>
                    <HabitHistory habit={habit} onClose={() => toggleExpand(habit.id!)} />
                  </View>
                  {editingHabitId !== habit.id && (
                    <View style={styles.bottomActions}>
                      <TouchableOpacity
                        onPress={() => habit.id && handleEditHabit(habit.id, habit.title)}
                        style={styles.compactButtonWithDivider}>
                        <Text style={styles.compactButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => habit.id && handleDeleteHabit(habit.id, habit.title)}
                        style={styles.compactButton}>
                        <Text style={[styles.compactButtonText, styles.deleteText]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <ProgressCircles habit={habit} onDayPress={date => handleDayPress(habit, date)} />
              )}
            </View>
          ))}

          {/* Add Habit Button or Input */}
          <View style={[styles.addHabitContainer, isAddingHabit && { opacity: 1 }]}>
            {isAddingHabit ? (
              <View style={styles.addHabitInputContainer}>
                <TextInput
                  style={styles.addHabitInput}
                  value={newHabitTitle}
                  onChangeText={setNewHabitTitle}
                  placeholderTextColor={colors.textTertiary}
                  placeholder="Reading..."
                  autoFocus
                  onBlur={() => setIsAddingHabit(false)}
                  onSubmitEditing={handleAddHabit}
                  onFocus={() => {
                    // Ensure input stays visible when focused
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }}
                />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addHabitButton}
                onPress={handleAddHabitPress}>
                <Ionicons name="add-circle-outline" size={getResponsiveSize(32)} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
