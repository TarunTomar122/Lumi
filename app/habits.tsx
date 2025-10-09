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
  Modal,
} from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHabitStore } from './store/habitStore';
import { PASTEL_COLORS } from './store/habitStore';
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
  const [colorPickerForHabitId, setColorPickerForHabitId] = React.useState<number | null>(null);
  const [settingsModalHabitId, setSettingsModalHabitId] = React.useState<number | null>(null);
  const [showArchivedModal, setShowArchivedModal] = React.useState(false);
  const [isReorderMode, setIsReorderMode] = React.useState(false);
  const [reorderedHabits, setReorderedHabits] = React.useState<Habit[]>([]);
  const [editInModal, setEditInModal] = React.useState(false);
  const [modalEditTitle, setModalEditTitle] = React.useState('');
  const scrollViewRef = React.useRef<ScrollView>(null);
  const { 
    habits, 
    archivedHabits,
    updateHabitProgress, 
    refreshHabits, 
    getWeekProgress, 
    addHabit, 
    deleteHabit, 
    updateHabitColor,
    archiveHabit,
    unarchiveHabit,
    reorderHabits,
    refreshArchivedHabits,
  } = useHabitStore();

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
    refreshArchivedHabits();
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

  const handleArchiveHabit = async (habitId: number) => {
    await archiveHabit(habitId.toString());
    setSettingsModalHabitId(null);
    setExpandedHabitId(null);
    refreshHabits();
  };

  const handleUnarchiveHabit = async (habitId: number) => {
    await unarchiveHabit(habitId.toString());
    refreshArchivedHabits();
  };

  const handleOpenArchivedModal = async () => {
    await refreshArchivedHabits();
    setShowArchivedModal(true);
  };

  const handleEnterReorderMode = () => {
    setIsReorderMode(true);
    setReorderedHabits([...habits]);
    setExpandedHabitId(null);
  };

  const handleExitReorderMode = () => {
    setIsReorderMode(false);
    setReorderedHabits([]);
  };

  const handleSaveReorder = async () => {
    await reorderHabits(reorderedHabits);
    setIsReorderMode(false);
    setReorderedHabits([]);
  };

  const moveHabitUp = (index: number) => {
    if (index === 0) return;
    const newHabits = [...reorderedHabits];
    [newHabits[index - 1], newHabits[index]] = [newHabits[index], newHabits[index - 1]];
    setReorderedHabits(newHabits);
  };

  const moveHabitDown = (index: number) => {
    if (index === reorderedHabits.length - 1) return;
    const newHabits = [...reorderedHabits];
    [newHabits[index], newHabits[index + 1]] = [newHabits[index + 1], newHabits[index]];
    setReorderedHabits(newHabits);
  };

  const handleSaveModalEdit = async () => {
    if (!settingsModalHabitId || !modalEditTitle.trim()) {
      setEditInModal(false);
      return;
    }

    try {
      const result = await clientTools.updateHabit({
        id: settingsModalHabitId.toString(),
        title: modalEditTitle.trim()
      });

      if (result.success) {
        await refreshHabits();
      }
    } catch (error) {
      console.error('Error updating habit:', error);
    }

    setEditInModal(false);
    setSettingsModalHabitId(null);
  };

  const styles = createThemedStyles(colors => ({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: getResponsiveHeight(28),
      marginBottom: getResponsiveHeight(28),
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
    colorPickerContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: getResponsiveSize(8),
      paddingTop: getResponsiveSize(12),
    },
    colorSwatch: {
      width: getResponsiveSize(28),
      height: getResponsiveSize(28),
      borderRadius: getResponsiveSize(14),
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectedSwatch: {
      borderWidth: 2,
      borderColor: colors.text,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: colors.background,
      paddingTop: getResponsiveSize(20),
      paddingBottom: getResponsiveSize(60),
      maxHeight: '80%',
      width: '100%',
      zIndex: 1000,
      border: '2px solid red',
      borderColor: 'red',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: getResponsiveSize(24),
      paddingBottom: getResponsiveSize(16),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: getResponsiveSize(20),
      fontFamily: 'MonaSans-SemiBold',
      color: colors.text,
    },
    modalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: getResponsiveSize(24),
      paddingVertical: getResponsiveSize(16),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalOptionText: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
      marginLeft: getResponsiveSize(12),
    },
    modalOptionDanger: {
      color: colors.error || '#FF6B6B',
    },
    settingsIcon: {
      padding: getResponsiveSize(4),
    },
    viewArchivedButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: getResponsiveSize(12),
      marginTop: getResponsiveSize(8),
      marginBottom: getResponsiveSize(16),
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: getResponsiveSize(8),
      opacity: 0.6,
    },
    viewArchivedText: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
      marginLeft: getResponsiveSize(8),
    },
    archivedHabitItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: getResponsiveSize(16),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    archivedHabitTitle: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
      flex: 1,
    },
    unarchiveButton: {
      paddingHorizontal: getResponsiveSize(12),
      paddingVertical: getResponsiveSize(6),
      backgroundColor: colors.primary || '#1890FF',
      borderRadius: getResponsiveSize(6),
    },
    unarchiveButtonText: {
      fontSize: getResponsiveSize(12),
      fontFamily: 'MonaSans-Medium',
      color: colors.background,
    },
    reorderButtons: {
      flexDirection: 'row',
      gap: getResponsiveSize(8),
    },
    reorderButton: {
      padding: getResponsiveSize(4),
    },
    reorderModeHabitItem: {
      marginBottom: getResponsiveSize(16),
      padding: getResponsiveSize(16),
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: getResponsiveSize(6),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerActions: {
      flexDirection: 'row',
      gap: getResponsiveSize(12),
    },
    modalEditInput: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: getResponsiveSize(6),
      paddingHorizontal: getResponsiveSize(16),
      paddingVertical: getResponsiveSize(12),
      marginHorizontal: getResponsiveSize(24),
      marginTop: getResponsiveSize(8),
      backgroundColor: colors.card,
    },
    modalEditActions: {
      flexDirection: 'row',
      gap: getResponsiveSize(12),
      paddingHorizontal: getResponsiveSize(24),
      paddingTop: getResponsiveSize(12),
      paddingBottom: getResponsiveSize(8),
    },
    modalEditButton: {
      flex: 1,
      paddingVertical: getResponsiveSize(10),
      borderRadius: getResponsiveSize(6),
      alignItems: 'center',
    },
    modalEditButtonSave: {
      backgroundColor: colors.primary,
    },
    modalEditButtonCancel: {
      backgroundColor: colors.border,
    },
    modalEditButtonText: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Medium',
    },
    modalEditButtonTextSave: {
      color: colors.background,
    },
    modalEditButtonTextCancel: {
      color: colors.text,
    },
    archivedScrollView: {
      paddingBottom: getResponsiveSize(24),
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
          <View style={styles.headerActions}>
            {isReorderMode ? (
              <TouchableOpacity onPress={handleSaveReorder} style={styles.analysisButton}>
                <Text style={[styles.backText, { fontSize: getResponsiveSize(16) }]}>Done</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity onPress={handleEnterReorderMode} style={styles.analysisButton}>
                  <Ionicons name="swap-vertical-outline" size={getResponsiveSize(28)} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/habits-analysis')} style={styles.analysisButton}>
                  <Ionicons name="analytics-outline" size={getResponsiveSize(28)} color={colors.text} />
                </TouchableOpacity>
              </>
            )}
          </View>
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

          {isReorderMode ? (
            // Reorder Mode
            reorderedHabits.map((habit, index) => (
              <View key={habit.id} style={styles.reorderModeHabitItem}>
                <Text style={styles.habitTitle}>{habit.title}</Text>
                <View style={styles.reorderButtons}>
                  <TouchableOpacity
                    onPress={() => moveHabitUp(index)}
                    style={styles.reorderButton}
                    disabled={index === 0}>
                    <Ionicons 
                      name="arrow-up" 
                      size={getResponsiveSize(24)} 
                      color={index === 0 ? colors.textTertiary : colors.text} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveHabitDown(index)}
                    style={styles.reorderButton}
                    disabled={index === reorderedHabits.length - 1}>
                    <Ionicons 
                      name="arrow-down" 
                      size={getResponsiveSize(24)} 
                      color={index === reorderedHabits.length - 1 ? colors.textTertiary : colors.text} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            // Normal Mode
            habits.map(habit => (
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
                    {expandedHabitId === habit.id && editingHabitId !== habit.id && (
                      <TouchableOpacity 
                        onPress={() => setSettingsModalHabitId(habit.id || null)} 
                        style={styles.settingsIcon}>
                        <Ionicons name="settings-outline" size={getResponsiveSize(24)} color={colors.text} />
                      </TouchableOpacity>
                    )}
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
                  </View>
                ) : (
                  <ProgressCircles habit={habit} onDayPress={date => handleDayPress(habit, date)} />
                )}
              </View>
            ))
          )}

          {/* View Archived Button */}
          {!isReorderMode && (
            <TouchableOpacity
              style={styles.viewArchivedButton}
              onPress={handleOpenArchivedModal}>
              <Ionicons name="archive-outline" size={getResponsiveSize(20)} color={colors.text} />
              <Text style={styles.viewArchivedText}>View Archived ({archivedHabits.length})</Text>
            </TouchableOpacity>
          )}

          {/* Add Habit Button or Input */}
          {!isReorderMode && (
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
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Settings Modal */}
      <Modal
        visible={settingsModalHabitId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setSettingsModalHabitId(null);
          setEditInModal(false);
          setColorPickerForHabitId(null);
        }}>
        <TouchableWithoutFeedback onPress={() => {
          setSettingsModalHabitId(null);
          setEditInModal(false);
          setColorPickerForHabitId(null);
        }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{habits.find(h => h.id === settingsModalHabitId)?.title}</Text>
                  <TouchableOpacity onPress={() => {
                    setSettingsModalHabitId(null);
                    setEditInModal(false);
                    setColorPickerForHabitId(null);
                  }}>
                    <Ionicons name="close" size={getResponsiveSize(24)} color={colors.text} />
                  </TouchableOpacity>
                </View>
                
                {!editInModal ? (
                  <TouchableOpacity
                    style={styles.modalOption}
                    onPress={() => {
                      const habit = habits.find(h => h.id === settingsModalHabitId);
                      if (habit) {
                        setModalEditTitle(habit.title);
                        setEditInModal(true);
                      }
                    }}>
                    <Ionicons name="create-outline" size={getResponsiveSize(20)} color={colors.text} />
                    <Text style={styles.modalOptionText}>Edit</Text>
                  </TouchableOpacity>
                ) : (
                  <View>
                    <TextInput
                      style={styles.modalEditInput}
                      value={modalEditTitle}
                      onChangeText={setModalEditTitle}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={handleSaveModalEdit}
                      placeholderTextColor={colors.textTertiary}
                      placeholder="Habit name..."
                    />
                    <View style={styles.modalEditActions}>
                      <TouchableOpacity
                        style={[styles.modalEditButton, styles.modalEditButtonCancel]}
                        onPress={() => setEditInModal(false)}>
                        <Text style={[styles.modalEditButtonText, styles.modalEditButtonTextCancel]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalEditButton, styles.modalEditButtonSave]}
                        onPress={handleSaveModalEdit}>
                        <Text style={[styles.modalEditButtonText, styles.modalEditButtonTextSave]}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => setColorPickerForHabitId(settingsModalHabitId)}>
                  <Ionicons name="color-palette-outline" size={getResponsiveSize(20)} color={colors.text} />
                  <Text style={styles.modalOptionText}>Choose Color</Text>
                </TouchableOpacity>

                {colorPickerForHabitId === settingsModalHabitId && (
                  <View style={[styles.colorPickerContainer, { paddingHorizontal: getResponsiveSize(24) }]}>
                    {PASTEL_COLORS.map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={async () => {
                          if (!settingsModalHabitId) return;
                          await updateHabitColor(settingsModalHabitId.toString(), c);
                          setColorPickerForHabitId(null);
                          setSettingsModalHabitId(null);
                        }}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: c },
                          habits.find(h => h.id === settingsModalHabitId)?.color === c && styles.selectedSwatch,
                        ]}
                      />
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    if (settingsModalHabitId) {
                      handleArchiveHabit(settingsModalHabitId);
                    }
                  }}>
                  <Ionicons name="archive-outline" size={getResponsiveSize(20)} color={colors.text} />
                  <Text style={styles.modalOptionText}>Archive</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    const habit = habits.find(h => h.id === settingsModalHabitId);
                    if (habit && settingsModalHabitId) {
                      setSettingsModalHabitId(null);
                      handleDeleteHabit(settingsModalHabitId, habit.title);
                    }
                  }}>
                  <Ionicons name="trash-outline" size={getResponsiveSize(20)} color={colors.error || '#FF6B6B'} />
                  <Text style={[styles.modalOptionText, styles.modalOptionDanger]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Archived Habits Modal */}
      <Modal
        visible={showArchivedModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowArchivedModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowArchivedModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Archived Habits</Text>
                  <TouchableOpacity onPress={() => setShowArchivedModal(false)}>
                    <Ionicons name="close" size={getResponsiveSize(24)} color={colors.text} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView 
                  style={{ maxHeight: getResponsiveHeight(400) }}
                  contentContainerStyle={styles.archivedScrollView}>
                  {archivedHabits.length === 0 ? (
                    <View style={{ padding: getResponsiveSize(24), alignItems: 'center' }}>
                      <Text style={styles.noHabitsText}>No archived habits</Text>
                    </View>
                  ) : (
                    archivedHabits.map(habit => (
                      <View key={habit.id} style={styles.archivedHabitItem}>
                        <Text style={styles.archivedHabitTitle}>{habit.title}</Text>
                        <TouchableOpacity
                          style={styles.unarchiveButton}
                          onPress={() => habit.id && handleUnarchiveHabit(habit.id)}>
                          <Text style={styles.unarchiveButtonText}>Unarchive</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
