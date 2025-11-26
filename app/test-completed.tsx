import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { storage } from '@/utils/storage';
import { WordCard } from '@/components/WordCard';
import { colors } from '@/utils/colors';
import { AppState, Word } from '@/types';

export default function TestCompletedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    correctCount: string;
    totalCount: string;
    incorrectWords: string;
  }>();

  const [appState, setAppState] = useState<AppState | null>(null);
  const [incorrectWords, setIncorrectWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const state = await storage.getAppState();
      setAppState(state);

      if (params.incorrectWords) {
        const parsed = JSON.parse(params.incorrectWords);
        // Reload words from storage to get the latest status
        const allWords = await storage.getWords();
        const incorrectWordIds = parsed.map((w: Word) => w.id);
        const reloadedIncorrectWords = allWords.filter(w => incorrectWordIds.includes(w.id));
        setIncorrectWords(reloadedIncorrectWords);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [params.incorrectWords]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !appState) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.buttonPrimary} />
      </SafeAreaView>
    );
  }

  const correctCount = parseInt(params.correctCount || '0', 10);
  const totalCount = parseInt(params.totalCount || '1', 10);
  const percentage = Math.round((correctCount / totalCount) * 100);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {appState.language === 'zh' ? '测试完成' : 'Test Completed'}
        </Text>
      </View>

      {/* Score Section */}
      <View style={styles.scoreSection}>
        <Text style={styles.scoreTitle}>
          {appState.language === 'zh' ? '你的得分' : 'Your Score'}
        </Text>

        <View style={styles.scoreBox}>
          <Text style={styles.scoreValue}>{correctCount}/{totalCount}</Text>
          <Text style={styles.percentageValue}>{percentage}%</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>
              {appState.language === 'zh' ? '正确' : 'Correct'}
            </Text>
            <Text style={[styles.statValue, styles.correctValue]}>{correctCount}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>
              {appState.language === 'zh' ? '错误' : 'Incorrect'}
            </Text>
            <Text style={[styles.statValue, styles.incorrectValue]}>
              {totalCount - correctCount}
            </Text>
          </View>
        </View>
      </View>

      {/* Incorrect Words Section */}
      {incorrectWords.length > 0 && (
        <View style={styles.incorrectSection}>
          <Text style={styles.incorrectTitle}>
            {appState.language === 'zh' ? '需要复习的词汇' : 'Words Needing Review'}
          </Text>

          <FlatList
            data={incorrectWords}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={({ item }) => (
              <WordCard
                word={item}
                language={appState.language}
                showPracticed={false}
              />
            )}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        </View>
      )}

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => {
            router.replace('/');
          }}
        >
          <Text style={styles.homeButtonText}>
            {appState.language === 'zh' ? '返回主页' : 'Back to Home'}
          </Text>
        </TouchableOpacity>
        {incorrectWords.length > 0 && (
          <TouchableOpacity
            style={styles.retestButton}
            onPress={() => {
              // Return to test mode selection with only incorrect words
              router.replace({
                pathname: '/test-mode-select',
              });
            }}
          >
            <Text style={styles.retestButtonText}>
              {appState.language === 'zh' ? '再测一遍' : 'Test Again'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.header,
    borderBottomWidth: 1,
    borderBottomColor: colors.headerBorder,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  scoreSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scoreTitle: {
    fontSize: 14,
    color: colors.textTertiary,
    marginBottom: 16,
    textAlign: 'center',
  },
  scoreBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.buttonPrimary,
    marginBottom: 4,
  },
  percentageValue: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  correctValue: {
    color: colors.success,
  },
  incorrectValue: {
    color: colors.error,
  },
  incorrectSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  incorrectTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  listContent: {
    paddingVertical: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  homeButton: {
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 14,
    borderRadius: 8,
  },
  homeButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  retestButton: {
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: 8,
  },
  retestButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
