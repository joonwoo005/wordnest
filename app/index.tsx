import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  PanResponder,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import NetInfo from '@react-native-community/netinfo';
import { Sidebar } from '@/components/Sidebar';
import { WordCard } from '@/components/WordCard';
import { AlertDialog } from '@/components/AlertDialog';
import { storage } from '@/utils/storage';
import { searchWords } from '@/utils/helpers';
import { audioUtils } from '@/utils/audio';
import { colors } from '@/utils/colors';
import { t } from '@/utils/translations';
import { AppState, Word, Folder } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const [appState, setAppState] = useState<AppState | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'not-studied' | 'not-tested' | 'correct' | 'incorrect'>('all');
  const [sortType, setSortType] = useState<'newest' | 'oldest' | 'status' | 'practiced'>('newest');
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [showSortDialog, setShowSortDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);

  // Setup pan responder for swipe gesture to open sidebar
  const panResponderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !sidebarVisible,
      onMoveShouldSetPanResponder: () => !sidebarVisible,
      onPanResponderRelease: (evt, gestureState) => {
        // Detect right swipe (positive dx = moving right)
        // Swipe distance threshold: 50 points
        // Vertical movement should be minimal (dy < 30)
        if (
          gestureState.dx > 50
          && Math.abs(gestureState.dy) < 30
          && !sidebarVisible
        ) {
          setSidebarVisible(true);
        }
      },
    })
  ).current;

  // Update pan responder when sidebar visibility changes
  useEffect(() => {
    panResponderRef.panHandlers.onStartShouldSetPanResponder = () => !sidebarVisible;
    panResponderRef.panHandlers.onMoveShouldSetPanResponder = () => !sidebarVisible;
  }, [sidebarVisible, panResponderRef]);

  useFocusEffect(
    useCallback(() => {
      loadData();

      // Reset edit mode when navigating away
      return () => {
        setEditMode(false);
        setSelectedWords(new Set());
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const state = await storage.getAppState();
      const allWords = await storage.getWords();
      const allFolders = await storage.getFolders();

      if (allFolders.length === 0) {
        router.replace('/onboarding');
        return;
      }

      // If no folder is selected, default to the first folder
      let updatedState = state;
      if (!state.currentFolderId) {
        updatedState = { ...state, currentFolderId: allFolders[0].id };
        await storage.saveAppState(updatedState);
      }

      setAppState(updatedState);
      setWords(allWords);
      setFolders(allFolders);

      // Load saved sort and filter preferences
      if (updatedState.sortType) {
        setSortType(updatedState.sortType);
      }
      if (updatedState.statusFilter) {
        setStatusFilter(updatedState.statusFilter);
      }

      await audioUtils.initializeAudio();
    } catch (error) {
      console.error('Error loading data:', error);
      const lang = (state?.language || 'en') as 'en' | 'zh';
      Alert.alert(t('error', lang), t('failedLoadData', lang));
    } finally {
      setLoading(false);
    }
  };

  const currentFolder = appState?.currentFolderId
    ? folders.find(f => f.id === appState.currentFolderId)
    : null;

  const currentFolderWords = appState?.currentFolderId
    ? words.filter(w => w.folderId === appState.currentFolderId)
    : words;

  const searchedWords = searchWords(currentFolderWords, searchQuery, appState?.language || 'en');

  const filteredWords = searchedWords.filter(word => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'not-studied') return word.practicedCount < 10;
    if (statusFilter === 'not-tested') return word.practicedCount >= 10 && word.lastResult === null;
    if (statusFilter === 'correct') return word.lastResult === 'correct';
    if (statusFilter === 'incorrect') return word.lastResult === 'incorrect';
    return true;
  });

  const sortWords = (wordsToSort: Word[]): Word[] => {
    const sorted = [...wordsToSort];
    switch (sortType) {
      case 'newest':
        return sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      case 'oldest':
        return sorted.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      case 'status':
        const statusOrder = { white: 0, red: 1, green: 2 };
        return sorted.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
      case 'practiced':
        return sorted.sort((a, b) => (b.practicedCount || 0) - (a.practicedCount || 0));
      default:
        return sorted;
    }
  };

  const sortedWords = sortWords(filteredWords);

  const handleNewFolder = async (folderName: string) => {
    if (!appState) return;

    const newFolder: Folder = {
      id: Date.now().toString(),
      name: folderName,
      wordCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedFolders = [...folders, newFolder];
    await storage.saveFolders(updatedFolders);
    setFolders(updatedFolders);
  };

  const handleFolderSelect = async (folderId: string) => {
    if (!appState) return;

    const updatedState = { ...appState, currentFolderId: folderId };
    await storage.saveAppState(updatedState);
    setAppState(updatedState);
    setSidebarVisible(false);
  };

  const handleDeleteFolders = async (folderIds: string[]) => {
    try {
      const allFolders = await storage.getFolders();
      const allWords = await storage.getWords();

      // Filter out deleted folders
      const updatedFolders = allFolders.filter(f => !folderIds.includes(f.id));

      // Delete words in deleted folders
      const updatedWords = allWords.filter(w => !folderIds.includes(w.folderId));

      // Save updated data
      await storage.saveFolders(updatedFolders);
      await storage.saveWords(updatedWords);

      // Update state
      setFolders(updatedFolders);
      setWords(updatedWords);

      // If currently selected folder was deleted, switch to first folder
      if (folderIds.includes(appState?.currentFolderId || '')) {
        const newState = {
          ...appState!,
          currentFolderId: updatedFolders.length > 0 ? updatedFolders[0].id : null,
        };
        await storage.saveAppState(newState);
        setAppState(newState);
      }
    } catch (error) {
      console.error('Error deleting folders:', error);
      throw error;
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      const allFolders = await storage.getFolders();
      const folderIndex = allFolders.findIndex(f => f.id === folderId);

      if (folderIndex === -1) {
        throw new Error('Folder not found');
      }

      // Update folder name and timestamp
      allFolders[folderIndex] = {
        ...allFolders[folderIndex],
        name: newName.trim(),
        updatedAt: Date.now(),
      };

      // Save updated folders
      await storage.saveFolders(allFolders);

      // Update state
      setFolders(allFolders);
    } catch (error) {
      console.error('Error renaming folder:', error);
      throw error;
    }
  };

  const handleExportFolders = async (folderIds: string[]) => {
    try {
      console.log('[Export] Starting export for folders:', folderIds);

      const allWords = await storage.getWords();
      const allFolders = await storage.getFolders();
      const folderMap = new Map(allFolders.map(f => [f.id, f.name]));

      const folderWords = allWords.filter(w => folderIds.includes(w.folderId));
      console.log('[Export] Found words:', folderWords.length);

      if (folderWords.length === 0) {
        console.log('[Export] No words to export');
        Alert.alert('Notice', 'No words to export');
        return;
      }

      // Generate CSV content with headers
      console.log('[Export] Generating CSV content...');
      const csvHeader = 'Word,Pinyin,Translation,Part of Speech,Category';
      const csvDataRows = folderWords
        .map(word => {
          const folderName = folderMap.get(word.folderId) || '';
          const partOfSpeech = word.partOfSpeech || '';
          const escapedChinese = `"${word.chinese.replace(/"/g, '""')}"`;
          const escapedPinyin = `"${word.pinyin.replace(/"/g, '""')}"`;
          const escapedEnglish = `"${word.english.replace(/"/g, '""')}"`;
          const escapedPartOfSpeech = `"${partOfSpeech.replace(/"/g, '""')}"`;
          const escapedFolder = `"${folderName.replace(/"/g, '""')}"`;
          return `${escapedChinese},${escapedPinyin},${escapedEnglish},${escapedPartOfSpeech},${escapedFolder}`;
        });
      const csvRows = [csvHeader, ...csvDataRows].join('\n');

      console.log('[Export] CSV content length:', csvRows.length, 'bytes');

      // Create file with timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, -5);
      const fileName = `words_export_${timestamp}.csv`;
      // Use cacheDirectory which is more reliable for iOS sharing
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const filePath = `${baseDir}${fileName}`;
      console.log('[Export] File path:', filePath);
      console.log('[Export] Base directory:', baseDir);

      // Write CSV file
      console.log('[Export] Writing file...');
      await FileSystem.writeAsStringAsync(filePath, csvRows);
      console.log('[Export] File written successfully');

      // Verify file exists
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      console.log('[Export] File info:', fileInfo);

      // Share the file
      console.log('[Export] Opening share dialog...');
      // Ensure file URI has file:// protocol for iOS
      const fileUri = filePath.startsWith('file://') ? filePath : `file://${filePath}`;
      console.log('[Export] File URI:', fileUri);
      const result = await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Words',
        UTType: 'public.comma-separated-values-text',
      });
      console.log('[Export] Share result:', result);

      // Note: Skipping cleanup - keeping file for now to debug
      // setTimeout(async () => {
      //   try {
      //     console.log('[Export] Cleaning up file...');
      //     await FileSystem.deleteAsync(filePath, { idempotent: true });
      //     console.log('[Export] File cleaned up');
      //   } catch (error) {
      //     console.error('[Export] Error cleaning up file:', error);
      //   }
      // }, 500);

      // Announce completion and return result
      console.log('[Export] Export complete');
      await audioUtils.speakChinese('导出完成');
      return result;
    } catch (error) {
      console.error('[Export] Error exporting folders:', error);
      console.error('[Export] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  };

  const toggleWordSelection = (wordId: string) => {
    const newSelected = new Set(selectedWords);
    if (newSelected.has(wordId)) {
      newSelected.delete(wordId);
    } else {
      newSelected.add(wordId);
    }
    setSelectedWords(newSelected);
  };

  const handleEditModeToggle = () => {
    if (editMode) {
      setSelectedWords(new Set());
    }
    setEditMode(!editMode);
  };

  const handleDeleteSelectedWords = () => {
    if (selectedWords.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      const allWords = await storage.getWords();
      const updatedWords = allWords.filter(w => !selectedWords.has(w.id));
      await storage.saveWords(updatedWords);
      setWords(updatedWords);
      setSelectedWords(new Set());
      setEditMode(false);
    } catch (error) {
      console.error('Error deleting words:', error);
      Alert.alert('Error', 'Failed to delete words');
    }
  };

  const handleClearAll = () => {
    setShowClearAllConfirm(true);
  };

  const handleConfirmClearAll = async () => {
    setShowClearAllConfirm(false);
    try {
      const allWords = await storage.getWords();
      const updatedWords = allWords.filter(w => w.folderId !== appState?.currentFolderId);
      await storage.saveWords(updatedWords);
      setWords(updatedWords);
      setEditMode(false);
    } catch (error) {
      console.error('Error clearing all words:', error);
      Alert.alert('Error', 'Failed to clear all words');
    }
  };

  const handleAddWord = async () => {
    if (!appState?.currentFolderId) {
      Alert.alert('Notice', t('selectFolder', appState?.language || 'en'));
      return;
    }

    // Check internet connectivity
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert(
        t('noInternet', appState?.language || 'en'),
        t('noInternetMessage', appState?.language || 'en')
      );
      return;
    }

    router.push('/add-word');
  };

  const handleStartTest = async () => {
    if (sortedWords.length === 0) {
      Alert.alert('Notice', t('noWordsToTest', appState?.language || 'en'));
      return;
    }

    router.push('/test-mode-select');
  };

  const handleWordPress = (word: Word) => {
    router.push({
      pathname: '/edit-word',
      params: { wordId: word.id },
    });
  };

  const toggleLanguage = async () => {
    if (!appState) return;

    const newLanguage = appState.language === 'en' ? 'zh' : 'en';
    const updatedState = { ...appState, language: newLanguage };
    await storage.saveAppState(updatedState);
    setAppState(updatedState);
  };

  const saveSortPreference = async (newSortType: typeof sortType) => {
    setSortType(newSortType);
    if (appState) {
      const updatedState = { ...appState, sortType: newSortType };
      await storage.saveAppState(updatedState);
      setAppState(updatedState);
    }
  };

  const saveFilterPreference = async (newStatusFilter: typeof statusFilter) => {
    setStatusFilter(newStatusFilter);
    if (appState) {
      const updatedState = { ...appState, statusFilter: newStatusFilter };
      await storage.saveAppState(updatedState);
      setAppState(updatedState);
    }
  };

  const handleShowSortOptions = () => {
    setShowSortDialog(true);
  };

  const handleShowStatusOptions = () => {
    setShowFilterDialog(true);
  };

  if (loading || !appState) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.buttonPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (folders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateTitle}>No Folders</Text>
          <Text style={styles.emptyStateMessage}>Create a folder to get started</Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => setSidebarVisible(true)}
          >
            <Text style={styles.emptyStateButtonText}>Create Folder</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView
        style={styles.container}
        {...panResponderRef.panHandlers}
      >
      {/* Top Bar - Word Count + Controls */}
      <View style={styles.topBar}>
        <View style={styles.wordCountSection}>
          <Text style={styles.wordCount}>{sortedWords.length} {t('wordCount', appState.language)}</Text>
        </View>

        {currentFolder && (
          <Text style={styles.folderName}>{currentFolder.name}</Text>
        )}

        <View style={styles.controlsSection}>
          <TouchableOpacity style={styles.langButton} onPress={toggleLanguage}>
            <Text style={styles.langButtonText}>{appState.language === 'en' ? 'EN' : 'ZH'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar with Menu Button */}
      <View style={styles.searchSection}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setSidebarVisible(true)}
        >
          <Text style={styles.menuButtonText}>☰</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder={t('searchPlaceholder', appState.language)}
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterSection}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={handleShowSortOptions}
        >
          <Text style={styles.sortButtonText}>{t('sortButton', appState.language)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statusButton}
          onPress={handleShowStatusOptions}
        >
          <Text style={styles.statusButtonText}>{t('filterStatus', appState.language)}</Text>
        </TouchableOpacity>

        {editMode && (
          <>
            <TouchableOpacity
              style={[
                styles.deleteWordsButton,
                selectedWords.size === 0 && styles.deleteWordsButtonDisabled,
              ]}
              onPress={handleDeleteSelectedWords}
              disabled={selectedWords.size === 0}
            >
              <Text style={styles.deleteWordsButtonText}>
                {appState?.language === 'zh' ? '删除' : 'Delete'} ({selectedWords.size})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterClear} onPress={handleClearAll}>
              <Text style={styles.filterClearText}>{t('clearAll', appState.language)}</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.selectButtonWrapper}>
          <TouchableOpacity
            style={[styles.selectButton, editMode && styles.selectButtonActive]}
            onPress={handleEditModeToggle}
          >
            <Text style={styles.selectButtonText}>⋯</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Word List with Add Button as Header */}
      <FlatList
        data={sortedWords}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.wordItemContainer}>
            {editMode && (
              <View style={styles.wordCheckbox}>
                {selectedWords.has(item.id) ? (
                  <View style={styles.checkboxChecked}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                ) : (
                  <View style={styles.checkboxEmpty} />
                )}
              </View>
            )}
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => {
                if (editMode) {
                  toggleWordSelection(item.id);
                } else {
                  handleWordPress(item);
                }
              }}
              activeOpacity={0.7}
            >
              <WordCard
                word={item}
                language={appState.language}
                onPress={() => {
                  if (editMode) {
                    toggleWordSelection(item.id);
                  } else {
                    handleWordPress(item);
                  }
                }}
              />
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          currentFolder ? (
            <TouchableOpacity style={styles.addWordButton} onPress={handleAddWord}>
              <Text style={styles.addWordButtonText}>{t('addNewWord', appState.language)}</Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('noWords', appState.language)}</Text>
          </View>
        }
      />

      {/* Test Button */}
      {currentFolder && (
        <View style={styles.testButtonContainer}>
          <TouchableOpacity style={styles.testButton} onPress={handleStartTest}>
            <Text style={styles.testButtonText}>{t('testButton', appState.language)} ({sortedWords.length})</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Delete Confirmation Alert */}
      <AlertDialog
        visible={showDeleteConfirm}
        title={appState?.language === 'zh' ? '删除' : 'Delete'}
        message={appState?.language === 'zh'
          ? `确定要删除 ${selectedWords.size} 个单词吗？`
          : `Delete ${selectedWords.size} word${selectedWords.size > 1 ? 's' : ''}?`
        }
        cancelText={appState?.language === 'zh' ? '取消' : 'Cancel'}
        confirmText={appState?.language === 'zh' ? '删除' : 'Delete'}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        isDangerous={true}
      />

      {/* Clear All Confirmation Alert */}
      <AlertDialog
        visible={showClearAllConfirm}
        title={appState?.language === 'zh' ? '清空' : 'Clear All'}
        message={appState?.language === 'zh'
          ? `确定要删除文件夹中的所有单词吗？`
          : `Delete all words in this folder?`
        }
        cancelText={appState?.language === 'zh' ? '取消' : 'Cancel'}
        confirmText={appState?.language === 'zh' ? '清空' : 'Clear'}
        onCancel={() => setShowClearAllConfirm(false)}
        onConfirm={handleConfirmClearAll}
        isDangerous={true}
      />

      {/* Sort Options Dialog */}
      <AlertDialog
        visible={showSortDialog}
        title={t('sortButton', appState?.language || 'en')}
        message=""
        customButtons={[
          {
            text: `${t('sortNewest', appState?.language || 'en')} ${sortType === 'newest' ? '✓' : ''}`,
            onPress: () => {
              saveSortPreference('newest');
              setShowSortDialog(false);
            },
          },
          {
            text: `${t('sortOldest', appState?.language || 'en')} ${sortType === 'oldest' ? '✓' : ''}`,
            onPress: () => {
              saveSortPreference('oldest');
              setShowSortDialog(false);
            },
          },
          {
            text: `${t('sortStatus', appState?.language || 'en')} ${sortType === 'status' ? '✓' : ''}`,
            onPress: () => {
              saveSortPreference('status');
              setShowSortDialog(false);
            },
          },
          {
            text: `${t('sortPracticed', appState?.language || 'en')} ${sortType === 'practiced' ? '✓' : ''}`,
            onPress: () => {
              saveSortPreference('practiced');
              setShowSortDialog(false);
            },
          },
        ]}
        onCancel={() => setShowSortDialog(false)}
      />

      {/* Filter Options Dialog */}
      <AlertDialog
        visible={showFilterDialog}
        title={t('filterStatus', appState?.language || 'en')}
        message=""
        customButtons={[
          {
            text: `${t('filterAll', appState?.language || 'en')} ${statusFilter === 'all' ? '✓' : ''}`,
            onPress: () => {
              saveFilterPreference('all');
              setShowFilterDialog(false);
            },
          },
          {
            text: `${t('filterNotStudied', appState?.language || 'en')} ${statusFilter === 'not-studied' ? '✓' : ''}`,
            onPress: () => {
              saveFilterPreference('not-studied');
              setShowFilterDialog(false);
            },
          },
          {
            text: `${t('filterNotTested', appState?.language || 'en')} ${statusFilter === 'not-tested' ? '✓' : ''}`,
            onPress: () => {
              saveFilterPreference('not-tested');
              setShowFilterDialog(false);
            },
          },
          {
            text: `${t('filterCorrect', appState?.language || 'en')} ${statusFilter === 'correct' ? '✓' : ''}`,
            onPress: () => {
              saveFilterPreference('correct');
              setShowFilterDialog(false);
            },
          },
          {
            text: `${t('filterIncorrect', appState?.language || 'en')} ${statusFilter === 'incorrect' ? '✓' : ''}`,
            onPress: () => {
              saveFilterPreference('incorrect');
              setShowFilterDialog(false);
            },
          },
        ]}
        onCancel={() => setShowFilterDialog(false)}
      />
      </SafeAreaView>

      {/* Sidebar - Rendered at root level so Modal appears on top */}
      <Sidebar
        visible={sidebarVisible}
        username={appState.username}
        folders={folders}
        currentFolderId={appState.currentFolderId}
        onFolderSelect={handleFolderSelect}
        onNewFolder={handleNewFolder}
        onDeleteFolders={handleDeleteFolders}
        onExportFolders={handleExportFolders}
        onRenameFolder={handleRenameFolder}
        onClose={() => setSidebarVisible(false)}
        totalWords={words.length}
        language={appState.language}
      />
    </View>
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
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  wordCountSection: {
    flex: 1,
  },
  wordCount: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  controlsSection: {
    flex: 2.5,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  langButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langButtonText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  folderName: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '700',
    maxWidth: 120,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  menuButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 20,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    fontSize: 13,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sortButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.buttonPrimary,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.buttonPrimary,
  },
  sortButtonText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  statusButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusButtonText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.buttonPrimary,
    borderColor: colors.buttonPrimary,
  },
  filterButtonText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.textPrimary,
  },
  selectButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectButtonActive: {
    backgroundColor: colors.buttonPrimary,
    borderColor: colors.buttonPrimary,
  },
  selectButtonText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  selectButtonWrapper: {
    marginLeft: 'auto',
  },
  filterClear: {
    marginRight: 5,
  },
  filterClearText: {
    fontSize: 11,
    color: colors.red,
    fontWeight: '500',
  },
  deleteButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  deleteWordsButton: {
    backgroundColor: colors.error,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  deleteWordsButtonHidden: {
    opacity: 0,
  },
  deleteWordsButtonDisabled: {
    opacity: 0.5,
  },
  deleteWordsButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  wordItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  wordCheckbox: {
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  checkboxChecked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  addWordButton: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addWordButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  testButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  testButton: {
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 16,
    borderRadius: 8,
  },
  testButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
