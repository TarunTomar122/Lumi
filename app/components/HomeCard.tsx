import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../../utils/responsive';
import { useTheme } from '@/hooks/useTheme';

type HomeCardProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
};

const getSubtitle = (title: string) => {
  if (title === 'Tasks') return 'For your todos and reminders';
  if (title === 'Notes') return 'For your notes and ideas';
  if (title === 'Habits' || title === 'Streaks') return 'For your streaks and routines';
  if (title === 'Reflections') return 'For your daily reflections';
};

export default function HomeCard({ title, icon, onPress, disabled }: HomeCardProps) {
  const { colors, createThemedStyles } = useTheme();

  const styles = createThemedStyles((colors) => ({
    card: {
      flex: 1,
      padding: getResponsiveSize(20),
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      gap: getResponsiveSize(8),
      borderRadius: getResponsiveSize(6),
    },
    title: {
      fontSize: getResponsiveSize(18),
      fontFamily: 'MonaSans-Bold',
      color: colors.text,
    },
    subtitle: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
      lineHeight: getResponsiveSize(20),
    },
    disabled: {
      opacity: 0.5,
    },
  }));

  return (
    <TouchableOpacity
      style={[styles.card, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}>
      <Ionicons name={icon} size={getResponsiveSize(24)} color={colors.text} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{getSubtitle(title)}</Text>
    </TouchableOpacity>
  );
}
