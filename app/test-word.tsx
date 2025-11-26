import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { storage } from '@/utils/storage';
import { testLogic } from '@/utils/testLogic';
import { colors } from '@/utils/colors';
import { audioUtils } from '@/utils/audio';
import { AlertDialog } from '@/components/AlertDialog';
import { Word, AppState } from '@/types';

export default function TestWordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: string; words: string }>();

  const [appState, setAppState] = useState<AppState | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showingAnswer, setShowingAnswer] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [incorrectWords, setIncorrectWords] = useState<Word[]>([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const checkAnswerTimeoutRef = useRef<NodeJS.Timeout>();

  const loadData = useCallback(async () => {
    try {
      const state = await storage.getAppState();
      setAppState(state);

      if (!params.words) {
        Alert.alert('Error', 'No words provided for test');
        router.back();
        return;
      }

      const parsedWords = JSON.parse(params.words);
      setWords(parsedWords);
    } catch (error) {
      console.error('Error loading test data:', error);
      Alert.alert('Error', 'Failed to load test');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [params.words, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle back gesture (iOS swipe back and Android back button)
  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        setShowExitConfirm(true);
        return true; // Prevent default back action
      });

      return () => backHandler.remove();
    }, [])
  );

  const playSoundForCurrentWord = useCallback(async () => {
    try {
      if (currentIndex < words.length) {
        const currentWord = words[currentIndex];
        await audioUtils.speakChinese(currentWord.chinese);
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, [currentIndex, words]);

  // Auto-play sound when word changes
  useEffect(() => {
    if (!loading && currentWord && !showingAnswer) {
      const timer = setTimeout(() => {
        playSoundForCurrentWord();
      }, 300); // Small delay to ensure smooth loading
      return () => clearTimeout(timer);
    }
  }, [currentWord, loading, showingAnswer, playSoundForCurrentWord]);

  const currentWord = words[currentIndex];

  const handleInputChange = useCallback((text: string) => {
    setUserInput(text);
    setIsCorrect(null);

    if (checkAnswerTimeoutRef.current) {
      clearTimeout(checkAnswerTimeoutRef.current);
    }

    checkAnswerTimeoutRef.current = setTimeout(async () => {
      if (currentWord && text.trim()) {
        const correct = text === currentWord.chinese;
        setIsCorrect(correct);

        // Auto-advance if correct
        if (correct) {
          try {
            // Update word status in storage
            const updatedWord = testLogic.updateWordStatus(currentWord, true);
            await storage.updateWord(currentWord.id, {
              status: updatedWord.status,
              practicedCount: updatedWord.practicedCount,
              lastResult: updatedWord.lastResult,
              updatedAt: updatedWord.updatedAt,
            });

            setCorrectCount((prev) => prev + 1);

            // Auto-complete if this is the last word
            if (currentIndex === words.length - 1) {
              setTimeout(() => {
                router.push({
                  pathname: '/test-completed',
                  params: {
                    correctCount: (correctCount + 1).toString(),
                    totalCount: words.length.toString(),
                    incorrectWords: JSON.stringify(incorrectWords),
                  },
                });
              }, 500);
            } else {
              // Move to next word after a delay
              setTimeout(() => {
                setCurrentIndex(currentIndex + 1);
                setUserInput('');
                setIsCorrect(null);
              }, 500);
            }
          } catch (error) {
            console.error('Error updating word status:', error);
          }
        }
      }
    }, 500);
  }, [currentWord, currentIndex, words.length, correctCount, incorrectWords, router]);

  const handleSkip = async () => {
    if (!currentWord) return;

    try {
      const updatedWord = testLogic.updateWordStatus(currentWord, false);
      await storage.updateWord(currentWord.id, {
        status: updatedWord.status,
        practicedCount: updatedWord.practicedCount,
        lastResult: updatedWord.lastResult,
        updatedAt: updatedWord.updatedAt,
      });

      const newIncorrectWords = [...incorrectWords, currentWord];
      const newIncorrectCount = incorrectCount + 1;

      setIncorrectCount(newIncorrectCount);
      setIncorrectWords(newIncorrectWords);
      setUserInput('');
      setIsCorrect(null);

      // Auto-complete if this is the last word
      if (currentIndex === words.length - 1) {
        setTimeout(() => {
          router.push({
            pathname: '/test-completed',
            params: {
              correctCount: correctCount.toString(),
              totalCount: words.length.toString(),
              incorrectWords: JSON.stringify(newIncorrectWords),
            },
          });
        }, 500);
      } else {
        setShowingAnswer(true);
      }
    } catch (error) {
      console.error('Error skipping word:', error);
    }
  };

  const handleReplaySound = async () => {
    await playSoundForCurrentWord();
  };

  const handleExitTestCancel = useCallback(() => {
    setShowExitConfirm(false);
  }, []);

  const handleExitTestConfirm = useCallback(() => {
    setShowExitConfirm(false);
    router.push('/test-mode-select');
  }, [router]);

  const handleCompleteTestCancel = useCallback(() => {
    setShowCompleteConfirm(false);
  }, []);

  const handleCompleteTestConfirm = useCallback(() => {
    setShowCompleteConfirm(false);
    router.push({
      pathname: '/test-completed',
      params: {
        correctCount: correctCount.toString(),
        totalCount: words.length.toString(),
        incorrectWords: JSON.stringify(incorrectWords),
      },
    });
  }, [correctCount, words.length, incorrectWords, router]);

  const handleSubmit = async () => {
    if (!userInput.trim()) {
      Alert.alert(
        appState?.language === 'zh' ? '提示' : 'Notice',
        appState?.language === 'zh' ? '请输入答案' : 'Please enter an answer'
      );
      return;
    }

    const correct = userInput === currentWord.chinese;

    if (!correct) {
      setIsCorrect(false);
      setShowingAnswer(true);
      return;
    }

    handleAnswer(true);
  };

  const handleAnswer = async (isCorrect: boolean) => {
    if (!currentWord) return;

    try {
      const updatedWord = testLogic.updateWordStatus(currentWord, isCorrect);
      await storage.updateWord(currentWord.id, {
        status: updatedWord.status,
        practicedCount: updatedWord.practicedCount,
        lastResult: updatedWord.lastResult,
        updatedAt: updatedWord.updatedAt,
      });

      const updatedWords = [...words];
      updatedWords[currentIndex] = updatedWord;
      setWords(updatedWords);

      if (isCorrect) {
        setCorrectCount(correctCount + 1);
      } else {
        setIncorrectCount(incorrectCount + 1);
        setIncorrectWords([...incorrectWords, currentWord]);
      }

      setUserInput('');
      setIsCorrect(null);
      setShowingAnswer(false);

      if (currentIndex < words.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        router.push({
          pathname: '/test-completed',
          params: {
            correctCount: (correctCount + (isCorrect ? 1 : 0)).toString(),
            totalCount: words.length.toString(),
            incorrectWords: JSON.stringify(
              isCorrect
                ? incorrectWords
                : [...incorrectWords, currentWord]
            ),
          },
        });
      }
    } catch (error) {
      console.error('Error processing answer:', error);
      Alert.alert('Error', 'Failed to process answer');
    }
  };

  const handleNext = async () => {
    await handleAnswer(false);
  };

  useEffect(() => {
    return () => {
      if (checkAnswerTimeoutRef.current) {
        clearTimeout(checkAnswerTimeoutRef.current);
      }
    };
  }, []);

  if (loading || !appState || words.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.buttonPrimary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setShowExitConfirm(true)}
        >
          <Text style={styles.backButtonText}>← {appState.language === 'zh' ? '返回' : 'Back'}</Text>
        </TouchableOpacity>

        <View style={styles.countersContainer}>
          <View style={styles.counterItem}>
            <Text style={styles.counterLabel}>
              {appState.language === 'zh' ? '正确' : 'Correct'}
            </Text>
            <Text style={[styles.counterValue, styles.correctValue]}>{correctCount}</Text>
          </View>
          <View style={styles.counterItem}>
            <Text style={styles.counterLabel}>
              {appState.language === 'zh' ? '错误' : 'Incorrect'}
            </Text>
            <Text style={[styles.counterValue, styles.incorrectValue]}>{incorrectCount}</Text>
          </View>
        </View>

        <View style={styles.spacer} />

        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {words.length}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Pinyin and Definition Display (Hidden Chinese) */}
        <View style={styles.characterDisplayBox}>
          <TouchableOpacity style={styles.characterSoundButton} onPress={handleReplaySound}>
            <Text style={styles.characterSoundButtonText}>🔊</Text>
          </TouchableOpacity>
          <View style={styles.characterInfoContainer}>
            <Text style={styles.characterPinyin}>{currentWord.pinyin}</Text>
            <Text style={styles.characterDefinition}>{currentWord.english.toLowerCase()}</Text>
            {currentWord.partOfSpeech && (
              <Text style={styles.characterPartOfSpeech}>{currentWord.partOfSpeech}</Text>
            )}
          </View>
        </View>

        {/* Skip Button */}
        {!showingAnswer && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>
              {appState.language === 'zh' ? '跳过单词' : 'Skip Word'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Test Input */}
        {!showingAnswer && (
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>
              {appState.language === 'zh' ? '写出中文字符' : 'Write the Chinese characters'}
            </Text>
            <TextInput
              style={[
                styles.testInput,
                isCorrect === true && styles.testInputCorrect,
                isCorrect === false && styles.testInputIncorrect,
              ]}
              placeholder={appState.language === 'zh' ? '使用手写输入' : 'Use handwriting input'}
              placeholderTextColor={colors.textTertiary}
              value={userInput}
              onChangeText={handleInputChange}
              autoFocus
            />
            {isCorrect !== null && (
              <Text style={isCorrect ? styles.correctLabel : styles.incorrectLabel}>
                {isCorrect
                  ? (appState.language === 'zh' ? '✓ 正确!' : '✓ Correct!')
                  : (appState.language === 'zh' ? '✗ 不正确' : '✗ Incorrect')}
              </Text>
            )}
          </View>
        )}

        {/* Complete Test Button */}
        <TouchableOpacity
          style={styles.completeTestButton}
          onPress={() => setShowCompleteConfirm(true)}
        >
          <Text style={styles.completeTestButtonText}>
            {appState?.language === 'zh' ? '完成测试' : 'Complete Test'}
          </Text>
        </TouchableOpacity>

        {/* Answer Display */}
        {showingAnswer && (
          <View style={styles.answerBox}>
            <Text style={styles.answerLabel}>
              {appState.language === 'zh' ? '正确答案' : 'Correct Answer'}
            </Text>
            <Text style={styles.answerChinese}>{currentWord.chinese}</Text>
            <Text style={styles.answerPinyin}>{currentWord.pinyin}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Button */}
      {showingAnswer && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentIndex === words.length - 1
                ? (appState.language === 'zh' ? '完成' : 'Complete')
                : (appState.language === 'zh' ? '下一个' : 'Next')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Exit Test Confirmation */}
      <AlertDialog
        visible={showExitConfirm}
        title={appState?.language === 'zh' ? '提示' : 'Notice'}
        message={appState?.language === 'zh' ? '确定要退出测试吗？' : 'Are you sure you want to exit the test?'}
        cancelText={appState?.language === 'zh' ? '继续' : 'Continue'}
        confirmText={appState?.language === 'zh' ? '退出' : 'Exit'}
        onCancel={handleExitTestCancel}
        onConfirm={handleExitTestConfirm}
      />

      {/* Complete Test Confirmation */}
      <AlertDialog
        visible={showCompleteConfirm}
        title={appState?.language === 'zh' ? '完成测试' : 'Complete Test'}
        message={appState?.language === 'zh' ? '确定要完成测试吗？所有更改都将被保存。' : 'Are you sure you want to complete the test? All changes will be saved.'}
        cancelText={appState?.language === 'zh' ? '继续测试' : 'Keep Testing'}
        confirmText={appState?.language === 'zh' ? '完成' : 'Complete'}
        onCancel={handleCompleteTestCancel}
        onConfirm={handleCompleteTestConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 12,
    color: colors.buttonPrimary,
    fontWeight: '500',
  },
  countersContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
  counterItem: {
    alignItems: 'center',
  },
  counterLabel: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  counterValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  correctValue: {
    color: colors.success,
  },
  incorrectValue: {
    color: colors.error,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  characterDisplayBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.buttonPrimary}15`,
    borderRadius: 12,
    paddingVertical: 40,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: `${colors.buttonPrimary}30`,
    position: 'relative',
  },
  characterSoundButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterSoundButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    transform: [{ scaleX: -1 }],
  },
  characterInfoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  characterPinyin: {
    fontSize: 16,
    color: colors.green,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  characterDefinition: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  characterPartOfSpeech: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 12,
    fontWeight: '500',
  },
  testInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  testInputCorrect: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  testInputIncorrect: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  correctLabel: {
    fontSize: 12,
    color: colors.success,
    marginTop: 8,
    fontWeight: '600',
  },
  incorrectLabel: {
    fontSize: 12,
    color: colors.error,
    marginTop: 8,
    fontWeight: '600',
  },
  answerBox: {
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  answerLabel: {
    fontSize: 12,
    color: colors.success,
    marginBottom: 8,
  },
  answerChinese: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.success,
    marginBottom: 4,
  },
  answerPinyin: {
    fontSize: 14,
    color: colors.success,
  },
  completeTestButton: {
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  completeTestButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 14,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  nextButton: {
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
