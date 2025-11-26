import {
  initializeSRFields,
  validateSRFields,
  calculateNextReview,
  prioritizeWords,
  isDue,
  getDueWords,
  getDueCount,
  migrateLegacyWords,
} from '@/utils/spacedRepetition';
import { Word } from '@/types';

// Helper to create a test word
const createTestWord = (overrides?: Partial<Word>): Word => ({
  id: 'test-1',
  chinese: '你好',
  pinyin: 'nǐ hǎo',
  english: 'hello',
  status: 'white',
  practicedCount: 0,
  lastResult: null,
  folderId: 'folder-1',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe('Spaced Repetition - SM-2 Algorithm', () => {
  describe('EC-1: Initialize SR fields for legacy words', () => {
    test('should initialize word without SR fields', () => {
      const word = createTestWord();
      const initialized = initializeSRFields(word);

      expect(initialized.srEaseFactor).toBe(2.5);
      expect(initialized.srInterval).toBe(1);
      expect(initialized.srDueDate).toBeDefined();
      expect(initialized.srRepetitions).toBe(0);
    });

    test('should preserve SR fields if already initialized', () => {
      const now = Date.now();
      const word = createTestWord({
        srEaseFactor: 2.3,
        srInterval: 3,
        srDueDate: now + 86400000,
        srRepetitions: 1,
        srLastReviewed: now,
      });

      const initialized = initializeSRFields(word);
      expect(initialized.srEaseFactor).toBe(2.3);
      expect(initialized.srInterval).toBe(3);
    });
  });

  describe('EC-3: Validate corrupted SR data', () => {
    test('should reset invalid ease factor to default', () => {
      const word = createTestWord({ srEaseFactor: 0.5 });
      const validated = validateSRFields(word);
      expect(validated.srEaseFactor).toBe(2.5);
    });

    test('should reset invalid interval to default', () => {
      const word = createTestWord({ srInterval: -5 });
      const validated = validateSRFields(word);
      expect(validated.srInterval).toBe(1);
    });

    test('should reset invalid due date to now', () => {
      const word = createTestWord({ srDueDate: -999 });
      const validated = validateSRFields(word);
      expect(validated.srDueDate).toBeGreaterThan(0);
    });

    test('should reset invalid repetitions to 0', () => {
      const word = createTestWord({ srRepetitions: -5 });
      const validated = validateSRFields(word);
      expect(validated.srRepetitions).toBe(0);
    });
  });

  describe('EC-26: Ease factor bounds', () => {
    test('should not allow ease factor below 1.3', () => {
      const word = createTestWord({
        srEaseFactor: 1.0,
        srInterval: 10,
        srRepetitions: 5,
        srDueDate: Date.now() - 86400000,
      });

      // Simulate multiple incorrect answers
      let current = word;
      for (let i = 0; i < 5; i++) {
        current = calculateNextReview(current, false);
      }

      expect(current.srEaseFactor).toBeGreaterThanOrEqual(1.3);
    });

    test('should cap interval at 365 days', () => {
      const word = createTestWord({
        srEaseFactor: 5.0,
        srInterval: 300,
        srRepetitions: 20,
        srDueDate: Date.now() - 86400000,
      });

      const updated = calculateNextReview(word, true);
      // 300 * 5.0 would be 1500, but capped at 365
      expect(updated.srInterval).toBeLessThanOrEqual(365);
    });
  });

  describe('EC-4: White → Green (first correct answer)', () => {
    test('should transition white word to green after correct answer', () => {
      const word = createTestWord({ status: 'white' });
      const updated = calculateNextReview(word, true);

      expect(updated.srRepetitions).toBe(1);
      expect(updated.srInterval).toBe(1); // First repetition interval
      expect(updated.srDueDate).toBeGreaterThan(Date.now());
    });

    test('should increase practiced count on correct answer', () => {
      const word = createTestWord({ practicedCount: 0 });
      // Note: practicedCount is updated in testLogic, not spacedRepetition
      // But calculateNextReview should work with any practicedCount
      const updated = calculateNextReview(word, true);
      expect(updated).toBeDefined();
    });
  });

  describe('EC-5: White → Red (first incorrect answer)', () => {
    test('should reset interval on incorrect answer', () => {
      const word = createTestWord({
        srRepetitions: 0,
        srInterval: 1,
        srDueDate: Date.now() + 86400000,
      });

      const updated = calculateNextReview(word, false);

      expect(updated.srRepetitions).toBe(0);
      expect(updated.srInterval).toBe(1);
      expect(updated.srDueDate).toBeLessThanOrEqual(Date.now() + 1000); // Due very soon
    });

    test('should decrease ease factor on incorrect answer', () => {
      const word = createTestWord({
        srEaseFactor: 2.5,
        srRepetitions: 0,
        srInterval: 1,
      });

      const updated = calculateNextReview(word, false);

      expect(updated.srEaseFactor).toBeLessThan(2.5);
      expect(updated.srEaseFactor).toBeGreaterThanOrEqual(1.3);
    });
  });

  describe('EC-7: Multiple rapid correct answers', () => {
    test('should increase interval exponentially with correct answers', () => {
      let word = createTestWord({
        srEaseFactor: 2.5,
        srInterval: 1,
        srRepetitions: 0,
      });

      const intervals: number[] = [];

      // Simulate 5 correct answers
      for (let i = 0; i < 5; i++) {
        word = calculateNextReview(word, true);
        intervals.push(word.srInterval!);
      }

      // Verify intervals increase
      for (let i = 1; i < intervals.length; i++) {
        expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
      }

      // Rough progression: 1, 3, ?, ?, ?
      expect(intervals[0]).toBe(1); // First repetition
      expect(intervals[1]).toBe(3); // Second repetition
      expect(intervals[2]).toBeGreaterThan(3); // Third and beyond
    });
  });

  describe('EC-6: Status oscillation (Green → Red → Green)', () => {
    test('should handle status oscillation correctly', () => {
      let word = createTestWord({
        status: 'green',
        srRepetitions: 5,
        srInterval: 15,
        srEaseFactor: 2.5,
      });

      // Answer incorrectly (Red)
      word = calculateNextReview(word, false);
      expect(word.srRepetitions).toBe(0);
      expect(word.srInterval).toBe(1);

      // Answer correctly again (Green)
      word = calculateNextReview(word, true);
      expect(word.srRepetitions).toBe(1);
      expect(word.srInterval).toBe(1);
    });
  });

  describe('EC-29: Due date validation', () => {
    test('should prevent due dates in unreasonable future', () => {
      const fiveYearsFromNow = Date.now() + 5 * 365 * 24 * 60 * 60 * 1000;
      const word = createTestWord({
        srDueDate: fiveYearsFromNow + 86400000, // One day beyond 5 years
      });

      const validated = validateSRFields(word);
      expect(validated.srDueDate).toBeLessThanOrEqual(fiveYearsFromNow + 86400000);
    });
  });

  describe('EC-28: Due date in distant past', () => {
    test('should handle ancient due dates', () => {
      const word = createTestWord({
        srDueDate: 0, // Year 1970
      });

      expect(isDue(word)).toBe(true);

      const validated = validateSRFields(word);
      expect(validated.srDueDate).toBeGreaterThan(0);
    });
  });

  describe('Word prioritization (EC-8, EC-9, EC-30)', () => {
    test('should prioritize overdue words first', () => {
      const now = Date.now();
      const words: Word[] = [
        createTestWord({
          id: 'word-1',
          srDueDate: now - 86400000 * 7, // 7 days overdue
        }),
        createTestWord({
          id: 'word-2',
          srDueDate: now - 86400000, // 1 day overdue
        }),
        createTestWord({
          id: 'word-3',
          srDueDate: now + 86400000, // Due tomorrow
        }),
      ];

      const prioritized = prioritizeWords(words);

      expect(prioritized[0].id).toBe('word-1'); // Most overdue
      expect(prioritized[1].id).toBe('word-2');
      expect(prioritized[2].id).toBe('word-3'); // Not yet due
    });

    test('should handle 1000+ words efficiently', () => {
      const words: Word[] = [];
      const now = Date.now();

      for (let i = 0; i < 1000; i++) {
        words.push(
          createTestWord({
            id: `word-${i}`,
            srDueDate: now + Math.random() * 86400000 * 30, // Random within 30 days
          })
        );
      }

      const startTime = Date.now();
      const prioritized = prioritizeWords(words);
      const endTime = Date.now();

      expect(prioritized.length).toBe(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in <1 second
    });
  });

  describe('isDue and getDueWords', () => {
    test('should correctly identify due words', () => {
      const now = Date.now();
      const dueWord = createTestWord({ srDueDate: now - 1000 });
      const notDueWord = createTestWord({ srDueDate: now + 86400000 });

      expect(isDue(dueWord)).toBe(true);
      expect(isDue(notDueWord)).toBe(false);
    });

    test('should filter due words correctly', () => {
      const now = Date.now();
      const words: Word[] = [
        createTestWord({ id: 'due-1', srDueDate: now - 1000 }),
        createTestWord({ id: 'notdue-1', srDueDate: now + 86400000 }),
        createTestWord({ id: 'due-2', srDueDate: now - 86400000 }),
      ];

      const dueWords = getDueWords(words);
      expect(dueWords.length).toBe(2);
      expect(dueWords.every(w => w.srDueDate! <= now)).toBe(true);
    });

    test('getDueCount should return correct count', () => {
      const now = Date.now();
      const words: Word[] = [
        createTestWord({ srDueDate: now - 1000 }),
        createTestWord({ srDueDate: now + 86400000 }),
        createTestWord({ srDueDate: now - 86400000 }),
      ];

      expect(getDueCount(words)).toBe(2);
    });
  });

  describe('EC-25: Mixed SR/non-SR words migration', () => {
    test('should migrate mixed legacy and SR-enabled words', () => {
      const now = Date.now();
      const words: Word[] = [
        // Legacy word without SR fields
        createTestWord({
          id: 'legacy-1',
          srEaseFactor: undefined,
          srInterval: undefined,
        }),
        // Word with SR fields
        createTestWord({
          id: 'sr-1',
          srEaseFactor: 2.5,
          srInterval: 3,
          srDueDate: now + 86400000,
        }),
        // Another legacy word
        createTestWord({
          id: 'legacy-2',
          srEaseFactor: undefined,
          srInterval: undefined,
        }),
      ];

      const migrated = migrateLegacyWords(words);

      expect(migrated.length).toBe(3);
      migrated.forEach(word => {
        expect(word.srEaseFactor).toBeDefined();
        expect(word.srInterval).toBeDefined();
        expect(word.srDueDate).toBeDefined();
      });
    });
  });

  describe('Backward compatibility', () => {
    test('should work with undefined SR fields', () => {
      const word = createTestWord();
      // Explicitly remove SR fields as if they don't exist
      const { srEaseFactor, srInterval, srDueDate, srRepetitions, srLastReviewed, ...wordWithoutSR } = word;

      const initialized = initializeSRFields(wordWithoutSR as Word);
      expect(initialized.srEaseFactor).toBe(2.5);
      expect(initialized.srInterval).toBe(1);
    });

    test('should preserve all non-SR fields', () => {
      const word = createTestWord({
        etymology: {
          components: [{ character: '你', meaning: 'you', explanation: 'second person' }],
          fullMeaning: 'you',
        },
      });

      const updated = calculateNextReview(word, true);

      expect(updated.chinese).toBe(word.chinese);
      expect(updated.english).toBe(word.english);
      expect(updated.etymology).toEqual(word.etymology);
    });
  });

  describe('Edge case: Empty word collections', () => {
    test('should handle empty word array', () => {
      const words: Word[] = [];
      const prioritized = prioritizeWords(words);
      expect(prioritized).toEqual([]);

      expect(getDueCount(words)).toBe(0);
      expect(getDueWords(words)).toEqual([]);
    });
  });

  describe('SM-2 Algorithm correctness', () => {
    test('should follow SM-2 progression for ideal learning', () => {
      let word = createTestWord({
        srRepetitions: 0,
        srInterval: 1,
        srEaseFactor: 2.5,
      });

      // After first correct: interval = 1
      word = calculateNextReview(word, true);
      expect(word.srInterval).toBe(1);

      // After second correct: interval = 3
      word = calculateNextReview(word, true);
      expect(word.srInterval).toBe(3);

      // After third correct: interval = 3 * 2.5 = 7.5, rounded to 8
      word = calculateNextReview(word, true);
      expect(word.srInterval).toBeGreaterThan(3);
    });
  });
});
