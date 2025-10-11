import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../../utils/responsive';
import { useTheme } from '@/hooks/useTheme';

const PROMPTS = [
  // Positive prompts
  'Describe one specific moment today that made you smile - what exactly happened?',
  'Which person did you enjoy spending time with today and what did you do together?',
  'What was the most enjoyable activity you did today and why did it stand out?',
  'Tell me about one small interaction today that lifted your mood',
  'What was the best part of your morning/afternoon/evening today?',
  'Describe a moment of connection you had with someone today',
  'What made you laugh out loud today?',
  'What was the most satisfying task you completed today?',
  'Tell me about a moment today when you felt loved or cared for',
  'What unexpected good thing happened to you today?',
  
  // Neutral/Observational prompts
  'What did you spend most of your time doing today?',
  'Describe the first thing you remember from when you woke up',
  'What was the most interesting thing you noticed today?',
  'How did you spend your free time today?',
  'What conversations did you have today and what were they about?',
  'What was different about today compared to yesterday?',
  'What did you eat today and how did it make you feel?',
  'Describe the energy levels you had throughout the day',
  'What thoughts kept coming back to you today?',
  'How did you feel physically today - any aches, pains, or sensations?',
  'What decisions did you make today, big or small?',
  'Describe your workspace or environment today',
  'What did you learn about yourself today?',
  'How did you feel about the pace of your day?',
  'What was on your mind during quiet moments today?',
  
  // Reflective/Challenging prompts
  'What was the hardest part of today and how did you handle it?',
  'Describe a moment today when you felt frustrated or upset',
  'What did you wish had gone differently today?',
  'Tell me about a time today when you felt misunderstood or alone',
  'What worried you the most today?',
  'Describe a situation today that left you feeling drained',
  'What made you feel anxious or stressed today?',
  'Tell me about something you avoided or put off today',
  'What disappointed you today?',
  'Describe a moment when you felt overwhelmed today',
  'What made you feel sad or heavy-hearted today?',
  'Tell me about a conflict or tension you experienced today',
  'What regret or "should have" thought crossed your mind today?',
  'Describe a moment today when you felt inadequate or not good enough',
  'What did you struggle with today that you wish was easier?',
  'Tell me about a time today when you felt disconnected from others',
  'What fear or insecurity came up for you today?',
  'Describe something you were too tired or unmotivated to do today',
  'What criticism or negative feedback affected you today?',
  'Tell me about a moment today when you felt stuck or uncertain',
  'What loss or ending are you processing today?',
  'Describe a time today when you felt like you weren\'t living up to expectations',
  'What part of today felt empty or meaningless?',
  'Tell me about something that triggered sadness or grief today',
  'What made you feel lonely today?',
];

interface ReflectionPromptProps {
  onPromptSelect: (prompt: string) => void;
  selectedPrompt?: string;
}

export const ReflectionPrompt: React.FC<ReflectionPromptProps> = ({
  onPromptSelect,
  selectedPrompt,
}) => {
  const { colors, createThemedStyles } = useTheme();
  const [currentPrompt, setCurrentPrompt] = React.useState(
    () => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]
  );

  const getNewPrompt = () => {
    let newPrompt = currentPrompt;
    while (newPrompt === currentPrompt) {
      newPrompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    }
    setCurrentPrompt(newPrompt);
  };

  const handlePromptClick = () => {
    onPromptSelect(currentPrompt);
  };

  const styles = createThemedStyles(colors => ({
    container: {
      backgroundColor: colors.background,
      padding: 16,
      marginHorizontal: -8,
      marginTop: -8,
      marginBottom: 8,
      borderWidth: 2,
      borderColor: selectedPrompt ? colors.primary : colors.border,
      borderRadius: 8,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    promptContainer: {
      flex: 1,
    },
    promptText: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
      lineHeight: getResponsiveSize(22),
    },
    refreshButton: {
      padding: 4,
    },
    tapHint: {
      fontSize: 12,
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    selectedTapHint: {
      color: colors.primary,
      fontFamily: 'MonaSans-Medium',
    },
  }));

  return (
    <View style={[styles.container]}>
      <Text style={[styles.tapHint, selectedPrompt && styles.selectedTapHint]}>
        {selectedPrompt ? 'Selected ✓ - Type your answer below' : 'Tap prompt to select'}
      </Text>
      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.promptContainer}
          onPress={handlePromptClick}
          activeOpacity={0.7}>
          <Text style={[styles.promptText]}>
            {currentPrompt}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={e => {
            e.stopPropagation();
            getNewPrompt();
          }}
          style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};


