import React from 'react';
import { Platform, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Word } from '@/types';
import { colors, statusBackgrounds } from '@/utils/colors';
import { Fonts } from '@/constants/theme';

interface WordCardProps {
  word: Word;
  onPress?: () => void;
  language: 'zh' | 'en';
  showPracticed?: boolean;
}

export const WordCard: React.FC<WordCardProps> = ({
  word,
  onPress,
  language,
  showPracticed = true,
}) => {
  const backgroundColor = statusBackgrounds[word.status] || statusBackgrounds.white;

  // Determine text color based on practice status
  let textColor = colors.textPrimary;
  if (word.practicedCount < 10) {
    // Not studied
    textColor = '#999999'; // gray
  } else if (word.practicedCount >= 10 && word.lastResult === null) {
    // Not tested
    textColor = colors.textPrimary; // white/primary
  } else if (word.status === 'green') {
    // Correct
    textColor = colors.success; // green
  } else if (word.status === 'red') {
    // Incorrect
    textColor = colors.error; // red
  }

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={[styles.chinese, { fontFamily: Platform.select({ web: Fonts?.chineseFont, default: undefined }), color: textColor }]}>
            {word.chinese}
          </Text>
          <Text style={styles.pinyin}>{word.pinyin}</Text>
          <Text style={styles.english}>{word.english.toLowerCase()}</Text>
        </View>
        <View style={styles.practiceCountBadge}>
          <Text style={[styles.practiceCountDot, { color: textColor }]}>●</Text>
          <Text style={[styles.practiceCount, { color: textColor }]}>{word.practicedCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  chinese: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  pinyin: {
    fontSize: 13,
    color: colors.green,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  english: {
    fontSize: 13,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  practiceCountBadge: {
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  practiceCountDot: {
    fontSize: 8,
    fontWeight: '600',
  },
  practiceCount: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
