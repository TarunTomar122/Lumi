import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, TextInput, ScrollView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { getResponsiveHeight, getResponsiveSize } from '@/utils/responsive';
import { PASTEL_COLORS, useHabitStore } from '../store/habitStore';

export default function NewHabit() {
  const router = useRouter();
  const { colors, createThemedStyles } = useTheme();
  const { addHabit } = useHabitStore();
  const [title, setTitle] = React.useState('');
  const [selectedColor, setSelectedColor] = React.useState<string>(PASTEL_COLORS[0]);

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
      paddingHorizontal: getResponsiveSize(20),
      paddingTop: getResponsiveSize(24),
    },
    sectionLabel: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Medium',
      color: colors.textSecondary,
      marginBottom: getResponsiveSize(8),
    },
    inputContainer: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: getResponsiveSize(12),
      paddingHorizontal: getResponsiveSize(16),
      paddingVertical: getResponsiveSize(12),
      marginBottom: getResponsiveSize(24),
    },
    textInput: {
      fontSize: getResponsiveSize(18),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: getResponsiveSize(12),
      marginTop: getResponsiveSize(8),
      marginBottom: getResponsiveSize(28),
    },
    colorSwatch: {
      width: getResponsiveSize(36),
      height: getResponsiveSize(36),
      borderRadius: getResponsiveSize(18),
      borderWidth: 1,
      borderColor: colors.border,
    },
    colorSelected: {
      borderWidth: 2,
      borderColor: colors.text,
    },
    createButton: {
      position: 'absolute',
      left: getResponsiveSize(20),
      right: getResponsiveSize(20),
      bottom: getResponsiveSize(24),
      paddingVertical: getResponsiveSize(14),
      borderRadius: getResponsiveSize(12),
      backgroundColor: title.trim() ? colors.primary : colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    createButtonText: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-SemiBold',
      color: colors.background,
    },
  }));

  const handleCreate = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    await addHabit(trimmed, selectedColor);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBarStyle} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={getResponsiveSize(28)} color={colors.text} />
          <Text style={styles.backText}>New Streak</Text>
        </TouchableOpacity>
        <View />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" style={styles.container}>
        <Text style={styles.sectionLabel}>Name</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Reading"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
        </View>

        <Text style={styles.sectionLabel}>Color</Text>
        <View style={styles.colorGrid}>
          {PASTEL_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => setSelectedColor(c)}
              activeOpacity={0.9}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                selectedColor === c && styles.colorSelected,
              ]}
            />
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.createButton}
        activeOpacity={title.trim() ? 0.9 : 1}
        onPress={handleCreate}
        disabled={!title.trim()}>
        <Text style={styles.createButtonText}>Create</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}


