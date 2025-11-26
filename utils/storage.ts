import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Word, Folder } from '@/types';
import { migrateLegacyWords } from '@/utils/spacedRepetition';

const STORAGE_KEYS = {
  APP_STATE: 'app_state',
  WORDS: 'words',
  FOLDERS: 'folders',
};

const DEFAULT_APP_STATE: AppState = {
  username: 'User',
  currentFolderId: null,
  folders: [],
  words: [],
  soundMode: 'word+sound',
  language: 'en',
};

export const storage = {
  async getAppState(): Promise<AppState> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.APP_STATE);
      return data ? JSON.parse(data) : DEFAULT_APP_STATE;
    } catch (error) {
      console.error('Error reading app state:', error);
      return DEFAULT_APP_STATE;
    }
  },

  async saveAppState(state: AppState): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving app state:', error);
    }
  },

  async getWords(): Promise<Word[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.WORDS);
      const words = data ? JSON.parse(data) : [];
      // Auto-migrate legacy words with SR fields
      return migrateLegacyWords(words);
    } catch (error) {
      console.error('Error reading words:', error);
      return [];
    }
  },

  async saveWords(words: Word[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(words));
    } catch (error) {
      console.error('Error saving words:', error);
    }
  },

  async addWord(word: Word): Promise<Word[]> {
    const { initializeSRFields } = await import('@/utils/spacedRepetition');
    const words = await this.getWords();
    // Initialize SR fields for new word
    const wordWithSR = initializeSRFields(word);
    words.push(wordWithSR);
    await this.saveWords(words);
    return words;
  },

  async updateWord(wordId: string, updates: Partial<Word>): Promise<Word[]> {
    const words = await this.getWords();
    const index = words.findIndex(w => w.id === wordId);
    if (index !== -1) {
      words[index] = { ...words[index], ...updates, updatedAt: Date.now() };
      await this.saveWords(words);
    }
    return words;
  },

  async deleteWord(wordId: string): Promise<Word[]> {
    const words = await this.getWords();
    const filtered = words.filter(w => w.id !== wordId);
    await this.saveWords(filtered);
    return filtered;
  },

  async getFolders(): Promise<Folder[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FOLDERS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading folders:', error);
      return [];
    }
  },

  async saveFolders(folders: Folder[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
    } catch (error) {
      console.error('Error saving folders:', error);
    }
  },

  async addFolder(folder: Folder): Promise<Folder[]> {
    const folders = await this.getFolders();
    folders.push(folder);
    await this.saveFolders(folders);
    return folders;
  },

  async deleteFolder(folderId: string): Promise<void> {
    const folders = await this.getFolders();
    const filtered = folders.filter(f => f.id !== folderId);
    await this.saveFolders(filtered);

    // Also delete all words in this folder
    const words = await this.getWords();
    const remainingWords = words.filter(w => w.folderId !== folderId);
    await this.saveWords(remainingWords);
  },

  async getWordsByFolder(folderId: string): Promise<Word[]> {
    const words = await this.getWords();
    return words.filter(w => w.folderId === folderId);
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.APP_STATE,
        STORAGE_KEYS.WORDS,
        STORAGE_KEYS.FOLDERS,
      ]);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};
