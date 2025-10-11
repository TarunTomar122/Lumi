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
  Image,
  Alert,
} from 'react-native';
import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMemoryStore } from './store/memoryStore';
import InputContainer from './components/inputContainer';
import { clientTools } from '@/utils/tools';
import { getResponsiveSize, getResponsiveHeight } from '../utils/responsive';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export default function Notes() {
  const router = useRouter();
  const { colors, createThemedStyles } = useTheme();
  const insets = useSafeAreaInsets();
  const [userResponse, setUserResponse] = React.useState('');
  const [isRecording, setIsRecording] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const { memories, refreshMemories } = useMemoryStore();
  const { tag } = useLocalSearchParams();
  const [filteredMemories, setFilteredMemories] = React.useState(memories);
  const [uniqueTags, setUniqueTags] = React.useState<string[]>([]);
  const [keyboardOffset, setKeyboardOffset] = React.useState(0);
  const [inputBarHeight, setInputBarHeight] = React.useState(0);
  const [selectedImages, setSelectedImages] = React.useState<string[]>([]);

  React.useEffect(() => {
    const tags = memories.map(memory => memory.tags).flat();
    const uniqueTags = [...new Set(tags)];
    setUniqueTags(uniqueTags);
    if (tag) {
      setFilteredMemories(memories.filter(memory => memory.tags.includes(tag as string)));
    } else {
      setFilteredMemories(memories);
    }
  }, [memories]);

  React.useEffect(() => {
    refreshMemories();
    if (tag) {
      setFilteredMemories(memories.filter(memory => memory.tags.includes(tag as string)));
    } else {
      setFilteredMemories(memories);
    }
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

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshMemories();
    } catch (error) {
      console.error('Error refreshing notes:', error);
    }
    setRefreshing(false);
  }, []);

  const handleSubmit = () => {
    // Extract tag and content from format "tag: content" if present
    const tagRegex = /^([a-zA-Z]+):\s*(.+)$/;
    const match = userResponse.match(tagRegex);

    let selectedTag = (tag as string) || 'untagged';
    let noteContent = userResponse;

    if (match) {
      // If we found a tag in the format "tag: content"
      const [_, extractedTag, content] = match;
      selectedTag = extractedTag.toLowerCase();
      noteContent = content.trim();
    }

    // Create title from first 3 words of content
    const words = noteContent.split(/\s+/);
    const title = words.slice(0, 3).join(' ');

    clientTools.addMemory({
      title,
      content: noteContent,
      tags: [selectedTag],
      images: selectedImages,
    });
    setUserResponse('');
    setSelectedImages([]);
    refreshMemories();
  };

    const handleAddImagePress = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photos to attach images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled || (result as any).cancelled) {
        return;
      }

      const asset = (result as any).assets ? (result as any).assets[0] : result as any;
      const localUri = asset.uri;

      if (!localUri) return;

      const imagesDir = FileSystem.documentDirectory + 'images/';
      await FileSystem.makeDirectoryAsync(imagesDir, { intermediates: true }).catch(() => {});
      const namePart = localUri.split('/').pop();
      const dest = imagesDir + `${Date.now()}_${namePart}`;

      await FileSystem.copyAsync({ from: localUri, to: dest });

      setSelectedImages(prev => [...prev, dest]);
    } catch (error) {
      console.error('Error picking/copying image:', error);
      Alert.alert('Error', 'Could not attach image.');
    }
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
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
    container: {
      flex: 1,
      padding: getResponsiveSize(24),
    },
    title: {
      fontSize: getResponsiveSize(32),
      fontFamily: 'MonaSans-Bold',
      color: colors.text,
    },
    tagsList: {
      paddingRight: getResponsiveSize(12),
      maxHeight: getResponsiveSize(40),
    },
    tagContainer: {
      marginTop: getResponsiveSize(2),
      marginRight: getResponsiveSize(8),
      paddingHorizontal: getResponsiveSize(12),
      paddingVertical: getResponsiveSize(8),
      borderRadius: getResponsiveSize(16),
      backgroundColor: colors.divider,
    },
    activeTagContainer: {
      backgroundColor: colors.primary,
    },
    noNotesContainer: {
      flex: 1,
      gap: getResponsiveSize(12),
    },
    noNotesText: {
      fontSize: getResponsiveSize(18),
    },
    suggestionText: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'Roboto-Regular',
      color: colors.text,
    },
    tag: {
      fontSize: getResponsiveSize(16),
      color: colors.text,
      fontFamily: 'MonaSans-Regular',
    },
    notesList: {
      flex: 1,
    },
    notesListContent: {
      paddingBottom: 0,
    },
    noteItem: {
      paddingVertical: getResponsiveSize(16),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: getResponsiveSize(12),
    },
    noteTitle: {
      fontSize: getResponsiveSize(20),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
      marginBottom: getResponsiveSize(4),
    },
    noteText: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
    },
      noteThumbnail: {
      width: getResponsiveSize(72),
      height: getResponsiveSize(72),
      borderRadius: getResponsiveSize(8),
      marginBottom: getResponsiveSize(8),
      marginTop: getResponsiveSize(8),
    },
    imagesPreviewRow: {
      flexDirection: 'row',
      gap: getResponsiveSize(8),
      marginBottom: getResponsiveSize(8),
    },
    imagePreviewContainer: {
      width: getResponsiveSize(72),
      height: getResponsiveSize(72),
      borderRadius: getResponsiveSize(8),
      overflow: 'hidden',
      marginRight: getResponsiveSize(8),
      position: 'relative',
    },
    removeImageButton: {
      position: 'absolute',
      top: -6,
      right: -6,
      zIndex: 2,
    },
    emptyStateCard: {
      backgroundColor: colors.card,
      padding: getResponsiveSize(20),
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: getResponsiveSize(12),
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
    proTipsContainer: {
      marginTop: getResponsiveSize(20),
      paddingTop: getResponsiveSize(16),
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    proTipsTitle: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
      marginBottom: getResponsiveSize(12),
    },
    tipItem: {
      marginBottom: getResponsiveSize(8),
    },
    tipText: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'Roboto-Regular',
      color: colors.textSecondary,
      lineHeight: getResponsiveSize(20),
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBarStyle} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={getResponsiveSize(28)} color={colors.text} />
          <Text style={styles.backText}>Notes</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        {filteredMemories.length === 0 && (
          <View style={styles.noNotesContainer}>
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateTitle}>Capture your thoughts!</Text>

              <View style={styles.examplesContainer}>
                <View style={styles.exampleItem}>
                  <Text style={styles.exampleText}>"work: meeting with client tomorrow"</Text>
                  <Text style={styles.exampleDescription}>Work-related notes</Text>
                </View>
                <View style={styles.exampleItem}>
                  <Text style={styles.exampleText}>"ideas: app feature for location sharing"</Text>
                  <Text style={styles.exampleDescription}>Creative thoughts</Text>
                </View>
              </View>
            </View>
          </View>
        )}
        <ScrollView horizontal style={styles.tagsList} showsHorizontalScrollIndicator={false}>
          {uniqueTags.map((currTag, index) => (
            <TouchableOpacity
              style={[styles.tagContainer, tag === currTag && styles.activeTagContainer]}
              key={index}
              onPress={() => {
                if (tag === currTag) {
                  router.replace({
                    pathname: '/notes',
                  });
                } else {
                  router.replace({
                    pathname: '/notes',
                    params: { tag: currTag },
                  });
                }
              }}>
              <Text style={[styles.tag, tag === currTag && { color: colors.primaryText }]}>{currTag}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView
          style={styles.notesList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.notesListContent,
            { paddingBottom: inputBarHeight + insets.bottom },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
          }>
          {filteredMemories.map((note, index) => (
            <TouchableOpacity
              key={index}
              style={styles.noteItem}
              onPress={() => {
                router.push({
                  pathname: '/details',
                  params: { item: JSON.stringify(note) },
                });
              }}>
              <Text style={styles.noteTitle}>{note.title}</Text>
              <Text style={styles.noteText} numberOfLines={1}>
                {note.content}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View
          onLayout={(e) => setInputBarHeight(e.nativeEvent.layout.height)}
          style={[
            styles.inputBarContainer,
            { paddingBottom: insets.bottom, bottom: keyboardOffset },
          ]}
        >
        {selectedImages.length > 0 && (
          <View style={{ paddingHorizontal: getResponsiveSize(24), marginBottom: getResponsiveSize(8) }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedImages.map((uri, idx) => (
                <View key={idx} style={styles.imagePreviewContainer}>
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeSelectedImage(idx)}>
                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Image source={{ uri }} style={{ width: getResponsiveSize(72), height: getResponsiveSize(72) }} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}
          <InputContainer
            userResponse={userResponse}
            setUserResponse={setUserResponse}
            handleSubmit={handleSubmit}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            onlyRecording={false}
            placeholder="Work: This is a work note"
            containerStyle={{ marginBottom: 0 }}
            onAddImagePress={handleAddImagePress}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
