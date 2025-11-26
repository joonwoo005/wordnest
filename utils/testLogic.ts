import { Word, WordStatus, TestSession } from '@/types';
import { calculateNextReview, prioritizeWords } from '@/utils/spacedRepetition';

export const testLogic = {
  // Categorize words by status
  categorizeWords(words: Word[]): {
    white: Word[];
    green: Word[];
    red: Word[];
  } {
    return {
      white: words.filter(w => w.status === 'white'),
      green: words.filter(w => w.status === 'green'),
      red: words.filter(w => w.status === 'red'),
    };
  },

  // Determine word status based on most recent answer
  determineStatus(practicedCount: number, lastResult: 'correct' | 'incorrect' | null): WordStatus {
    // Status is determined by the most recent answer
    if (lastResult === 'correct') {
      return 'green';
    }

    if (lastResult === 'incorrect') {
      return 'red';
    }

    // If no result yet (never answered or no response)
    return 'white';
  },

  // Create test session with word selection based on mode
  createTestSession(
    words: Word[],
    folderId: string,
    mode: 'normal' | 'unseen' | 'learned'
  ): Word[] {
    const categorized = this.categorizeWords(words);

    let selectedWords: Word[] = [];

    if (mode === 'normal') {
      const whitePool = categorized.white;
      const redPool = categorized.red;
      const greenPool = categorized.green;

      if (whitePool.length > 0) {
        // 50% white, 30% red, 20% green
        const totalWords = Math.min(10, whitePool.length + redPool.length + greenPool.length);
        const whiteCount = Math.ceil(totalWords * 0.5);
        const redCount = Math.ceil(totalWords * 0.3);
        const greenCount = totalWords - whiteCount - redCount;

        // Prioritize by SR due date, then shuffle within priority groups
        selectedWords = [
          ...this.shuffle(prioritizeWords(whitePool)).slice(0, whiteCount),
          ...this.shuffle(prioritizeWords(redPool)).slice(0, redCount),
          ...this.shuffle(prioritizeWords(greenPool)).slice(0, greenCount),
        ];
      } else if (redPool.length > 0) {
        // Fallback: 70% red, 30% green (when no white words available)
        const totalWords = Math.min(10, redPool.length + greenPool.length);
        const redCount = Math.ceil(totalWords * 0.7);
        const greenCount = totalWords - redCount;

        // Prioritize by SR due date
        selectedWords = [
          ...this.shuffle(prioritizeWords(redPool)).slice(0, redCount),
          ...this.shuffle(prioritizeWords(greenPool)).slice(0, greenCount),
        ];
      } else {
        // Final fallback: only green words available
        selectedWords = this.shuffle(prioritizeWords(greenPool)).slice(0, 10);
      }
    } else if (mode === 'unseen') {
      // Only white words (all equally new, maintain randomization)
      selectedWords = this.shuffle(categorized.white);
    } else if (mode === 'learned') {
      // Only green words, prioritized by due date
      selectedWords = prioritizeWords(categorized.green);
    }

    return this.shuffle(selectedWords);
  },

  // Shuffle array (Fisher-Yates algorithm)
  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  // Update word status based on answer
  updateWordStatus(word: Word, isCorrect: boolean): Word {
    const newWord = {
      ...word,
      practicedCount: isCorrect ? word.practicedCount + 1 : word.practicedCount,
      lastResult: isCorrect ? 'correct' : 'incorrect',
      updatedAt: Date.now(),
    };

    newWord.status = this.determineStatus(newWord.practicedCount, newWord.lastResult);

    // Calculate spaced repetition fields
    const wordWithSR = calculateNextReview(newWord, isCorrect);
    return wordWithSR;
  },

  // Calculate test score
  calculateScore(correctCount: number, totalCount: number): {
    score: number;
    percentage: number;
  } {
    const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    return {
      score: correctCount,
      percentage,
    };
  },
};
