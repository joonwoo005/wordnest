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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { storage } from '@/utils/storage';
import { colors } from '@/utils/colors';
import { t } from '@/utils/translations';
import { audioUtils } from '@/utils/audio';
import { detectPartOfSpeech } from '@/utils/posDetection';
import { Word, AppState, PartOfSpeech } from '@/types';
import { AlertDialog } from '@/components/AlertDialog';

export default function EditWordScreen() {
  const router = useRouter();
  const { wordId } = useLocalSearchParams<{ wordId: string }>();
  const [word, setWord] = useState<Word | null>(null);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [practiceCount, setPracticeCount] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const checkAnswerTimeoutRef = useRef<NodeJS.Timeout>();
  const [isEditing, setIsEditing] = useState(false);
  const [editChinese, setEditChinese] = useState('');
  const [editPinyin, setEditPinyin] = useState('');
  const [editEnglish, setEditEnglish] = useState('');
  const [editPartOfSpeech, setEditPartOfSpeech] = useState<PartOfSpeech | null>(null);
  const [generatingEditPOS, setGeneratingEditPOS] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const posDetectionTimeoutRef = useRef<NodeJS.Timeout>();

  const loadData = useCallback(async () => {
    try {
      const state = await storage.getAppState();
      setAppState(state);

      if (!wordId) return;

      const allWords = await storage.getWords();
      const foundWord = allWords.find(w => w.id === wordId);

      if (foundWord) {
        setWord(foundWord);
        setPracticeCount(foundWord.practicedCount);
        setEditChinese(foundWord.chinese);
        setEditPinyin(foundWord.pinyin);
        setEditEnglish(foundWord.english);
        setEditPartOfSpeech(foundWord.partOfSpeech || '');
      }
    } catch (error) {
      console.error('Error loading word:', error);
      Alert.alert('Error', 'Failed to load word');
    } finally {
      setLoading(false);
    }
  }, [wordId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const playSoundForCurrentWord = useCallback(async () => {
    try {
      if (word) {
        await audioUtils.speakChinese(word.chinese);
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, [word]);

  // Auto-play sound when word loads
  useEffect(() => {
    if (!loading && word) {
      const timer = setTimeout(() => {
        playSoundForCurrentWord();
      }, 300); // Small delay to ensure smooth loading
      return () => clearTimeout(timer);
    }
  }, [word, loading, playSoundForCurrentWord]);

  const handleInputChange = useCallback((text: string) => {
    setUserInput(text);
    setIsCorrect(null);

    // Clear previous timeout
    if (checkAnswerTimeoutRef.current) {
      clearTimeout(checkAnswerTimeoutRef.current);
    }

    // Set new timeout for 0.5s debounce
    checkAnswerTimeoutRef.current = setTimeout(() => {
      if (word && text.trim()) {
        // Check if answer is correct
        const correct = text === word.chinese;
        setIsCorrect(correct);

        if (correct) {
          // Auto-increment practice count and update word
          handleCorrectAnswer();
        }
      }
    }, 500);
  }, [word]);

  const handleCorrectAnswer = async () => {
    if (!word) return;

    try {
      const newPracticeCount = practiceCount + 1;
      setPracticeCount(newPracticeCount);
      setUserInput('');

      // Update word in storage
      await storage.updateWord(word.id, {
        practicedCount: newPracticeCount,
        lastResult: 'correct',
        updatedAt: Date.now(),
      });

      // Update local word state
      setWord({
        ...word,
        practicedCount: newPracticeCount,
        lastResult: 'correct',
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Error updating practice count:', error);
    }
  };

  const detectAndUpdatePOS = useCallback(async (chinese: string, english: string) => {
    if (!chinese.trim() || !english.trim()) return;

    // Clear previous timeout
    if (posDetectionTimeoutRef.current) clearTimeout(posDetectionTimeoutRef.current);

    // Detect POS with debounce (300ms delay)
    posDetectionTimeoutRef.current = setTimeout(async () => {
      try {
        setGeneratingEditPOS(true);
        const pos = await detectPartOfSpeech(chinese, english);
        setEditPartOfSpeech(pos);
      } catch (error) {
        console.error('POS detection failed:', error);
      } finally {
        setGeneratingEditPOS(false);
      }
    }, 300);
  }, []);

  const handleEditChineseChange = useCallback((text: string) => {
    setEditChinese(text);
    if (text.trim() && editEnglish.trim()) {
      detectAndUpdatePOS(text, editEnglish);
    }
  }, [editEnglish, detectAndUpdatePOS]);

  const handleEditEnglishChange = useCallback((text: string) => {
    setEditEnglish(text);
    if (editChinese.trim() && text.trim()) {
      detectAndUpdatePOS(editChinese, text);
    }
  }, [editChinese, detectAndUpdatePOS]);

  const handleSaveEdit = async () => {
    if (!editChinese.trim() || !editPinyin.trim() || !editEnglish.trim()) {
      const lang = appState?.language || 'en';
      Alert.alert(t('error', lang), t('fillAllFields', lang));
      return;
    }

    if (!wordId) return;

    try {
      setLoading(true);

      const updatedWord: Partial<Word> = {
        chinese: editChinese.trim(),
        pinyin: editPinyin.trim(),
        english: editEnglish.trim(),
        ...(editPartOfSpeech && { partOfSpeech: editPartOfSpeech }),
      };

      await storage.updateWord(wordId, updatedWord);

      const lang = appState?.language || 'en';
      Alert.alert(t('success', lang), t('wordUpdated', lang));
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating word:', error);
      const lang = appState?.language || 'en';
      Alert.alert(t('error', lang), t('failedUpdateWord', lang));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      setLoading(true);

      if (!wordId || !word) return;

      await storage.deleteWord(wordId);

      const allFolders = await storage.getFolders();
      const folderIndex = allFolders.findIndex(f => f.id === word.folderId);
      if (folderIndex !== -1) {
        allFolders[folderIndex].wordCount -= 1;
        allFolders[folderIndex].updatedAt = Date.now();
        await storage.saveFolders(allFolders);
      }

      setShowDeleteSuccess(true);
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error('Error deleting word:', error);
      const errorLang = appState?.language || 'en';
      Alert.alert(t('error', errorLang), t('failedDeleteWord', errorLang));
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (checkAnswerTimeoutRef.current) {
        clearTimeout(checkAnswerTimeoutRef.current);
      }
      if (posDetectionTimeoutRef.current) {
        clearTimeout(posDetectionTimeoutRef.current);
      }
    };
  }, []);

  if (loading || !word) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.buttonPrimary} />
      </SafeAreaView>
    );
  }

  if (isEditing) {
    // Edit Mode
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => setIsEditing(false)}>
            <Text style={styles.backButtonText}>{t('back', appState?.language || 'en')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('editWord', appState?.language || 'en')}</Text>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('chineseLabel', appState?.language || 'en')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('chinesePlaceholder', appState?.language || 'en')}
              placeholderTextColor={colors.textTertiary}
              value={editChinese}
              onChangeText={handleEditChineseChange}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('pinyinLabel', appState?.language || 'en')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('pinyinPlaceholder', appState?.language || 'en')}
              placeholderTextColor={colors.textTertiary}
              value={editPinyin}
              onChangeText={setEditPinyin}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('englishLabel', appState?.language || 'en')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('englishPlaceholder', appState?.language || 'en')}
              placeholderTextColor={colors.textTertiary}
              value={editEnglish}
              onChangeText={handleEditEnglishChange}
            />
          </View>

          {/* Part of Speech Section (Auto-detected) */}
          {(generatingEditPOS || editPartOfSpeech) && (
            <View style={styles.posSection}>
              <View style={styles.posLabelRow}>
                <Text style={styles.label}>Part of Speech</Text>
                {generatingEditPOS && <ActivityIndicator size="small" color={colors.buttonPrimary} />}
              </View>
              {editPartOfSpeech && (
                <View style={styles.posTag}>
                  <Text style={styles.posTagText}>{editPartOfSpeech}</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveEdit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>{t('save', appState?.language || 'en')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Practice Mode
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← {appState?.language === 'zh' ? '返回' : 'Back'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{appState?.language === 'zh' ? '练习' : 'Practice'}</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.practiceCounter}>
            <Text style={styles.practiceCountLabel}>{appState?.language === 'zh' ? '练习次数' : 'Count'}</Text>
            <Text style={styles.practiceCountValue}>{practiceCount}</Text>
          </View>
          <TouchableOpacity style={styles.headerActionButton} onPress={() => setIsEditing(true)}>
            <Text style={styles.headerEditButtonText}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton} onPress={handleDelete}>
            <Text style={styles.headerActionButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.practiceContent}>
        {/* Chinese Character Display */}
        <View style={styles.characterDisplayBox}>
          <TouchableOpacity style={styles.characterSoundButton} onPress={playSoundForCurrentWord}>
            <Text style={styles.characterSoundButtonText}>🔊</Text>
          </TouchableOpacity>
          <Text style={styles.characterDisplay}>{word.chinese}</Text>
          <View style={styles.characterInfoContainer}>
            <Text style={styles.characterPinyin}>{word.pinyin}</Text>
            <Text style={styles.characterDefinition}>{word.english.toLowerCase()}</Text>
          </View>
        </View>

        {/* Practice Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>
            {appState?.language === 'zh' ? '写出中文字符' : 'Write the Chinese characters'}
          </Text>
          <TextInput
            style={[
              styles.practiceInput,
              isCorrect === true && styles.practiceInputCorrect,
              isCorrect === false && styles.practiceInputIncorrect,
            ]}
            placeholder={appState?.language === 'zh' ? '使用手写输入' : 'Use handwriting input'}
            placeholderTextColor={colors.textTertiary}
            value={userInput}
            onChangeText={handleInputChange}
            autoFocus
          />
          {isCorrect !== null && (
            <Text style={isCorrect ? styles.correctLabel : styles.incorrectLabel}>
              {isCorrect
                ? (appState?.language === 'zh' ? '✓ 正确!' : '✓ Correct!')
                : (appState?.language === 'zh' ? '✗ 不正确' : '✗ Incorrect')}
            </Text>
          )}
        </View>


        {/* Etymology Section */}
        {word.etymology && (
          <View style={styles.etymologySection}>
            <Text style={styles.etymologyTitle}>{appState?.language === 'zh' ? '字符组成' : 'Character Components'}</Text>

            {word.etymology.components && (
              <View style={styles.componentsContainer}>
                {word.etymology.components.map((component, index) => (
                  <View key={index} style={styles.componentItem}>
                    <Text style={styles.componentCharacter}>{component.character}</Text>
                    <View style={styles.componentInfo}>
                      <Text style={styles.componentMeaning}>{component.meaning}</Text>
                      <Text style={styles.componentExplanation}>{component.explanation}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {word.etymology.fullMeaning && (
              <View style={styles.fullMeaningContainer}>
                <Text style={styles.fullMeaningLabel}>
                  {appState?.language === 'zh' ? '完整含义' : 'Full Meaning'}:
                </Text>
                <Text style={styles.fullMeaningText}>{word.etymology.fullMeaning}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Delete Confirmation Alert */}
      <AlertDialog
        visible={showDeleteConfirm}
        title={t('delete', appState?.language || 'en')}
        message={t('deleteConfirm', appState?.language || 'en')}
        cancelText={t('cancel', appState?.language || 'en')}
        confirmText={t('delete', appState?.language || 'en')}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        isDangerous={true}
      />

      {/* Delete Success Alert */}
      <AlertDialog
        visible={showDeleteSuccess}
        title={t('success', appState?.language || 'en')}
        message={t('wordDeleted', appState?.language || 'en')}
        confirmText="OK"
        onCancel={() => setShowDeleteSuccess(false)}
        onConfirm={() => setShowDeleteSuccess(false)}
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
  headerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  practiceCounter: {
    alignItems: 'center',
  },
  practiceCountLabel: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  practiceCountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.buttonPrimary,
  },
  headerActionButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  headerEditButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    transform: [{ scaleX: -1 }],
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  practiceContent: {
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
  characterDisplay: {
    fontSize: 72,
    fontWeight: '700',
    color: colors.buttonPrimary,
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
    marginTop: 16,
    alignItems: 'center',
    gap: 4,
  },
  characterPinyin: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  characterDefinition: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  definitionBox: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pinyin: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  definition: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.textPrimary,
  },
  posSection: {
    marginBottom: 24,
  },
  posLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  posTag: {
    backgroundColor: colors.buttonPrimary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  posTagText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 8,
  },
  practiceInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '500',
    color: colors.textPrimary,
    minHeight: 50,
  },
  practiceInputCorrect: {
    borderColor: colors.success,
    backgroundColor: `${colors.success}10`,
  },
  practiceInputIncorrect: {
    borderColor: colors.error,
    backgroundColor: `${colors.error}10`,
  },
  correctLabel: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
    marginTop: 6,
  },
  incorrectLabel: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
    marginTop: 6,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: colors.red,
    paddingVertical: 14,
    borderRadius: 10,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  etymologySection: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 24,
  },
  etymologyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  componentsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  componentItem: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  componentCharacter: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.buttonPrimary,
    minWidth: 30,
  },
  componentInfo: {
    flex: 1,
  },
  componentMeaning: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  componentExplanation: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  fullMeaningContainer: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 8,
    padding: 12,
  },
  fullMeaningLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  fullMeaningText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
});
