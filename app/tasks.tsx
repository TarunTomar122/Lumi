import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  StatusBar,
  Dimensions,
  TextInput,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTaskStore } from './store/taskStore';
import { formatDate } from '@/utils/commons';
import { DateTime } from 'luxon';
import { clientTools } from '@/utils/tools';
import { parseTaskInput, parseRecurringInput } from '@/utils/taskParser';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { getResponsiveSize, getResponsiveHeight } from '../utils/responsive';
import { useTheme } from '@/hooks/useTheme';
import InputContainer from './components/inputContainer';
import { useRecurringStore } from './store/recurringStore';

const SwipeableTaskItem = ({
  task,
  onToggle,
  onDelete,
  onUpdate,
  isDemo = false,
  onDemoComplete,
  isEditing,
  onEditStart,
  onEditEnd,
}: any) => {
  const { colors } = useTheme();
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue(0);
  const itemOpacity = useSharedValue(1);
  const screenWidth = Dimensions.get('window').width;
  const [editText, setEditText] = React.useState(task.title);
  const editInputRef = React.useRef<TextInput>(null);

  const DELETE_THRESHOLD = 0.3; // 30% of screen width to trigger delete
  const REVEAL_THRESHOLD = 0.15; // 15% of screen width to reveal delete button

  // Focus input when edit mode starts
  React.useEffect(() => {
    if (isEditing) {
      setEditText(task.title);
      setTimeout(() => {
        editInputRef.current?.focus();
      }, 100);
    }
  }, [isEditing, task.title]);

  // Handle keyboard dismiss
  React.useEffect(() => {
    if (!isEditing) return;

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      // Use setTimeout to ensure the TextInput has lost focus
      setTimeout(() => {
        if (editText.trim() && editText.trim() !== task.title) {
          onUpdate(task.id, { title: editText.trim() });
        }
        onEditEnd();
      }, 100);
    });

    return () => {
      keyboardDidHideListener.remove();
    };
  }, [isEditing, editText, task.title]);

  const handleDelete = async () => {
    await onDelete(task.id);
  };

  const handleSaveEdit = async () => {
    if (editText.trim() && editText.trim() !== task.title) {
      await onUpdate(task.id, { title: editText.trim() });
    }
    onEditEnd();
  };

  const handleCancelEdit = () => {
    setEditText(task.title);
    onEditEnd();
  };

  // Demo animation effect
  React.useEffect(() => {
    if (isDemo) {
      const demoSequence = async () => {
        // Wait a bit, then swipe right
        await new Promise(resolve => setTimeout(resolve, 500));
        translateX.value = withTiming(screenWidth * REVEAL_THRESHOLD, { duration: 800 });

        // Hold for a moment
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Swipe back
        translateX.value = withSpring(0, { duration: 600 });

        // Wait for animation to complete, then notify parent
        await new Promise(resolve => setTimeout(resolve, 800));
        if (onDemoComplete) {
          runOnJS(onDemoComplete)();
        }
      };

      demoSequence();
    }
  }, [isDemo]);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .enabled(!isEditing) // Disable swipe when editing
    .onChange(event => {
      // Only allow swiping right (positive values)
      if (event.translationX > 0) {
        translateX.value = event.translationX;
      }
    })
    .onFinalize(event => {
      const swipeDistance = Math.abs(event.translationX);
      const deleteThreshold = screenWidth * DELETE_THRESHOLD;
      const revealThreshold = screenWidth * REVEAL_THRESHOLD;

      if (swipeDistance > deleteThreshold) {
        // Delete the item
        translateX.value = withTiming(screenWidth, { duration: 300 });
        itemHeight.value = withTiming(0, { duration: 300 });
        itemOpacity.value = withTiming(0, { duration: 300 }, () => {
          runOnJS(handleDelete)();
        });
      } else if (swipeDistance > revealThreshold) {
        // Snap to reveal delete button
        translateX.value = withSpring(screenWidth * REVEAL_THRESHOLD);
      } else {
        // Snap back to original position
        translateX.value = withSpring(0);
      }
    });

  // Double tap gesture for editing
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .enabled(!isDemo) // Disable during demo
    .onStart(() => {
      if (!isEditing) {
        runOnJS(onEditStart)(task.id);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    height: itemHeight.value || 'auto',
    opacity: itemOpacity.value,
  }));

  const deleteButtonStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > screenWidth * REVEAL_THRESHOLD * 0.5 ? 1 : 0,
  }));

  const itemStyles = StyleSheet.create({
    swipeContainer: {
      position: 'relative',
      marginBottom: getResponsiveSize(12),
    },
    deleteBackground: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: colors.divider,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    deleteButtonTouchable: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'flex-start',
      width: '100%',
      paddingLeft: getResponsiveSize(24),
    },
    taskItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: getResponsiveSize(12),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: getResponsiveSize(12),
      marginBottom: getResponsiveSize(12),
      backgroundColor: colors.background,
    },
    taskContent: {
      flex: 1,
    },
    taskText: {
      fontSize: getResponsiveSize(20),
      fontFamily: 'MonaSans-Regular',
      color: task.status === 'done' ? colors.textSecondary : colors.text,
      marginBottom: getResponsiveSize(4),
      textDecorationLine: task.status === 'done' ? 'line-through' : 'none',
    },
    taskEditInput: {
      fontSize: getResponsiveSize(20),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
      marginBottom: getResponsiveSize(4),
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: getResponsiveSize(6),
      paddingHorizontal: getResponsiveSize(8),
      paddingVertical: getResponsiveSize(4),
      backgroundColor: colors.background,
    },
    taskDate: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
    },
    taskCheckbox: {
      width: getResponsiveSize(28),
      height: getResponsiveSize(28),
      borderRadius: getResponsiveSize(4),
      borderWidth: 1,
      borderColor: colors.text,
      marginTop: getResponsiveSize(4),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: task.status === 'done' ? colors.text : 'transparent',
    },
  });

  return (
    <Animated.View style={containerStyle}>
      <View style={itemStyles.swipeContainer}>
        {/* Delete button background */}
        <Animated.View style={[itemStyles.deleteBackground, deleteButtonStyle]}>
          <TouchableOpacity style={itemStyles.deleteButtonTouchable} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={getResponsiveSize(24)} color={colors.text} />
          </TouchableOpacity>
        </Animated.View>

        {/* Main task item */}
        <GestureDetector gesture={Gesture.Simultaneous(pan, doubleTap)}>
          <Animated.View style={[itemStyles.taskItem, animatedStyle]}>
            <View style={itemStyles.taskContent}>
              {isEditing ? (
                <TextInput
                  ref={editInputRef}
                  style={itemStyles.taskEditInput}
                  value={editText}
                  onChangeText={setEditText}
                  onEndEditing={handleSaveEdit}
                  onSubmitEditing={handleSaveEdit}
                  returnKeyType="done"
                  multiline={false}
                  selectTextOnFocus={true}
                  blurOnSubmit={true}
                />
              ) : (
                <Text style={itemStyles.taskText}>{task.title}</Text>
              )}
              <Text style={itemStyles.taskDate}>
                {formatDate(task.due_date || task.reminder_date || '')}
              </Text>
            </View>
            <TouchableOpacity
              style={itemStyles.taskCheckbox}
              onPress={() => onToggle(task.id, task.status)}
              disabled={isEditing}>
              {task.status === 'done' && (
                <Ionicons
                  name="checkmark"
                  size={getResponsiveSize(20)}
                  color={colors.primaryText}
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
};

const RecurringSwipeableItem = ({
  reminder,
  checked,
  onToggle,
  onDelete,
}: {
  reminder: any;
  checked: boolean;
  onToggle: (id: number) => void | Promise<void>;
  onDelete: (id: number) => void | Promise<void>;
}) => {
  const { colors } = useTheme();
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue(0);
  const itemOpacity = useSharedValue(1);
  const screenWidth = Dimensions.get('window').width;

  const DELETE_THRESHOLD = 0.3;
  const REVEAL_THRESHOLD = 0.15;

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onChange(event => {
      if (event.translationX > 0) {
        translateX.value = event.translationX;
      }
    })
    .onFinalize(event => {
      const swipeDistance = Math.abs(event.translationX);
      const deleteThreshold = screenWidth * DELETE_THRESHOLD;
      const revealThreshold = screenWidth * REVEAL_THRESHOLD;

      if (swipeDistance > deleteThreshold) {
        translateX.value = withTiming(screenWidth, { duration: 300 });
        itemHeight.value = withTiming(0, { duration: 300 });
        itemOpacity.value = withTiming(0, { duration: 300 }, () => {
          runOnJS(onDelete)(reminder.id);
        });
      } else if (swipeDistance > revealThreshold) {
        translateX.value = withSpring(screenWidth * REVEAL_THRESHOLD);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    height: itemHeight.value || 'auto',
    opacity: itemOpacity.value,
  }));

  const deleteButtonStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > screenWidth * REVEAL_THRESHOLD * 0.5 ? 1 : 0,
  }));

  const itemStyles = StyleSheet.create({
    swipeContainer: {
      position: 'relative',
      marginBottom: getResponsiveSize(12),
    },
    deleteBackground: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: colors.divider,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    deleteButtonTouchable: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'flex-start',
      width: '100%',
      paddingLeft: getResponsiveSize(24),
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: getResponsiveSize(12),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: getResponsiveSize(12),
      marginBottom: getResponsiveSize(12),
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: getResponsiveSize(20),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
      marginBottom: getResponsiveSize(4),
    },
    date: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
    },
    checkbox: {
      width: getResponsiveSize(28),
      height: getResponsiveSize(28),
      borderRadius: getResponsiveSize(4),
      borderWidth: 1,
      borderColor: colors.text,
      marginTop: getResponsiveSize(4),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
  });

  return (
    <Animated.View style={containerStyle}>
      <View style={itemStyles.swipeContainer}>
        <Animated.View style={[itemStyles.deleteBackground, deleteButtonStyle]}>
          <TouchableOpacity style={itemStyles.deleteButtonTouchable} onPress={() => onDelete(reminder.id)}>
            <Ionicons name="trash-outline" size={getResponsiveSize(24)} color={colors.text} />
          </TouchableOpacity>
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View style={[itemStyles.itemRow, animatedStyle]}>
            <View style={itemStyles.content}>
              <Text style={itemStyles.title}>{reminder.title}</Text>
              <Text style={itemStyles.date}>Next reminder: {formatDate(reminder.next_occurrence)}</Text>
            </View>
            <TouchableOpacity
              style={[itemStyles.checkbox, checked ? { backgroundColor: colors.text } : null]}
              onPress={() => onToggle(reminder.id)}
            >
              {checked && (
                <Ionicons
                  name="checkmark"
                  size={getResponsiveSize(20)}
                  color={colors.primaryText}
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
};

export default function Tasks() {
  const router = useRouter();
  const { colors, createThemedStyles } = useTheme();
  const insets = useSafeAreaInsets();
  const [userResponse, setUserResponse] = React.useState('');
  const [isRecording, setIsRecording] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const { tasks, updateTask, refreshTasks, deleteTask, addTask, error, clearError } =
    useTaskStore();
  const {
    reminders: recurringReminders,
    refreshReminders,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    skipNext,
    error: recurringError,
    clearError: clearRecurringError,
  } = useRecurringStore();
  const [activeContent, setActiveContent] = React.useState<string>('home');
  const [showDemo, setShowDemo] = React.useState(false);
  const [demoCount, setDemoCount] = React.useState(0);
  const [groupedTasks, setGroupedTasks] = React.useState<{ [key: string]: typeof tasks }>({});
  const [shouldRegroup, setShouldRegroup] = React.useState(true);
  const [editingTaskId, setEditingTaskId] = React.useState<number | null>(null);
  const [keyboardOffset, setKeyboardOffset] = React.useState(0);
  const [inputBarHeight, setInputBarHeight] = React.useState(0);
  const [recurringSkipState, setRecurringSkipState] = React.useState<Record<number, { checked: boolean; originalNext: string }>>({});

  React.useEffect(() => {
    refreshTasks();
    refreshReminders();
    loadDemoCount();
  }, []);

  // Clear skip state for recurring reminders whose next occurrence has arrived
  React.useEffect(() => {
    const today = DateTime.now().setZone('Asia/Kolkata').startOf('day');
    const updatedSkipState = { ...recurringSkipState };
    let hasChanges = false;

    // Check each reminder that has skip state
    Object.keys(updatedSkipState).forEach(idStr => {
      const id = parseInt(idStr);
      const reminder = recurringReminders.find(r => r.id === id);
      
      if (reminder && updatedSkipState[id]?.checked) {
        const nextOccurrence = DateTime.fromISO(reminder.next_occurrence)
          .setZone('Asia/Kolkata')
          .startOf('day');
        
        // If the next occurrence is today or in the past, clear the skip state
        // This means the reminder is due again and should show as unchecked
        if (nextOccurrence <= today) {
          delete updatedSkipState[id];
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setRecurringSkipState(updatedSkipState);
    }
  }, [recurringReminders]);

  // Group and sort tasks when needed
  React.useEffect(() => {
    if (shouldRegroup) {
      const grouped: { [key: string]: typeof tasks } = {};
      const today = DateTime.now().setZone('Asia/Kolkata').startOf('day');

      tasks.forEach(task => {
        const taskDateStr = task.due_date || task.reminder_date;
        let groupKey = 'No Date';

        if (taskDateStr) {
          const taskDate = DateTime.fromISO(taskDateStr).setZone('Asia/Kolkata').startOf('day');
          const diffDays = Math.floor(taskDate.diff(today, 'days').days);

          if (diffDays < 0) {
            groupKey = 'Overdue';
          } else if (diffDays === 0) {
            groupKey = 'Today';
          } else if (diffDays === 1) {
            groupKey = 'Tomorrow';
          } else if (diffDays > 1 && diffDays <= 7) {
            groupKey = taskDate.toFormat('cccc'); // Day name (e.g., "Monday")
          } else {
            groupKey = taskDate.toFormat('MMM dd'); // e.g., "Jan 15"
          }
        }

        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
        }
        grouped[groupKey].push(task);
      });

      // Sort tasks within each group: incomplete tasks first, completed tasks last
      Object.keys(grouped).forEach(groupKey => {
        grouped[groupKey].sort((a, b) => {
          // If one task is done and the other isn't, put the incomplete task first
          if (a.status === 'done' && b.status !== 'done') return 1;
          if (a.status !== 'done' && b.status === 'done') return -1;
          // If both have the same status, maintain original order
          return 0;
        });
      });

      setGroupedTasks(grouped);
      setShouldRegroup(false);
    }
  }, [tasks, shouldRegroup]);

  const loadDemoCount = async () => {
    try {
      const count = await AsyncStorage.getItem('swipeDemoCount');
      setDemoCount(count ? parseInt(count) : 0);
    } catch (error) {
      console.error('Error loading demo count:', error);
    }
  };

  const incrementDemoCount = async () => {
    try {
      const newCount = demoCount + 1;
      setDemoCount(newCount);
      await AsyncStorage.setItem('swipeDemoCount', newCount.toString());
    } catch (error) {
      console.error('Error saving demo count:', error);
    }
  };

  // Show demo to all users exactly 2 times
  React.useEffect(() => {
    if (tasks.length >= 1 && demoCount < 2 && !showDemo) {
      const timer = setTimeout(() => {
        setShowDemo(true);
      }, 1500); // Wait 1.5 seconds before showing demo

      return () => clearTimeout(timer);
    }
  }, [tasks.length, demoCount, showDemo]);

  // Adjust input bar position with keyboard
  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      const height = e?.endCoordinates?.height || 0;
      setKeyboardOffset(height);
    };
    const onHide = () => setKeyboardOffset(0);

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshTasks();
      setShouldRegroup(true); // Trigger regrouping on manual refresh
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    }
    setRefreshing(false);
  }, []);

  const handleSubmit = async () => {
    if (!userResponse.trim()) return; // Don't create task if no input

    try {
      // Try recurring first
      const recurringData = parseRecurringInput(userResponse);
      if (recurringData) {
        const res = await addRecurring(recurringData);
        if (res.success) {
          await refreshReminders();
          setUserResponse('');
        }
      } else {
        // Parse the user input using the utility function
        const taskData = parseTaskInput(userResponse);
        // Save the task using the store method
        const result = await addTask(taskData);
        if (result.success) {
          await refreshTasks();
          setShouldRegroup(true); // Trigger regrouping when new task is added
          setUserResponse('');
        }
      }
      // Error handling is done by the store and will be shown in UI
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleTaskToggle = async (id: number, currentStatus: 'todo' | 'done') => {
    try {
      const newStatus = currentStatus === 'done' ? 'todo' : 'done';
      await updateTask(id, { status: newStatus });
      // Don't trigger regrouping on toggle - only on manual refresh
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleTaskDelete = async (id: number) => {
    try {
      await deleteTask(id);
      setShouldRegroup(true); // Trigger regrouping after deletion
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleTaskUpdate = async (id: number, updates: any) => {
    try {
      await updateTask(id, updates);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleEditStart = (taskId: number) => {
    setEditingTaskId(taskId);
  };

  const handleEditEnd = () => {
    setEditingTaskId(null);
  };

  const styles = createThemedStyles(colors => ({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: getResponsiveHeight(28),
    },
    container: {
      flex: 1,
      padding: getResponsiveSize(24),
    },
    noTasksContainer: {
      flex: 1,
      gap: getResponsiveSize(12),
    },
    noTasksText: {
      fontSize: getResponsiveSize(18),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
      marginBottom: getResponsiveSize(4),
    },
    suggestionText: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'Roboto-Regular',
      color: colors.text,
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
    historyButton: {
      padding: getResponsiveSize(8),
      borderRadius: getResponsiveSize(8),
    },
    title: {
      fontSize: getResponsiveSize(32),
      fontFamily: 'MonaSans-Bold',
      color: colors.text,
    },
    taskList: {
      flex: 1,
      paddingRight: getResponsiveSize(8),
    },
    taskListContent: {
      paddingBottom: getResponsiveSize(84),
    },
    taskItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: getResponsiveSize(12),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: getResponsiveSize(12),
      marginBottom: getResponsiveSize(12),
    },
    taskCheckbox: {
      width: getResponsiveSize(28),
      height: getResponsiveSize(28),
      borderRadius: getResponsiveSize(4),
      borderWidth: 1,
      borderColor: colors.text,
      marginTop: getResponsiveSize(4),
      alignItems: 'center',
      justifyContent: 'center',
    },
    taskCheckboxChecked: {
      backgroundColor: colors.text,
    },
    taskContent: {
      flex: 1,
    },
    taskText: {
      fontSize: getResponsiveSize(20),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
      marginBottom: getResponsiveSize(4),
    },
    taskTextCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textSecondary,
    },
    taskDate: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
    },
    inputContainer: {
      paddingHorizontal: getResponsiveSize(24),
      marginBottom: getResponsiveSize(24),
    },
    sectionHeader: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-Medium',
      color: colors.textSecondary,
      marginTop: getResponsiveSize(24),
      marginBottom: getResponsiveSize(12),
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    firstSectionHeader: {
      marginTop: 0,
    },
    swipeContainer: {
      position: 'relative',
      marginBottom: getResponsiveSize(12),
    },
    deleteBackground: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: colors.divider,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    deleteButtonTouchable: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'flex-start',
      width: '100%',
      paddingLeft: getResponsiveSize(24),
    },
    emptyStateCard: {
      backgroundColor: colors.card,
      padding: getResponsiveSize(20),
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: getResponsiveSize(12),
    },
    errorContainer: {
      backgroundColor: colors.error,
      padding: getResponsiveSize(16),
      marginBottom: getResponsiveSize(16),
      borderRadius: getResponsiveSize(8),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    errorText: {
      color: 'white',
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Regular',
      flex: 1,
      marginRight: getResponsiveSize(12),
    },
    errorButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: getResponsiveSize(12),
      paddingVertical: getResponsiveSize(8),
      borderRadius: getResponsiveSize(6),
    },
    errorButtonText: {
      color: 'white',
      fontSize: getResponsiveSize(12),
      fontFamily: 'MonaSans-Medium',
    },
    recurringItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: getResponsiveSize(12),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: getResponsiveSize(12),
    },
    recurringContent: {
      flex: 1,
    },
    recurringTitle: {
      fontSize: getResponsiveSize(20),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
      marginBottom: getResponsiveSize(4),
    },
    recurringDate: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
    },
    recurringActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getResponsiveSize(12),
    },
    skipCheckbox: {
      width: getResponsiveSize(28),
      height: getResponsiveSize(28),
      borderRadius: getResponsiveSize(4),
      borderWidth: 1,
      borderColor: colors.text,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyStateTitle: {
      fontSize: getResponsiveSize(20),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
      marginBottom: getResponsiveSize(24),
      textAlign: 'left',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: getResponsiveSize(12),
    },
    emptyStateSubtitle: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'Roboto-Regular',
      color: colors.textSecondary,
      marginBottom: getResponsiveSize(20),
      textAlign: 'center',
      lineHeight: getResponsiveSize(22),
    },
    examplesContainer: {
      gap: getResponsiveSize(16),
      marginBottom: getResponsiveSize(20),
    },
    exampleItem: {
      gap: getResponsiveSize(4),
    },
    exampleText: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
      fontStyle: 'italic',
    },
    exampleDescription: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'Roboto-Regular',
      color: colors.textTertiary,
    },
    emptyStateFooter: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    inputBarContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: getResponsiveSize(24),
      paddingTop: getResponsiveSize(8),
      marginBottom: getResponsiveSize(16),
      backgroundColor: colors.background,
    },
  }));

  const handleOutsidePress = () => {
    if (editingTaskId !== null) {
      // Dismiss keyboard which will trigger save via keyboard listener
      Keyboard.dismiss();
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={handleOutsidePress} disabled={editingTaskId === null}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle={colors.statusBarStyle} />
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={getResponsiveSize(28)} color={colors.text} />
              <Text style={styles.backText}>Tasks</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/task-history')}
              style={styles.historyButton}>
              <Ionicons name="analytics-outline" size={getResponsiveSize(24)} color={colors.text} />
            </TouchableOpacity>
          </View>
          {activeContent === 'home' && (
            <View style={styles.container}>
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity style={styles.errorButton} onPress={() => clearError()}>
                    <Text style={styles.errorButtonText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              )}
              {recurringError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{recurringError}</Text>
                  <TouchableOpacity style={styles.errorButton} onPress={() => clearRecurringError()}>
                    <Text style={styles.errorButtonText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              )}
              {(tasks.length === 0) && (recurringReminders.length === 0) && (
                <View style={styles.noTasksContainer}>
                  <View style={styles.emptyStateCard}>
                    <Text style={styles.emptyStateTitle}>Lumi can understand natural language</Text>

                    <View style={styles.examplesContainer}>
                      <View style={styles.exampleItem}>
                        <Text style={styles.exampleText}>"call mom at 7pm"</Text>
                        <Text style={styles.exampleDescription}>Set a specific time</Text>
                      </View>

                      <View style={styles.exampleItem}>
                        <Text style={styles.exampleText}>"gym session tomorrow"</Text>
                        <Text style={styles.exampleDescription}>Schedule for tomorrow</Text>
                      </View>

                      <View style={styles.exampleItem}>
                        <Text style={styles.exampleText}>"doctor appointment friday at 2pm"</Text>
                        <Text style={styles.exampleDescription}>Set day and time</Text>
                      </View>

                      <View style={styles.exampleItem}>
                        <Text style={styles.exampleText}>"buy groceries"</Text>
                        <Text style={styles.exampleDescription}>No time needed</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
               <ScrollView
                style={styles.taskList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                 contentContainerStyle={[
                   styles.taskListContent,
                   { paddingBottom: inputBarHeight + insets.bottom },
                 ]}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.text}
                  />
                }>
                {(() => {
                  // Use the grouped tasks from state
                  const today = DateTime.now().setZone('Asia/Kolkata').startOf('day');

                  // Create a map of section keys to their actual dates for proper sorting
                  const sectionDates: { [key: string]: DateTime | null } = {};

                  Object.keys(groupedTasks).forEach(sectionKey => {
                    if (sectionKey === 'Overdue') {
                      sectionDates[sectionKey] = today.minus({ days: 1000 }); // Will be sorted first
                    } else if (sectionKey === 'Today') {
                      sectionDates[sectionKey] = today;
                    } else if (sectionKey === 'Tomorrow') {
                      sectionDates[sectionKey] = today.plus({ days: 1 });
                    } else if (sectionKey === 'No Date') {
                      sectionDates[sectionKey] = null; // Will be sorted last
                    } else {
                      // For day names and specific dates, find the actual date from the first task in that group
                      const firstTask = groupedTasks[sectionKey]?.[0];
                      if (firstTask) {
                        const taskDateStr = firstTask.due_date || firstTask.reminder_date;
                        if (taskDateStr) {
                          sectionDates[sectionKey] = DateTime.fromISO(taskDateStr)
                            .setZone('Asia/Kolkata')
                            .startOf('day');
                        } else {
                          sectionDates[sectionKey] = null;
                        }
                      }
                    }
                  });

                  const sortedSections = Object.keys(groupedTasks).sort((a, b) => {
                    const dateA = sectionDates[a];
                    const dateB = sectionDates[b];

                    // No Date sections go to the end
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;
                    if (!dateB) return -1;

                    // Sort by actual date
                    return dateA.toMillis() - dateB.toMillis();
                  });

                  const sections = sortedSections.map((sectionKey, sectionIndex) => (
                    <View key={sectionKey}>
                      {groupedTasks[sectionKey].length > 0 && (
                        <>
                          <Text
                            style={[
                              styles.sectionHeader,
                              sectionIndex === 0 && styles.firstSectionHeader,
                            ]}>
                            {sectionKey}
                          </Text>
                          {groupedTasks[sectionKey].map((cachedTask, index) => {
                            // Get current task data from store for real-time status updates
                            const currentTask =
                              tasks.find(t => t.id === cachedTask.id) || cachedTask;
                            return (
                              <SwipeableTaskItem
                                key={`${cachedTask.id}-${sectionKey}-${index}`}
                                task={currentTask}
                                onToggle={handleTaskToggle}
                                onDelete={handleTaskDelete}
                                onUpdate={handleTaskUpdate}
                                isEditing={editingTaskId === currentTask.id}
                                onEditStart={handleEditStart}
                                onEditEnd={handleEditEnd}
                                isDemo={showDemo && sectionIndex === 0 && index === 0}
                                onDemoComplete={() => {
                                  setShowDemo(false);
                                  incrementDemoCount();
                                }}
                              />
                            );
                          })}
                        </>
                      )}
                    </View>
                  ));

                  // Append Recurring section at the bottom
                  if (recurringReminders.length > 0) {
                    sections.push(
                      <View key="recurring-section" style={tasks.length === 0 ? styles.taskList : null}>
                        <Text style={[styles.sectionHeader, tasks.length === 0 ? styles.firstSectionHeader : null]}>Recurring</Text>
                        {recurringReminders.map(rem => (
                          <RecurringSwipeableItem
                            key={rem.id}
                            reminder={rem}
                            checked={!!(rem.id !== undefined && recurringSkipState[rem.id!]?.checked)}
                            onToggle={async id => {
                              if (id === undefined) return;
                              const current = recurringSkipState[id];
                              if (!current || !current.checked) {
                                // First time check: record original and skip once
                                const originalNext = rem.next_occurrence;
                                setRecurringSkipState(prev => ({
                                  ...prev,
                                  [id]: { checked: true, originalNext },
                                }));
                                await skipNext(id);
                                await refreshReminders();
                              } else {
                                // Uncheck: revert to original next occurrence
                                const originalNext = current.originalNext;
                                await updateRecurring(id, { next_occurrence: originalNext });
                                await refreshReminders();
                                setRecurringSkipState(prev => {
                                  const copy = { ...prev };
                                  delete copy[id];
                                  return copy;
                                });
                              }
                            }}
                            onDelete={async id => {
                              await deleteRecurring(id);
                              await refreshReminders();
                              setRecurringSkipState(prev => {
                                const copy = { ...prev };
                                delete copy[id];
                                return copy;
                              });
                            }}
                          />
                        ))}
                      </View>
                    );
                  }

                  return sections;
                })()}
               </ScrollView>

              {/* Only show InputContainer when not editing any task */}
               {editingTaskId === null && (
                 <View
                   onLayout={(e) => setInputBarHeight(e.nativeEvent.layout.height)}
                   style={[
                     styles.inputBarContainer,
                     { paddingBottom: insets.bottom, bottom: keyboardOffset },
                   ]}
                 >
                   <InputContainer
                     userResponse={userResponse}
                     setUserResponse={setUserResponse}
                     handleSubmit={handleSubmit}
                     isRecording={isRecording}
                     setIsRecording={setIsRecording}
                     onlyRecording={false}
                     placeholder="Call mom at 9pm"
                     containerStyle={{ marginBottom: 0 }}
                   />
                 </View>
               )}
            </View>
          )}
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </GestureHandlerRootView>
  );
}
