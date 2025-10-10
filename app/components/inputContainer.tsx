import { TextInput, View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import React from 'react';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

export default function InputContainer({
  userResponse,
  setUserResponse,
  setStreamedResponse,
  handleSubmit,
  isRecording,
  setIsRecording,
  onlyRecording,
  placeholder,
  containerStyle,
  onAddImagePress,
}: {
  userResponse: string;
  setUserResponse: (text: string) => void;
  setStreamedResponse?: (text: string) => void;
  handleSubmit: () => void;
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  onlyRecording?: boolean;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
  onAddImagePress?: () => void;
}) {
  const { colors, createThemedStyles } = useTheme();
  const processedResultsRef = React.useRef<Set<string>>(new Set());
  const { state, startRecognizing, stopRecognizing, resetState } = useVoiceRecognition();

  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (state.error) {
      console.log('Error:', state.error);
      resetState();
      setIsRecording(false);
    }
  }, [state.error]);

  React.useEffect(() => {
    if (state.results[0] && !isRecording) {
      // Only process results when stopping recording
      // Check if we've already processed this result
      const resultString = state.results[0];
      if (!processedResultsRef.current.has(resultString)) {
        processedResultsRef.current.add(resultString);

        // remove any leading or trailing whitespace
        setUserResponse(resultString.trim());
      }
    }
  }, [state.results, isRecording]);

  React.useEffect(() => {
    if (setStreamedResponse && userResponse) {
      setStreamedResponse(userResponse);
    }
  }, [state.results]);

  const styles = createThemedStyles(colors => ({
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 8,
      marginBottom: 16,
      borderRadius: 12,
    },
    textInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      fontFamily: 'MonaSans-Medium',
      paddingHorizontal: 16,
      paddingVertical: 2,
    },
    micButton: {
      borderRadius: 20,
      padding: 12,
      marginLeft: 8,
    },
  }));

  if (onlyRecording) {
    return (
      <TouchableOpacity
        style={[]}
        onPress={() => {
          if (userResponse) {
            handleSubmit();
            setUserResponse('');
          } else if (isRecording) {
            stopRecognizing();
            setIsRecording(false);
            // Don't automatically submit - let user review and send manually
          } else {
            startRecognizing();
            setIsRecording(true);
            // Clear any previous results when starting new recording
            processedResultsRef.current.clear();
          }
        }}>
        <Ionicons name={isRecording ? 'mic' : 'mic-outline'} size={26} color={colors.text} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.inputContainer, containerStyle]}>
      <TextInput
        style={styles.textInput}
        placeholder={isRecording ? 'Listening...' : placeholder || 'Ask anything'}
        placeholderTextColor={colors.textSecondary}
        onChangeText={setUserResponse}
        value={userResponse}
        multiline={true}
        numberOfLines={4}
      />
      
      <TouchableOpacity
        style={{ paddingHorizontal: 8 }}
        onPress={() => {
          onAddImagePress?.();
        }}
      >
        <Ionicons name="image-outline" size={22} color={colors.text} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.micButton, { marginLeft: 8 }]}
        onPress={() => {
          if (userResponse) {
            handleSubmit();
            setUserResponse('');
          } else if (isRecording) {
            stopRecognizing();
            setIsRecording(false);
            // Don't automatically submit - let user review and send manually
          } else {
            startRecognizing();
            setIsRecording(true);
            // Clear any previous results when starting new recording
            processedResultsRef.current.clear();
          }
        }}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : userResponse ? (
          <Ionicons name="send" size={26} color={colors.text} />
        ) : (
          <Ionicons name={isRecording ? 'mic' : 'mic-outline'} size={26} color={colors.text} />
        )}
      </TouchableOpacity>
    </View>
  );
}
