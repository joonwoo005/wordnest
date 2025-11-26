export type WordStatus = 'white' | 'green' | 'red';

export interface EtymologyComponent {
  character: string;
  meaning: string;
  explanation: string;
}

export interface Etymology {
  components: EtymologyComponent[];
  fullMeaning: string;
}

export type PartOfSpeech = '动词' | '形容词' | '名词' | '量词' | '副词' | '代词' | '其他';

export interface Word {
  id: string;
  chinese: string;
  pinyin: string;
  english: string;
  status: WordStatus;
  practicedCount: number;
  lastResult: 'correct' | 'incorrect' | null;
  folderId: string;
  etymology?: Etymology;
  partOfSpeech?: PartOfSpeech;
  createdAt: number;
  updatedAt: number;
  // Spaced Repetition fields (optional for backward compatibility)
  srInterval?: number;
  srEaseFactor?: number;
  srDueDate?: number;
  srRepetitions?: number;
  srLastReviewed?: number;
}

export interface Folder {
  id: string;
  name: string;
  wordCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface TestSession {
  id: string;
  folderId: string;
  mode: 'normal' | 'unseen' | 'learned';
  words: Word[];
  currentIndex: number;
  correctCount: number;
  incorrectCount: number;
  incorrectWords: Word[];
  startTime: number;
}

export interface AppState {
  username: string;
  currentFolderId: string | null;
  folders: Folder[];
  words: Word[];
  soundMode: 'sound-only' | 'word+sound';
  language: 'zh' | 'en';
  sortType?: 'newest' | 'oldest' | 'status' | 'practiced';
  statusFilter?: 'all' | 'not-studied' | 'not-tested' | 'correct' | 'incorrect';
}
