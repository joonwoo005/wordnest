import React, { useState, useCallback, useRef } from 'react';
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
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { storage } from '@/utils/storage';
import { generateId } from '@/utils/helpers';
import { colors } from '@/utils/colors';
import { t } from '@/utils/translations';
import { translateWithDeepL } from '@/utils/deepl';
import { generateEtymology, Etymology } from '@/utils/etymology';
import { generatePinyin } from '@/utils/pinyin';
import { detectPartOfSpeech } from '@/utils/posDetection';
import { Word, AppState, PartOfSpeech } from '@/types';
import { AlertDialog } from '@/components/AlertDialog';

const MAX_CHINESE_CHARS = 10;

export default function AddWordScreen() {
  const router = useRouter();
  const [chinese, setChinese] = useState('');
  const [pinyin, setPinyin] = useState('');
  const [english, setEnglish] = useState('');
  const [loading, setLoading] = useState(false);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [translating, setTranslating] = useState(false);
  const [etymology, setEtymology] = useState<Etymology | null>(null);
  const [generatingEtymology, setGeneratingEtymology] = useState(false);
  const [generatingPinyin, setGeneratingPinyin] = useState(false);
  const [partOfSpeech, setPartOfSpeech] = useState<PartOfSpeech | null>(null);
  const [generatingPOS, setGeneratingPOS] = useState(false);
  const [errorDialogVisible, setErrorDialogVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const translationTimeoutRef = useRef<NodeJS.Timeout>();
  const etymologyTimeoutRef = useRef<NodeJS.Timeout>();
  const pinyinTimeoutRef = useRef<NodeJS.Timeout>();
  const posTimeoutRef = useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    loadAppState();
  }, []);

  const loadAppState = async () => {
    const state = await storage.getAppState();
    setAppState(state);
  };

  const handleChineseChange = useCallback((text: string, fromPaste: boolean = false) => {
    // Count Chinese characters (including CJK unified ideographs)
    const chineseCharCount = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;

    if (chineseCharCount > MAX_CHINESE_CHARS) {
      if (fromPaste) {
        setErrorMessage(`Text exceeds ${MAX_CHINESE_CHARS} character limit (${chineseCharCount} characters)`);
        setErrorDialogVisible(true);
      }
      return;
    }

    setChinese(text);

    // Clear previous timeouts
    if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);
    if (etymologyTimeoutRef.current) clearTimeout(etymologyTimeoutRef.current);
    if (pinyinTimeoutRef.current) clearTimeout(pinyinTimeoutRef.current);
    if (posTimeoutRef.current) clearTimeout(posTimeoutRef.current);

    // Generate pinyin with debounce (300ms delay)
    if (text.trim()) {
      pinyinTimeoutRef.current = setTimeout(async () => {
        try {
          setGeneratingPinyin(true);
          const pinyinResult = await generatePinyin(text);
          if (pinyinResult) {
            setPinyin(pinyinResult);
          }
        } catch (error) {
          console.error('Pinyin generation failed:', error);
        } finally {
          setGeneratingPinyin(false);
        }
      }, 300);

      // Translate with debounce (500ms delay)
      translationTimeoutRef.current = setTimeout(async () => {
        try {
          setTranslating(true);
          const translated = await translateWithDeepL(text, 'EN');
          setEnglish(translated);

          // Detect POS after translation is complete
          posTimeoutRef.current = setTimeout(async () => {
            try {
              setGeneratingPOS(true);
              const pos = await detectPartOfSpeech(text, translated);
              setPartOfSpeech(pos);
            } catch (error) {
              console.error('POS detection failed:', error);
            } finally {
              setGeneratingPOS(false);
            }
          }, 300); // Small delay after translation
        } catch (error) {
          console.error('Translation failed:', error);
        } finally {
          setTranslating(false);
        }
      }, 500);

      // Generate etymology only if text contains Chinese characters
      const hasChinese = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
      if (hasChinese) {
        // Generate etymology: immediately if pasted, after 1s idle if typed
        const generateEtymologyForText = async () => {
          try {
            setGeneratingEtymology(true);
            const etymologyData = await generateEtymology(text);
            setEtymology(etymologyData);
          } catch (error) {
            console.error('Etymology generation failed:', error);
          } finally {
            setGeneratingEtymology(false);
          }
        };

        if (fromPaste) {
          // Generate immediately for pasted text
          generateEtymologyForText();
        } else {
          // Generate after 1s of no changes for typed text
          etymologyTimeoutRef.current = setTimeout(generateEtymologyForText, 1000);
        }
      } else {
        setEtymology(null);
      }
    } else {
      setPinyin('');
      setEnglish('');
      setEtymology(null);
      setPartOfSpeech(null);
    }
  }, []);

  const handlePasteFromClipboard = useCallback(async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      handleChineseChange(text, true);
    }
  }, [handleChineseChange]);

  React.useEffect(() => {
    return () => {
      if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);
      if (etymologyTimeoutRef.current) clearTimeout(etymologyTimeoutRef.current);
      if (pinyinTimeoutRef.current) clearTimeout(pinyinTimeoutRef.current);
      if (posTimeoutRef.current) clearTimeout(posTimeoutRef.current);
    };
  }, []);

  const handleSave = async () => {
    if (!chinese.trim() || !pinyin.trim() || !english.trim()) {
      const lang = appState?.language || 'en';
      Alert.alert(t('error', lang), t('fillAllFields', lang));
      return;
    }

    if (!appState?.currentFolderId) {
      const lang = appState?.language || 'en';
      Alert.alert(t('error', lang), t('selectFolder', lang));
      return;
    }

    try {
      setLoading(true);

      const newWord: Word = {
        id: generateId(),
        chinese: chinese.trim(),
        pinyin: pinyin.trim(),
        english: english.trim(),
        status: 'white',
        practicedCount: 0,
        lastResult: null,
        folderId: appState.currentFolderId,
        ...(etymology && { etymology }),
        ...(partOfSpeech && { partOfSpeech }),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // storage.addWord will automatically initialize SR fields
      await storage.addWord(newWord);

      const allFolders = await storage.getFolders();
      const folderIndex = allFolders.findIndex(f => f.id === appState.currentFolderId);
      if (folderIndex !== -1) {
        allFolders[folderIndex].wordCount += 1;
        allFolders[folderIndex].updatedAt = Date.now();
        await storage.saveFolders(allFolders);
      }

      const lang = appState?.language || 'en';
      Alert.alert(t('success', lang), t('wordAdded', lang));
      router.back();
    } catch (error) {
      console.error('Error saving word:', error);
      const lang = appState?.language || 'en';
      Alert.alert(t('error', lang), t('failedSaveWord', lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{t('back', appState?.language || 'en')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('addWord', appState?.language || 'en')}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Chinese Input (Required) */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{t('chineseLabel', appState?.language || 'en')}</Text>
            <Text style={styles.requiredIndicator}>*</Text>
          </View>
          <View style={styles.inputWithButton}>
            <TextInput
              style={styles.inputFlex}
              placeholder={t('chinesePlaceholder', appState?.language || 'en')}
              placeholderTextColor={colors.textTertiary}
              value={chinese}
              onChangeText={handleChineseChange}
            />
            <TouchableOpacity style={styles.pasteButton} onPress={handlePasteFromClipboard}>
              <Text style={styles.pasteButtonText}>Paste</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pinyin (Auto-generated) */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{t('pinyinLabel', appState?.language || 'en')}</Text>
            {generatingPinyin && <ActivityIndicator size="small" color={colors.buttonPrimary} />}
          </View>
          <View style={[styles.displayField, !pinyin && styles.displayFieldEmpty]}>
            <Text style={[styles.displayFieldText, !pinyin && styles.displayFieldPlaceholder]}>
              {pinyin || t('pinyinPlaceholder', appState?.language || 'en')}
            </Text>
          </View>
        </View>

        {/* English Translation (Auto-generated) */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{t('englishLabel', appState?.language || 'en')}</Text>
            {translating && <ActivityIndicator size="small" color={colors.buttonPrimary} />}
          </View>
          <View style={[styles.displayField, !english && styles.displayFieldEmpty]}>
            <Text style={[styles.displayFieldText, !english && styles.displayFieldPlaceholder]}>
              {english || t('englishPlaceholder', appState?.language || 'en')}
            </Text>
          </View>
        </View>

        {/* Part of Speech Section (Auto-detected) */}
        {(generatingPOS || partOfSpeech) && (
          <View style={styles.posSection}>
            <View style={styles.posLabelRow}>
              <Text style={styles.label}>Part of Speech</Text>
              {generatingPOS && <ActivityIndicator size="small" color={colors.buttonPrimary} />}
            </View>
            {partOfSpeech && (
              <View style={styles.posTag}>
                <Text style={styles.posTagText}>{partOfSpeech}</Text>
              </View>
            )}
          </View>
        )}

        {/* Etymology Section */}
        {(generatingEtymology || etymology) && (
          <View style={styles.etymologySection}>
            <View style={styles.etymologyHeader}>
              <Text style={styles.etymologyTitle}>Character Components</Text>
              {generatingEtymology && <ActivityIndicator size="small" color={colors.buttonPrimary} />}
            </View>

            {etymology && etymology.components && (
              <View style={styles.componentsContainer}>
                {etymology.components.map((component, index) => (
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

            {etymology && etymology.fullMeaning && (
              <View style={styles.fullMeaningContainer}>
                <Text style={styles.fullMeaningLabel}>Full Meaning:</Text>
                <Text style={styles.fullMeaningText}>{etymology.fullMeaning}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{t('save', appState?.language || 'en')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <AlertDialog
        visible={errorDialogVisible}
        title="Input Too Long"
        message={errorMessage}
        confirmText="OK"
        onCancel={() => setErrorDialogVisible(false)}
        onConfirm={() => setErrorDialogVisible(false)}
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
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.buttonPrimary,
    fontWeight: '500',
  },
  title: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  requiredIndicator: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.red,
    marginLeft: 4,
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
  inputWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  inputFlex: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.textPrimary,
  },
  pasteButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 6,
    backgroundColor: colors.buttonPrimary,
    borderRadius: 6,
  },
  pasteButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  inputDisabled: {
    opacity: 0.7,
  },
  displayField: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  displayFieldEmpty: {
    opacity: 0.7,
  },
  displayFieldText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  displayFieldPlaceholder: {
    color: colors.textTertiary,
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
  etymologySection: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 24,
  },
  etymologyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  etymologyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
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
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
