import { useNavigation, useRouter } from 'expo-router';
import {
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import * as React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTaskStore } from './store/taskStore';
import { useMemoryStore } from './store/memoryStore';
import { useUsageStore } from './store/usageStore';
import { useUserStore } from './store/userStore';
import HomeCard from './components/HomeCard';
import { OnboardingScreens } from './components/OnboardingScreens';
import { clientTools, sendInstantNotification } from '@/utils/tools';
import { UsageChart } from './components/UsageChart';
import BackgroundFetch from 'react-native-background-fetch';
import { DateTime } from 'luxon';
import { getResponsiveSize, getResponsiveHeight } from '../utils/responsive';
import { useTheme } from '@/hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Page() {
  const navigation = useNavigation();
  const router = useRouter();
  const { refreshTasks } = useTaskStore();
  const { refreshMemories } = useMemoryStore();
  const { usageData, refreshUsageData, hasUsagePermission, checkPermissionStatus, requestUsagePermission } = useUsageStore();
  const { username, hasCompletedOnboarding } = useUserStore();
  const { colors, createThemedStyles, isDark, setTheme } = useTheme();
  const resultsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const checkReflectionToday = async () => {
    try {
      const result = await clientTools.getAllReflections();
      if (result.success && result.reflections) {
        const today = DateTime.now().setZone('Asia/Kolkata').toISODate();
        const todayReflection = result.reflections.find(reflection => 
          DateTime.fromISO(reflection.date).setZone('Asia/Kolkata').toISODate() === today
        );
        return !!todayReflection;
      }
      return false;
    } catch (error) {
      console.error('Error checking today\'s reflection:', error);
      return false;
    }
  };

  const handleOnboardingComplete = (newUsername: string) => {
    // User store handles the username setting
  };

  React.useEffect(() => {
    // Check permission status instead of auto-requesting
    checkUsagePermissionStatus();
  }, []);

  const checkUsagePermissionStatus = async () => {
    const hasPermission = await checkPermissionStatus();
    if (hasPermission) {
      refreshUsageDataWithRetry();
    }
  };

  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        // Wait for database to be ready (from _layout.tsx)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Configure background fetch for daily reflection reminders
        BackgroundFetch.configure(
          {
            minimumFetchInterval: 60*4, // 4 hours in minutes
            stopOnTerminate: false,
            enableHeadless: true,
            startOnBoot: true,
            requiredNetworkType: BackgroundFetch.NETWORK_TYPE_NONE,
            requiresCharging: false,
            requiresDeviceIdle: false,
            requiresBatteryNotLow: false,
          },
          async taskId => {
            console.log('BackgroundFetch taskId:', taskId);
            try {
              // Skip if user has disabled reflection reminders
              const remindersEnabled = await AsyncStorage.getItem('reflectionRemindersEnabled');
              const isEnabled = remindersEnabled === null ? true : remindersEnabled === 'true';
              if (!isEnabled) {
                BackgroundFetch.finish(taskId);
                return;
              }

              const now = DateTime.now().setZone('Asia/Kolkata');
              const hours = now.hour;
              
              // Check if it's later than 7PM
              if (hours >= 19) {
                const hasReflectionToday = await checkReflectionToday();
                if (!hasReflectionToday) {
                  await sendInstantNotification(
                    'Time to reflect 🌙',
                    'How was your day? Add a quick reflection before bed.'
                  );
                }
              }
            } catch (error) {
              console.error('Background fetch task failed:', error);
            } finally {
              BackgroundFetch.finish(taskId);
            }
          },
          error => {
            console.error('[BackgroundFetch] Failed to configure:', error);
          }
        );
        
        // Start the background fetch service
        BackgroundFetch.start();

        // Initialize data with proper retry logic
        await Promise.all([
          refreshTasks(),
          refreshMemories()
        ]);
        
        console.log('✅ App initialization complete');
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeApp();
  }, []);

  const refreshUsageDataWithRetry = async () => {
    let retries = 3;
    while (retries > 0) {
      try {
        await refreshUsageData();
        console.log('✅ Usage data refreshed successfully');
        break;
      } catch (error) {
        console.log(`❌ Usage data fetch failed, retries left: ${retries - 1}`);
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        }
      }
    }
  };

  React.useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      if (resultsTimeoutRef.current) {
        clearTimeout(resultsTimeoutRef.current);
      }
    };
  }, []);

  const styles = createThemedStyles((colors) => ({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: getResponsiveHeight(20),
      gap: getResponsiveSize(48),
    },
    container: {
      flex: 1,
      padding: getResponsiveSize(24),
    },
    mainArea: {
      flex: 1,
      gap: getResponsiveSize(16),
    },
    agentChatContainer: {
      flex: 1,
      padding: getResponsiveSize(32),
    },
    inputContainer: {
      padding: getResponsiveSize(24),
    },
    header: {
      marginTop: getResponsiveHeight(20),
      marginBottom: getResponsiveHeight(32),
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: getResponsiveSize(16),
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getResponsiveSize(16),
    },
    chatHeader: {
      marginVertical: getResponsiveHeight(30),
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    chatHeaderText: {
      fontSize: getResponsiveSize(28),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
    },
    greeting: {
      fontSize: getResponsiveSize(32),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
    },
    cardsContainer: {
      gap: getResponsiveSize(16),
    },
    row: {
      flexDirection: 'row',
      gap: getResponsiveSize(16),
    },
    disabledRow: {
      opacity: 0.5,
    },
    messageContainer: {
      flex: 1,
    },
    messageContentContainer: {
      paddingBottom: getResponsiveSize(20),
    },
    messagesWrapper: {
      flex: 1,
      justifyContent: 'flex-start',
    },
  }));

  if (!hasCompletedOnboarding) {
    return <OnboardingScreens onComplete={handleOnboardingComplete} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBarStyle} />
        <ScrollView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.greeting}>Hello {username}</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => router.push('/settings')}>
                <Ionicons 
                  name="settings-outline" 
                  size={getResponsiveSize(24)} 
                  color={colors.text} 
                />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.mainArea}>
            <View style={styles.cardsContainer}>
              <View style={styles.row}>
                <HomeCard
                  title="Tasks"
                  icon="checkmark-circle-outline"
                  onPress={() => {
                    router.push('/tasks');
                  }}
                />
                <HomeCard
                  title="Notes"
                  icon="bulb-outline"
                  onPress={() => {
                    router.push('/notes');
                  }}
                />
              </View>
              <View style={styles.row}>
                <HomeCard
                  title="Habits"
                  icon="bar-chart-outline"
                  onPress={() => {
                    router.push('/habits');
                  }}
                />
                <HomeCard
                  title="Reflections"
                  icon="calendar-outline"
                  onPress={() => {
                    router.push('/reflections');
                  }}
                />
              </View>
            </View>
            <UsageChart 
              usageData={usageData} 
              hasPermission={hasUsagePermission === null ? undefined : hasUsagePermission}
              onRequestPermission={async () => {
                await requestUsagePermission();
              }}
            />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


