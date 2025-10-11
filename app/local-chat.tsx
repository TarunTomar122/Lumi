import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { initLlama } from 'llama.rn';
import { getLocalModelStatus } from '../utils/localModel';
import { useTheme } from '@/hooks/useTheme';
import { getResponsiveHeight, getResponsiveSize } from '../utils/responsive';
import InputContainer from './components/inputContainer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseTaskInput } from '../utils/taskParser';
import { useTaskStore } from './store/taskStore';
import { DateTime } from 'luxon';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export default function LocalChat() {
  const router = useRouter();
  const { colors, createThemedStyles } = useTheme();
  const [loadingModel, setLoadingModel] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [contextRef, setContextRef] = useState<any>(null);
  const [userResponse, setUserResponse] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const insets = useSafeAreaInsets();
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [inputBarHeight, setInputBarHeight] = useState(0);
  const { addTask, refreshTasks } = useTaskStore();

  const styles = createThemedStyles(colors => ({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: getResponsiveHeight(28),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingHorizontal: getResponsiveSize(24),
      paddingTop: getResponsiveHeight(20),
      paddingBottom: getResponsiveSize(10),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backText: {
      fontSize: getResponsiveSize(24),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
      marginLeft: getResponsiveSize(12),
      marginBottom: getResponsiveSize(3),
    },
    container: {
      flex: 1,
      padding: getResponsiveSize(16),
      gap: getResponsiveSize(12),
    },
    bubbleUser: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
      padding: getResponsiveSize(12),
      borderRadius: getResponsiveSize(12),
      marginVertical: getResponsiveSize(4),
      maxWidth: '85%',
    },
    bubbleAssistant: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surface,
      padding: getResponsiveSize(12),
      borderRadius: getResponsiveSize(12),
      marginVertical: getResponsiveSize(4),
      maxWidth: '85%',
      borderWidth: 1,
      borderColor: colors.border,
    },
    bubbleTextUser: {
      color: colors.primaryText,
      fontFamily: 'MonaSans-Regular',
      fontSize: getResponsiveSize(16),
    },
    bubbleTextAssistant: {
      color: colors.text,
      fontFamily: 'MonaSans-Regular',
      fontSize: getResponsiveSize(16),
    },
    inputBarContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: getResponsiveSize(16),
      paddingTop: getResponsiveSize(8),
      marginBottom: getResponsiveSize(12),
      backgroundColor: colors.background,
    },
  }));

  useEffect(() => {
    const init = async () => {
      try {
        setLoadingModel(true);
        const status = await getLocalModelStatus();
        if (!status.hasModel || !status.modelPath) {
          Alert.alert('Model not found', 'Please download the model in Settings first.');
          router.back();
          return;
        }
        setInitializing(true);
        const ctx = await initLlama({
          model: status.modelPath,
          use_mlock: true,
          n_ctx: 2048,
          n_gpu_layers: 1,
        });
        setContextRef(ctx);
      } catch (e) {
        console.error(e);
        Alert.alert('Initialization failed', 'Could not initialize local model.');
        router.back();
      } finally {
        setInitializing(false);
        setLoadingModel(false);
      }
    };
    init();
    return () => {
      // TODO: llama.rn contexts are GC'ed; explicit release isn't required in current API
    };
  }, [router]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: any) => setKeyboardOffset(e?.endCoordinates?.height || 0);
    const onHide = () => setKeyboardOffset(0);
    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const handleSend = async () => {
    if (!userResponse.trim() || !contextRef || isGenerating) return;
    const userMsg: ChatMessage = { role: 'user', content: userResponse.trim() };
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '' }]);
    setIsGenerating(true);
    try {
      const stop = ['</s>', '<|end|>', '<|end_of_text|>', 'User:', 'Assistant:', '\nUser:'];
      const res = await contextRef.completion(
        {
          messages: [{ role: 'user', content: userMsg.content }],
          n_predict: 200,
          temperature: 0.7,
          stop,
        },
        (data: any) => {
          const { token } = data;
          setMessages(prev => {
            const out = [...prev];
            // Append token to the last assistant message
            out[out.length - 1] = {
              role: 'assistant',
              content: (out[out.length - 1]?.content || '') + (token || ''),
            };
            return out;
          });
          requestAnimationFrame(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          });
        }
      );
      // Ensure final text is set (in case callback missed last token)
      if (res?.text) {
        setMessages(prev => {
          const out = [...prev];
          out[out.length - 1] = { role: 'assistant', content: res.text };
          return out;
        });

        // Try to parse model JSON and auto-add task if present
        try {
          const text = (res.text || '').trim();
          let jsonText = '';
          try {
            // First, try direct parse
            JSON.parse(text);
            jsonText = text;
          } catch {
            // Fallback: extract first JSON-like block
            const match = text.match(/\{[\s\S]*\}/);
            if (match) jsonText = match[0];
          }
          if (jsonText) {
            const parsed = JSON.parse(jsonText);
            const taskText: string | null = parsed?.task ?? null;
            if (taskText && typeof taskText === 'string') {
              const taskData = parseTaskInput(taskText);
              const result = await addTask(taskData as any);
              if (result.success) {
                await refreshTasks();
                const when = taskData.reminder_date
                  ? DateTime.fromISO(taskData.reminder_date).setZone('Asia/Kolkata').toFormat('ccc, dd LLL, hh:mm a')
                  : 'no reminder';
                setMessages(prev => [
                  ...prev,
                  { role: 'assistant', content: `✅ Added task: "${taskData.title}" • ${when}` },
                ]);
              }
            }
          }
        } catch (e) {
          // Ignore parse/DB errors silently in chat UI
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Generation failed', 'There was an error generating a response.');
    } finally {
      setIsGenerating(false);
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBarStyle} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={getResponsiveSize(28)} color={colors.text} />
          <Text style={styles.backText}>Lumi Local Chat</Text>
        </TouchableOpacity>
      </View>
      {loadingModel || initializing ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollViewRef}
            style={{
              flex: 1,
              paddingHorizontal: getResponsiveSize(16),
              paddingTop: getResponsiveSize(12),
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ paddingBottom: inputBarHeight + insets.bottom }}>
            {messages.map((m, idx) => (
              <View
                key={idx}
                style={m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}>
                <Text
                  style={m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
                  {m.content}
                </Text>
              </View>
            ))}
          </ScrollView>
          <View
            onLayout={e => setInputBarHeight(e.nativeEvent.layout.height)}
            style={[
              styles.inputBarContainer,
              { paddingBottom: insets.bottom, bottom: keyboardOffset },
            ]}>
            <InputContainer
              userResponse={userResponse}
              setUserResponse={setUserResponse}
              handleSubmit={handleSend}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
              onlyRecording={false}
              placeholder="Ask Lumi locally"
              containerStyle={{ marginBottom: 0 }}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
