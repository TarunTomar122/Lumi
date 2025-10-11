import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  StatusBar,
  Platform,
  Keyboard,
} from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DateTime } from 'luxon';
import { useReflectionStore } from './store/reflectionStore';
import InputContainer from './components/inputContainer';
import { ReflectionPrompt } from './components/ReflectionPrompt';
import { getResponsiveSize, getResponsiveHeight } from '../utils/responsive';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Reflections() {
  const router = useRouter();
  const { colors, createThemedStyles } = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = React.useState(false);
  const [userResponse, setUserResponse] = React.useState('');
  const [selectedPrompt, setSelectedPrompt] = React.useState<string | undefined>();
  const [isRecording, setIsRecording] = React.useState(false);
  const { reflections, refreshReflections, addReflection } = useReflectionStore();
  const [keyboardOffset, setKeyboardOffset] = React.useState(0);
  const [inputBarHeight, setInputBarHeight] = React.useState(0);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshReflections();
    } catch (error) {
      console.error('Error refreshing reflections:', error);
    }
    setRefreshing(false);
  }, []);

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

  React.useEffect(() => {
    refreshReflections();
  }, []);

  const formatDate = (dateStr: string) => {
    return DateTime.fromISO(dateStr).toFormat('MMMM d, yyyy');
  };

  // Parse content to separate prompt and response - same logic as in [id].tsx
  const parseContent = (content: string) => {
    const lines = content.split('\n');
    const promptLineIndex = lines.findIndex(line => line.toLowerCase().startsWith('prompt:'));
    
    if (promptLineIndex === -1) {
      return { prompt: '', response: content };
    }
    
    const prompt = lines[promptLineIndex].substring(7).trim(); // Remove "prompt:" and trim
    const response = lines.slice(promptLineIndex + 1).join('\n').trim();
    
    return { prompt, response };
  };

  const handleSubmit = async () => {
    if (!userResponse) return;

    let date = DateTime.now();
    // Include the selected prompt if one was chosen
    let content = selectedPrompt ? `prompt: ${selectedPrompt}\n\n${userResponse}` : userResponse;

    // First split by colon
    const parts = userResponse.split(':');

    if (parts.length > 1) {
      // Everything before the first colon is potential date
      const datePart = parts[0].trim();
      // Everything after the first colon is content
      const responseContent = parts.slice(1).join(':').trim();

      // Now try to parse the date part - it can be either "2 apr" or "apr 2"
      const dateWords = datePart.split(/\s+/);

      // Get the last two words (in case there's text before the date)
      const lastTwo = dateWords.slice(-2);

      if (lastTwo.length === 2) {
        // Try all possible formats
        const formats = ['d MMMM', 'MMMM d', 'd MMM', 'MMM d'];
        let parsedDate = null;

        for (const format of formats) {
          const attempt = DateTime.fromFormat(lastTwo.join(' '), format);
          if (attempt.isValid) {
            parsedDate = attempt;
            break;
          }
        }

        if (parsedDate?.isValid) {
          date = parsedDate.set({ year: DateTime.now().year });
          // Update content with parsed date removed
          content = selectedPrompt ? `prompt: ${selectedPrompt}\n\n${responseContent}` : responseContent;
        }
      }
    }

    await addReflection(date.toISODate() || '', content);
    setUserResponse('');
    setSelectedPrompt(undefined);
    refreshReflections();
  };

  const handlePromptSelect = (prompt: string) => {
    // Toggle prompt selection - don't modify input
    if (selectedPrompt === prompt) {
      setSelectedPrompt(undefined);
    } else {
      setSelectedPrompt(prompt);
    }
  };

  const handleRandomReflection = () => {
    if (reflections.length === 0) return;
    
    // Pick a random reflection
    const randomIndex = Math.floor(Math.random() * reflections.length);
    const randomReflection = reflections[randomIndex];
    
    if (randomReflection.id) {
      router.push(`/reflection/${randomReflection.id}`);
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
      paddingBottom: getResponsiveHeight(10),
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
      padding: getResponsiveSize(24),
    },
    noReflectionsContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: getResponsiveHeight(100),
    },
    noReflectionsText: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
    },
    reflectionsList: {
      flex: 1,
      marginTop: getResponsiveHeight(12),
    },
    reflectionsListContent: {
      paddingBottom: 0,
    },
    reflectionItem: {
      marginBottom: getResponsiveHeight(16),
      paddingVertical: getResponsiveHeight(6),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    reflectionDate: {
      fontSize: getResponsiveSize(18),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
      marginBottom: getResponsiveHeight(8),
    },
    reflectionPreview: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
      lineHeight: getResponsiveSize(22),
    },
    randomButton: {
      padding: getResponsiveSize(4),
    },
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBarStyle} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={getResponsiveSize(28)} color={colors.text} />
          <Text style={styles.backText}>Reflections</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={handleRandomReflection} 
          style={[styles.randomButton, { opacity: reflections.length === 0 ? 0.3 : 1 }]}
          disabled={reflections.length === 0}>
          <Ionicons name="shuffle" size={getResponsiveSize(28)} color={colors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        <ReflectionPrompt onPromptSelect={handlePromptSelect} selectedPrompt={selectedPrompt} />
        {reflections.length === 0 && (
          <View style={styles.noReflectionsContainer}>
            <Text style={styles.noReflectionsText}>No reflections yet.</Text>
            <Text style={styles.noReflectionsText}>Start by answering a prompt.</Text>
          </View>
        )}
        <ScrollView
          style={styles.reflectionsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.reflectionsListContent,
            { paddingBottom: inputBarHeight + insets.bottom },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
          }>
          {reflections.map(reflection => {
            const { response } = parseContent(reflection.content);
            return (
              <TouchableOpacity
                key={reflection.id}
                style={styles.reflectionItem}
                onPress={() => router.push(`/reflection/${reflection.id}`)}>
                <Text style={styles.reflectionDate}>{formatDate(reflection.date)}</Text>
                <Text style={styles.reflectionPreview} numberOfLines={2}>
                  {response || reflection.content}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View
          onLayout={(e) => setInputBarHeight(e.nativeEvent.layout.height)}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: keyboardOffset,
            paddingHorizontal: getResponsiveSize(24),
            paddingTop: getResponsiveSize(8),
            marginBottom: getResponsiveSize(16),
            backgroundColor: colors.background,
          }}
        >
          <InputContainer
            userResponse={userResponse}
            setUserResponse={setUserResponse}
            handleSubmit={handleSubmit}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            placeholder="Today was a good day"
            containerStyle={{ marginBottom: insets.bottom }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
