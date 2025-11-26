import { Word } from '@/types';

// SM-2 Constants
const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const MAX_INTERVAL_DAYS = 365;
const INITIAL_INTERVAL_DAYS = 1;

/**
 * Initialize SR fields for a word that doesn't have them.
 * Used for backward compatibility with legacy words.
 */
export const initializeSRFields = (word: Word): Word => {
  if (word.srEaseFactor !== undefined && word.srInterval !== undefined && word.srDueDate !== undefined) {
    // Already initialized, but validate fields
    return validateSRFields(word);
  }

  const now = Date.now();
  return {
    ...word,
    srEaseFactor: word.srEaseFactor ?? DEFAULT_EASE_FACTOR,
    srInterval: word.srInterval ?? INITIAL_INTERVAL_DAYS,
    srDueDate: word.srDueDate ?? now,
    srRepetitions: word.srRepetitions ?? 0,
    srLastReviewed: word.srLastReviewed ?? null,
  };
};

/**
 * Validate SR fields to prevent corruption from breaking the algorithm.
 * Resets invalid values to safe defaults.
 */
export const validateSRFields = (word: Word): Word => {
  const now = Date.now();
  const validated = { ...word };

  // Validate ease factor (must be >= 1.3)
  if (typeof validated.srEaseFactor !== 'number' || validated.srEaseFactor < MIN_EASE_FACTOR) {
    validated.srEaseFactor = DEFAULT_EASE_FACTOR;
  }

  // Validate interval (must be positive number)
  if (typeof validated.srInterval !== 'number' || validated.srInterval < 1) {
    validated.srInterval = INITIAL_INTERVAL_DAYS;
  }

  // Cap interval at reasonable maximum
  if (validated.srInterval > MAX_INTERVAL_DAYS) {
    validated.srInterval = MAX_INTERVAL_DAYS;
  }

  // Validate due date (must be a valid timestamp)
  if (typeof validated.srDueDate !== 'number' || validated.srDueDate < 0) {
    validated.srDueDate = now;
  }

  // Prevent due dates in unreasonable future (>5 years)
  const fiveYearsMs = 5 * 365 * 24 * 60 * 60 * 1000;
  if (validated.srDueDate > now + fiveYearsMs) {
    validated.srDueDate = now + (validated.srInterval * 24 * 60 * 60 * 1000);
  }

  // Validate repetitions (must be non-negative integer)
  if (typeof validated.srRepetitions !== 'number' || validated.srRepetitions < 0) {
    validated.srRepetitions = 0;
  }

  // Validate last reviewed (optional, must be valid timestamp if present)
  if (validated.srLastReviewed !== undefined && validated.srLastReviewed !== null) {
    if (typeof validated.srLastReviewed !== 'number' || validated.srLastReviewed < 0) {
      validated.srLastReviewed = null;
    }
  }

  return validated;
};

/**
 * SM-2 Algorithm: Calculate next review interval and ease factor.
 * Quality scale: 0-2 (incorrect), 3-5 (correct)
 */
const sm2Calculate = (
  easeFactor: number,
  interval: number,
  repetitions: number,
  quality: number // 0-5, where 0-2 = incorrect, 3-5 = correct
): { newInterval: number; newEaseFactor: number; newRepetitions: number } => {
  let newEaseFactor = easeFactor;
  let newInterval = interval;
  let newRepetitions = repetitions;

  if (quality < 3) {
    // Incorrect answer: reset progress
    newRepetitions = 0;
    newInterval = INITIAL_INTERVAL_DAYS;
    newEaseFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
  } else {
    // Correct answer: increase interval
    newRepetitions += 1;

    // SM-2 interval calculation
    if (newRepetitions === 1) {
      newInterval = INITIAL_INTERVAL_DAYS;
    } else if (newRepetitions === 2) {
      newInterval = 3;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }

    // Adjust ease factor based on quality
    newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEaseFactor = Math.max(MIN_EASE_FACTOR, newEaseFactor);
  }

  // Cap interval at maximum
  newInterval = Math.min(newInterval, MAX_INTERVAL_DAYS);

  return {
    newInterval,
    newEaseFactor,
    newRepetitions,
  };
};

/**
 * Map test answer (correct/incorrect) to SM-2 quality score.
 * Correct = quality 4 (good answer)
 * Incorrect = quality 0 (complete blackout)
 */
const answerToQuality = (isCorrect: boolean): number => {
  return isCorrect ? 4 : 0;
};

/**
 * Calculate next review parameters for a word after an answer.
 * Returns updated word with new SR metadata.
 */
export const calculateNextReview = (word: Word, isCorrect: boolean): Word => {
  // Ensure word has valid SR fields
  let validated = initializeSRFields(word);
  validated = validateSRFields(validated);

  const quality = answerToQuality(isCorrect);
  const { newInterval, newEaseFactor, newRepetitions } = sm2Calculate(
    validated.srEaseFactor!,
    validated.srInterval!,
    validated.srRepetitions!,
    quality
  );

  const now = Date.now();
  const nextReviewDate = now + newInterval * 24 * 60 * 60 * 1000; // Convert days to milliseconds

  return {
    ...validated,
    srInterval: newInterval,
    srEaseFactor: newEaseFactor,
    srRepetitions: newRepetitions,
    srDueDate: nextReviewDate,
    srLastReviewed: now,
  };
};

/**
 * Prioritize words by due date for SR-optimized studying.
 * Overdue words come first, then upcoming due words.
 * Words with same due date maintain original order.
 */
export const prioritizeWords = (words: Word[]): Word[] => {
  const now = Date.now();

  // Ensure all words have valid SR fields
  const validatedWords = words.map(word => validateSRFields(initializeSRFields(word)));

  // Sort by due date (ascending - overdue first)
  const sorted = [...validatedWords].sort((a, b) => {
    const aDueDate = a.srDueDate ?? now;
    const bDueDate = b.srDueDate ?? now;
    return aDueDate - bDueDate;
  });

  return sorted;
};

/**
 * Check if a word is due for review.
 */
export const isDue = (word: Word): boolean => {
  const validated = validateSRFields(initializeSRFields(word));
  const now = Date.now();
  return (validated.srDueDate ?? now) <= now;
};

/**
 * Filter words that are due for review.
 */
export const getDueWords = (words: Word[]): Word[] => {
  return words.filter(isDue);
};

/**
 * Count how many words are due for review.
 */
export const getDueCount = (words: Word[]): number => {
  return getDueWords(words).length;
};

/**
 * Migrate legacy words by initializing SR fields for all.
 * Used during storage loading to ensure consistency.
 */
export const migrateLegacyWords = (words: Word[]): Word[] => {
  return words.map(word => {
    const initialized = initializeSRFields(word);
    return validateSRFields(initialized);
  });
};
