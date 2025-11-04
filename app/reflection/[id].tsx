import * as React from 'react';
import { useRef, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  StatusBar,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReflectionStore } from '../store/reflectionStore';
import { DateTime } from 'luxon';
import { getResponsiveSize, getResponsiveHeight } from '../../utils/responsive';
import { useTheme } from '@/hooks/useTheme';

const ReflectionDetails = () => {
  const router = useRouter();
  const { colors, createThemedStyles } = useTheme();
  const { id } = useLocalSearchParams();
  const reflections = useReflectionStore(state => state.reflections);
  const { updateReflection, deleteReflection } = useReflectionStore();
  const reflection = reflections.find(r => r.id === Number(id));
  const [isLoading, setIsLoading] = React.useState(false);
  const [textContent, setTextContent] = React.useState(reflection?.content || '');
  const [isEditing, setIsEditing] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  // Parse content to separate prompt and response
  const parseContent = (content: string) => {
    const lines = content.split('\n');
    const promptLineIndex = lines.findIndex(line => line.toLowerCase().startsWith('prompt:'));

    if (promptLineIndex === -1) {
      return { prompt: '', response: content };
    }

    const prompt = lines[promptLineIndex].substring(7).trim(); // Remove "prompt:" and trim
    const response = lines
      .slice(promptLineIndex + 1)
      .join('\n')
      .trim();

    return { prompt, response };
  };

  const { prompt, response } = parseContent(textContent);
  const [responseContent, setResponseContent] = React.useState(response);
  const scrollViewRef = useRef<ScrollView>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const contentInputRef = React.useRef<TextInput>(null);

  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsEditing(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsEditing(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (reflection?.id) {
      await deleteReflection(reflection.id);
      setShowDeleteConfirm(false);
      router.back();
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const debouncedSave = useCallback(
    (newContent: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        if (!reflection?.id) return;
        setIsLoading(true);
        try {
          await updateReflection(reflection.id, { content: newContent });
        } catch (error) {
          console.error('Error auto-saving reflection:', error);
        } finally {
          setIsLoading(false);
        }
      }, 500);
    },
    [reflection?.id, updateReflection]
  );

  const handleTextChange = (text: string) => {
    setResponseContent(text);
    // Reconstruct full content with prompt and response
    const fullContent = prompt ? `prompt: ${prompt}\n\n${text}` : text;
    setTextContent(fullContent);
    debouncedSave(fullContent);
  };

  const styles = createThemedStyles(colors => ({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: getResponsiveHeight(28),
    },
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      fontSize: getResponsiveSize(18),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: getResponsiveSize(24),
      paddingTop: getResponsiveHeight(20),
      paddingBottom: getResponsiveSize(10),
      borderBottomWidth: 1,
      backgroundColor: colors.background,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getResponsiveSize(12),
    },
    headerTitle: {
      fontSize: getResponsiveSize(24),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
    },
    headerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: getResponsiveSize(12),
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getResponsiveSize(12),
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: getResponsiveSize(24),
    },
    modalContainer: {
      width: '100%',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: getResponsiveSize(20),
    },
    modalTitle: {
      fontSize: getResponsiveSize(18),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
      marginBottom: getResponsiveSize(8),
    },
    modalMessage: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
      marginBottom: getResponsiveSize(16),
      lineHeight: getResponsiveSize(20),
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: getResponsiveSize(12),
    },
    modalButton: {
      paddingVertical: getResponsiveSize(10),
      paddingHorizontal: getResponsiveSize(16),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    modalCancelButton: {
      backgroundColor: colors.card,
    },
    modalDeleteButton: {
      backgroundColor: colors.error,
      borderColor: colors.error,
    },
    modalButtonText: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Medium',
    },
    modalCancelButtonText: {
      color: colors.text,
    },
    modalDeleteButtonText: {
      color: '#ffffff',
    },
    loader: {
      marginRight: getResponsiveSize(4),
    },
    contentContainer: {
      flex: 1,
      paddingHorizontal: getResponsiveSize(20),
      paddingTop: getResponsiveSize(12),
    },
    dateTitle: {
      fontSize: getResponsiveSize(22),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
      marginBottom: getResponsiveSize(16),
      paddingVertical: getResponsiveSize(8),
    },
    contentInput: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
      lineHeight: getResponsiveSize(24),
      minHeight: getResponsiveHeight(200),
      paddingVertical: 0,
      paddingHorizontal: 0,
    },
    bottomInfo: {
      paddingHorizontal: getResponsiveSize(24),
      paddingVertical: getResponsiveSize(16),
      alignItems: 'center',
    },
    timestampText: {
      fontSize: getResponsiveSize(12),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
    },
    promptContainer: {
      backgroundColor: colors.background,
      padding: getResponsiveSize(16),
      marginBottom: getResponsiveSize(20),
      borderWidth: 1,
      borderColor: colors.border,
    },
    promptLabel: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Medium',
      color: colors.primary,
      marginBottom: getResponsiveSize(8),
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    promptText: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
      lineHeight: getResponsiveSize(22),
    },
  }));

  if (!reflection) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={getResponsiveSize(28)} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.container}>
          <Text style={styles.errorText}>Reflection not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.statusBarBackground} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={getResponsiveSize(28)} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {' '}
            {DateTime.fromISO(reflection.date).toFormat('MMMM d')}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {isLoading && <ActivityIndicator size="small" color={colors.textSecondary} style={styles.loader} />}
          <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
            <Ionicons name="trash-outline" size={getResponsiveSize(28)} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Prompt Section (Non-editable) */}
        {prompt && (
          <View style={styles.promptContainer}>
            <Text style={styles.promptLabel}>Prompt</Text>
            <Text style={styles.promptText}>{prompt}</Text>
          </View>
        )}

        {/* Response Input (Editable) */}
        <TextInput
          ref={contentInputRef}
          style={styles.contentInput}
          multiline={true}
          value={responseContent}
          onChangeText={handleTextChange}
          placeholder={prompt ? 'Your response...' : 'How was your day?'}
          placeholderTextColor={colors.textTertiary}
          textAlignVertical="top"
          scrollEnabled={false}
        />
      </ScrollView>

      {/* Bottom timestamp */}
      {!isEditing && (
        <View style={styles.bottomInfo}>
          {/* <Text style={styles.timestampText}>
            Edited{' '}
            {new Date(reflection.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })}
          </Text> */}
        </View>
      )}

      {/* Delete confirmation modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Delete reflection?</Text>
            <Text style={styles.modalMessage}>
              This action cannot be undone. Are you sure you want to delete this reflection?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={handleCancelDelete} style={[styles.modalButton, styles.modalCancelButton]}>
                <Text style={[styles.modalButtonText, styles.modalCancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmDelete} style={[styles.modalButton, styles.modalDeleteButton]}>
                <Text style={[styles.modalButtonText, styles.modalDeleteButtonText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ReflectionDetails;
