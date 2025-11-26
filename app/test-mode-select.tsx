import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { storage } from '@/utils/storage';
import { testLogic } from '@/utils/testLogic';
import { colors } from '@/utils/colors';
import { AppState } from '@/types';

export default function TestModeSelectScreen() {
  const router = useRouter();
  const [appState, setAppState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [wordStats, setWordStats] = useState({
    white: 0,
    green: 0,
    red: 0,
    total: 0,
  });

  const loadData = useCallback(async () => {
    try {
      const state = await storage.getAppState();
      setAppState(state);

      if (!state.currentFolderId) {
        Alert.alert(
          state.language === 'zh' ? '错误' : 'Error',
          state.language === 'zh'
            ? '请选择一个文件夹'
            : 'Please select a folder'
        );
        router.back();
        return;
      }

      const allWords = await storage.getWords();
      const folderWords = allWords.filter(w => w.folderId === state.currentFolderId);

      if (folderWords.length === 0) {
        Alert.alert(
          state.language === 'zh' ? '提示' : 'Notice',
          state.language === 'zh'
            ? '没有单词可以测试'
            : 'No words to test'
        );
        router.back();
        return;
      }

      const categorized = testLogic.categorizeWords(folderWords);
      setWordStats({
        white: categorized.white.length,
        green: categorized.green.length,
        red: categorized.red.length,
        total: folderWords.length,
      });
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStartTest = async (mode: 'normal' | 'unseen' | 'learned') => {
    if (!appState?.currentFolderId) return;

    try {
      setLoading(true);

      const allWords = await storage.getWords();
      const folderWords = allWords.filter(w => w.folderId === appState.currentFolderId);

      const selectedWords = testLogic.createTestSession(
        folderWords,
        appState.currentFolderId,
        mode
      );

      if (selectedWords.length === 0) {
        Alert.alert(
          appState.language === 'zh' ? '提示' : 'Notice',
          appState.language === 'zh'
            ? `${mode === 'unseen' ? '没有新词汇' : mode === 'learned' ? '没有已学会的词汇' : '没有单词'}`
            : `No ${mode === 'unseen' ? 'unseen' : mode === 'learned' ? 'learned' : ''} words`
        );
        setLoading(false);
        return;
      }

      // Navigate to test screen with selected words
      router.push({
        pathname: '/test-word',
        params: {
          mode,
          words: JSON.stringify(selectedWords),
        },
      });
    } catch (error) {
      console.error('Error starting test:', error);
      Alert.alert('Error', 'Failed to start test');
      setLoading(false);
    }
  };

  if (loading || !appState) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.buttonPrimary} />
      </View>
    );
  }

  const getModeTitle = (mode: string): string => {
    if (appState.language === 'zh') {
      switch (mode) {
        case 'normal':
          return '正常模式';
        case 'unseen':
          return '未测试的词';
        case 'learned':
          return '已学会的词';
        default:
          return '';
      }
    } else {
      switch (mode) {
        case 'normal':
          return 'Normal Mode';
        case 'unseen':
          return 'Untested Words';
        case 'learned':
          return 'Learned Words';
        default:
          return '';
      }
    }
  };

  const getModeDescription = (mode: string): string => {
    if (appState.language === 'zh') {
      switch (mode) {
        case 'normal':
          return `所有准备好测试的词 (${wordStats.total})`;
        case 'unseen':
          return `白色词汇 (${wordStats.white})`;
        case 'learned':
          return `绿色词汇 (${wordStats.green})`;
        default:
          return '';
      }
    } else {
      switch (mode) {
        case 'normal':
          return `All ready to test words (${wordStats.total})`;
        case 'unseen':
          return `White words only (${wordStats.white})`;
        case 'learned':
          return `Green words only (${wordStats.green})`;
        default:
          return '';
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← {appState.language === 'zh' ? '返回' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {appState.language === 'zh' ? '选择模式' : 'Select Mode'}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <Text style={styles.statsTitle}>
          {appState.language === 'zh' ? '词汇统计' : 'Word Statistics'}
        </Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>
              {appState.language === 'zh' ? '新词' : 'New'}
            </Text>
            <Text style={[styles.statValue, styles.whiteStat]}>{wordStats.white}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>
              {appState.language === 'zh' ? '错误' : 'Incorrect'}
            </Text>
            <Text style={[styles.statValue, styles.redStat]}>{wordStats.red}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>
              {appState.language === 'zh' ? '正确' : 'Correct'}
            </Text>
            <Text style={[styles.statValue, styles.greenStat]}>{wordStats.green}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>
              {appState.language === 'zh' ? '总计' : 'Total'}
            </Text>
            <Text style={styles.statValue}>{wordStats.total}</Text>
          </View>
        </View>
      </View>

      {/* Mode Selection */}
      <View style={styles.modesSection}>
        {/* Normal Mode */}
        <TouchableOpacity
          style={styles.modeCard}
          onPress={() => handleStartTest('normal')}
        >
          <Text style={styles.modeTitle}>{getModeTitle('normal')}</Text>
          <Text style={styles.modeDescription}>{getModeDescription('normal')}</Text>
        </TouchableOpacity>

        {/* Untested Mode */}
        <TouchableOpacity
          style={[styles.modeCard, wordStats.white === 0 && styles.modeCardDisabled]}
          onPress={() => wordStats.white > 0 && handleStartTest('unseen')}
        >
          <Text style={styles.modeTitle}>{getModeTitle('unseen')}</Text>
          <Text style={styles.modeDescription}>{getModeDescription('unseen')}</Text>
        </TouchableOpacity>

        {/* Learned Mode */}
        <TouchableOpacity
          style={[styles.modeCard, wordStats.green === 0 && styles.modeCardDisabled]}
          onPress={() => wordStats.green > 0 && handleStartTest('learned')}
        >
          <Text style={styles.modeTitle}>{getModeTitle('learned')}</Text>
          <Text style={styles.modeDescription}>{getModeDescription('learned')}</Text>
        </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.header,
    borderBottomWidth: 1,
    borderBottomColor: colors.headerBorder,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    padding: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.buttonPrimary,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  statsSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  whiteStat: {
    color: colors.textTertiary,
  },
  redStat: {
    color: colors.error,
  },
  greenStat: {
    color: colors.success,
  },
  modesSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  modeCard: {
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeCardDisabled: {
    opacity: 0.5,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  modeDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
