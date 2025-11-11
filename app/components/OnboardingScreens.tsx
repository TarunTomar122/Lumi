import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../store/userStore';
import { getResponsiveSize, getResponsiveHeight } from '../../utils/responsive';

const { width, height } = Dimensions.get('window');

interface OnboardingScreensProps {
  onComplete: (username: string) => void;
}

export const OnboardingScreens: React.FC<OnboardingScreensProps> = ({ onComplete }) => {
  const [currentScreen, setCurrentScreen] = React.useState(0);
  const [username, setUsername] = React.useState('');
  const { setOnboardingComplete } = useUserStore();

  const handleUsernameSubmit = () => {
    if (username.trim()) {
      setCurrentScreen(1);
    }
  };

  const handleSkipTour = async () => {
    await setOnboardingComplete(username);
    onComplete(username);
  };

  const handleNext = () => {
    if (currentScreen < 4) {
      setCurrentScreen(currentScreen + 1);
    } else {
      handleSkipTour();
    }
  };

  const renderUsernameScreen = () => (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fafafa" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.welcomeContainer}>
            <View style={styles.welcomeHeader}>
              <Image
                source={require('@/assets/images/icon.png')}
                style={styles.welcomeIcon}
                resizeMode="contain"
              />
              <View style={styles.welcomeTextContainer}>
                <Text style={styles.welcomeTitle}>Welcome to Lumi</Text>
                <Text style={styles.welcomeSubtitle}>Your personal productivity companion</Text>
              </View>
              <View style={styles.usernameSection}>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.usernameInput}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter your name"
                    placeholderTextColor="#999999"
                    autoFocus
                    onSubmitEditing={handleUsernameSubmit}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.continueButton, !username.trim() && styles.continueButtonDisabled]}
                  onPress={handleUsernameSubmit}
                  disabled={!username.trim()}>
                  <Text
                    style={[
                      styles.continueButtonText,
                      !username.trim() && styles.continueButtonTextDisabled,
                    ]}>
                    Continue
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={getResponsiveSize(20)}
                    color={username.trim() ? '#FFFFFF' : '#CCCCCC'}
                    style={styles.continueButtonIcon}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.welcomeFooter}>
              <Text style={styles.footerText}>Let's build better streaks together ✨</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  const renderFeatureScreen = (
    title: string,
    description: string,
    backgroundColor: string,
    illustration: React.ReactNode,
    isLast: boolean = false
  ) => (
    <SafeAreaView style={[styles.featureSafeArea, { backgroundColor }]}>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      <View style={styles.featureContainer}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkipTour}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <View style={styles.heroSection}>{illustration}</View>

        <View style={styles.contentSection}>
          <Text style={styles.featureTitle}>{title}</Text>
          <Text style={styles.featureDescription}>{description}</Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressDots}>
              {[1, 2, 3, 4].map(dot => (
                <View
                  key={dot}
                  style={[styles.progressDot, currentScreen === dot && styles.progressDotActive]}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Ionicons name="arrow-forward" size={getResponsiveSize(24)} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );

  const TasksIllustration = () => (
    <View style={styles.illustrationContainer}>
      <View style={styles.imageContainer}>
        <Image
          source={require('@/assets/images/onboarding/tasks.png')}
          style={styles.illustrationImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.demoContainer}>
        <View style={styles.appMockup}>
          <View style={styles.taskInputDemo}>
            <Text style={styles.taskInputText}>call mom tomorrow at 2pm</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const NotesIllustration = () => (
    <View style={styles.illustrationContainer}>
      <View style={styles.imageContainer}>
        <Image
          source={require('@/assets/images/onboarding/notes.png')}
          style={styles.illustrationImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.demoContainer}>
        <View style={styles.appMockup}>
          <View style={styles.tagDemo}>
            <View style={[styles.tagPill, styles.activeTag]}>
              <Text style={styles.activeTagText}>work</Text>
            </View>
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>personal</Text>
            </View>
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>ideas</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const HabitsIllustration = () => (
    <View style={styles.illustrationContainer}>
      <View style={styles.imageContainer}>
        <Image
          source={require('@/assets/images/onboarding/habits.png')}
          style={styles.illustrationImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.demoContainer}>
        <View style={styles.appMockup}>
          <View style={styles.habitItem}>
            <View style={styles.habitHeader}>
              <Text style={styles.habitName}>Morning meditation</Text>
              <Ionicons name="chevron-down" size={getResponsiveSize(20)} color="#000" />
            </View>
            <View style={styles.weekGrid}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => {
                // More random completion pattern: completed on M, T, F (indices 0, 1, 4)
                const isCompleted = [0, 1, 3, 4, 6].includes(index);
                return (
                  <View key={index} style={styles.dayItem}>
                    <Text style={styles.dayLabel}>{day}</Text>
                    <View style={[styles.habitCircle, isCompleted && styles.completedCircle]} />
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const ReflectionsIllustration = () => (
    <View style={styles.illustrationContainer}>
      <View style={styles.imageContainer}>
        <Image
          source={require('@/assets/images/onboarding/reflections.png')}
          style={styles.illustrationImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.demoContainer}>
        <View style={styles.promptDemo}>
          <Text style={styles.promptQuestion}>What made you smile today?</Text>
        </View>
        <View style={styles.promptDemoInput}>
          <Text style={styles.demoInputText}>had a great chat with...</Text>
          <Ionicons name="mic" size={getResponsiveSize(16)} color="#999" />
        </View>
      </View>
    </View>
  );

  if (currentScreen === 0) {
    return renderUsernameScreen();
  }

  const screens = [
    {
      title: 'Smart Task Input',
      description: 'Just type naturally—Lumi figures out what you need to do and when.',
      backgroundColor: '#ffffff',
      illustration: <TasksIllustration />,
    },
    {
      title: 'Effortless Notes',
      description: 'Add notes instantly with tags. Filter and find everything in seconds.',
      backgroundColor: '#ffffff',
      illustration: <NotesIllustration />,
    },
    {
      title: 'Visual Streaks',
      description: 'Build streaks and see your progress with beautiful weekly views.',
      backgroundColor: '#ffffff',
      illustration: <HabitsIllustration />,
    },
    {
      title: 'Daily Reflection',
      description: 'Guided prompts help you reflect and grow every single day.',
      backgroundColor: '#ffffff',
      illustration: <ReflectionsIllustration />,
    },
  ];

  const currentScreenData = screens[currentScreen - 1];

  return renderFeatureScreen(
    currentScreenData.title,
    currentScreenData.description,
    currentScreenData.backgroundColor,
    currentScreenData.illustration,
    currentScreen === 4
  );
};

const styles = StyleSheet.create({
  // Welcome screen styles
  safeArea: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  welcomeContainer: {
    flex: 1,
    padding: getResponsiveSize(32),
    justifyContent: 'space-between',
  },
  welcomeHeader: {
    alignItems: 'center',
    paddingTop: getResponsiveHeight(30),
  },
  welcomeIcon: {
    width: Math.min(getResponsiveSize(240), width * 0.6),
    height: Math.min(getResponsiveSize(240), width * 0.6),
    marginBottom: getResponsiveHeight(-24),
  },
  welcomeTextContainer: {
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: getResponsiveSize(36),
    fontFamily: 'MonaSans-Bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: getResponsiveSize(8),
  },
  welcomeSubtitle: {
    fontSize: getResponsiveSize(16),
    fontFamily: 'MonaSans-Regular',
    color: '#666666',
    textAlign: 'center',
  },
  usernameSection: {
    marginTop: getResponsiveSize(32),
    justifyContent: 'center',
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: getResponsiveSize(12),
    marginBottom: getResponsiveSize(24),
  },
  usernameInput: {
    flex: 1,
    fontSize: getResponsiveSize(16),
    fontFamily: 'MonaSans-Regular',
    color: '#000000',
  },
  continueButton: {
    backgroundColor: '#000000',
    paddingVertical: getResponsiveSize(18),
    paddingHorizontal: getResponsiveSize(32),
    borderRadius: getResponsiveSize(16),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonDisabled: {
    backgroundColor: '#F0F0F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: getResponsiveSize(18),
    fontFamily: 'MonaSans-Medium',
  },
  continueButtonTextDisabled: {
    color: '#CCCCCC',
  },
  continueButtonIcon: {
    marginLeft: getResponsiveSize(8),
  },
  welcomeFooter: {
    alignItems: 'center',
    paddingBottom: getResponsiveSize(20),
  },
  footerText: {
    fontSize: getResponsiveSize(14),
    fontFamily: 'MonaSans-Regular',
    color: '#999999',
    textAlign: 'center',
  },

  // Feature screen styles
  featureSafeArea: {
    flex: 1,
  },
  featureContainer: {
    flex: 1,
    paddingTop: getResponsiveHeight(40),
  },
  skipButton: {
    position: 'absolute',
    top: getResponsiveHeight(50),
    right: getResponsiveSize(24),
    zIndex: 10,
    paddingVertical: getResponsiveSize(8),
    paddingHorizontal: getResponsiveSize(16),
  },
  skipText: {
    fontSize: getResponsiveSize(16),
    fontFamily: 'MonaSans-Medium',
    color: '#000000',
    opacity: 0.7,
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(24),
    paddingTop: getResponsiveHeight(32),
  },
  contentSection: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: getResponsiveSize(32),
    borderTopRightRadius: getResponsiveSize(32),
    paddingHorizontal: getResponsiveSize(32),
    paddingTop: getResponsiveSize(24),
    paddingBottom: getResponsiveSize(32),
  },
  featureTitle: {
    fontSize: getResponsiveSize(28),
    fontFamily: 'MonaSans-Bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: getResponsiveSize(16),
  },
  featureDescription: {
    fontSize: getResponsiveSize(16),
    fontFamily: 'MonaSans-Regular',
    color: '#666666',
    textAlign: 'center',
    lineHeight: getResponsiveSize(24),
    marginBottom: getResponsiveSize(40),
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    gap: getResponsiveSize(8),
  },
  progressDot: {
    width: getResponsiveSize(12),
    height: getResponsiveSize(12),
    borderRadius: getResponsiveSize(6),
    backgroundColor: '#E0E0E0',
    marginLeft: getResponsiveSize(8),
  },
  progressDotActive: {
    backgroundColor: '#000000',
    width: getResponsiveSize(24),
  },
  nextButton: {
    width: getResponsiveSize(56),
    height: getResponsiveSize(56),
    borderRadius: getResponsiveSize(28),
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },

  // Illustration styles
  illustrationContainer: {
    width: width - getResponsiveSize(48),
    height: Math.min(getResponsiveHeight(280), height * 0.35),
    position: 'relative',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: getResponsiveSize(24),
  },
  illustrationImage: {
    width: Math.min(getResponsiveSize(240), width * 0.7),
    height: Math.min(getResponsiveSize(240), width * 0.7),
  },
  demoContainer: {
    flex: 1,
    width: '100%',
    padding: getResponsiveSize(16),
    justifyContent: 'center',
    marginTop: getResponsiveSize(24),
  },
  demoInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: getResponsiveSize(12),
  },
  demoInputText: {
    flex: 1,
    fontSize: getResponsiveSize(16),
    fontFamily: 'MonaSans-Regular',
    color: '#000000',
  },
  tagDemo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSize(8),
  },
  tagPill: {
    padding: getResponsiveSize(8),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: getResponsiveSize(12),
  },
  activeTag: {
    backgroundColor: '#000000',
  },
  activeTagText: {
    fontSize: getResponsiveSize(16),
    fontFamily: 'MonaSans-Medium',
    color: '#ffffff',
  },
  tagText: {
    fontSize: getResponsiveSize(16),
    fontFamily: 'MonaSans-Regular',
    color: '#666666',
  },
  promptDemo: {
    margin: getResponsiveSize(18),
  },
  promptDemoInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: getResponsiveSize(12),
  },
  promptQuestion: {
    fontSize: getResponsiveSize(16),
    fontFamily: 'MonaSans-Regular',
    color: '#666666',
    textAlign: 'center',
  },
  taskInputDemo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: getResponsiveSize(16),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: getResponsiveSize(12),
  },
  taskInputText: {
    flex: 1,
    fontSize: getResponsiveSize(16),
    fontFamily: 'MonaSans-Regular',
    color: '#000000',
  },
  appMockup: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitItem: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    paddingTop: getResponsiveSize(16),
  },
  habitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: getResponsiveSize(16),
    marginBottom: getResponsiveSize(18),
  },
  habitName: {
    fontSize: getResponsiveSize(18),
    fontFamily: 'MonaSans-Medium',
    color: '#000000',
  },
  weekGrid: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: getResponsiveSize(16),
    minHeight: getResponsiveSize(100),
  },
  dayItem: {
    alignItems: 'center',
    gap: getResponsiveSize(12),
  },
  dayLabel: {
    fontSize: getResponsiveSize(14),
    fontFamily: 'MonaSans-Regular',
    color: '#666666',
  },
  habitCircle: {
    width: getResponsiveSize(28),
    height: getResponsiveSize(28),
    borderRadius: getResponsiveSize(14),
    backgroundColor: '#F0F0F0',
  },
  completedCircle: {
    backgroundColor: '#FF9AA2',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
});
