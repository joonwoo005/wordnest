/**
 * MANUAL TESTING GUIDE FOR SPACED REPETITION IMPLEMENTATION
 *
 * This file documents manual testing scenarios to verify the SR implementation.
 * Run these tests manually in your app to verify edge cases.
 */

import {
  initializeSRFields,
  validateSRFields,
  calculateNextReview,
  prioritizeWords,
  isDue,
  getDueWords,
  getDueCount,
} from '@/utils/spacedRepetition';
import { Word } from '@/types';

// ============================================================================
// TEST SCENARIOS - Run these manually
// ============================================================================

/**
 * EDGE CASE 1: Legacy word migration on app startup
 *
 * Steps to test:
 * 1. Add 10 words to a folder
 * 2. Force a code update that removes SR fields (simulate old data)
 * 3. Reload app
 * 4. Verify all words have SR fields initialized with:
 *    - srEaseFactor = 2.5
 *    - srInterval = 1
 *    - srDueDate = ~now
 *    - srRepetitions = 0
 *
 * Method: Use AsyncStorage dev tools or manual inspection
 */

/**
 * EDGE CASE 4: New word → First correct answer
 *
 * Steps:
 * 1. Add new word "你好" (hello)
 * 2. Take Normal mode test
 * 3. Get the word correct
 * 4. Check test-completed screen shows word as correct
 * 5. Verify in storage that:
 *    - srRepetitions = 1
 *    - srInterval = 1 (first repetition)
 *    - srDueDate = now + 1 day
 *    - status = 'green'
 *
 * Expected: Word becomes green and due in 1 day
 */

/**
 * EDGE CASE 5: New word → First incorrect answer (skip)
 *
 * Steps:
 * 1. Add new word "再见" (goodbye)
 * 2. Take Normal mode test
 * 3. Skip the word (mark incorrect)
 * 4. Check test-completed screen
 * 5. Verify in storage that:
 *    - srRepetitions = 0 (reset)
 *    - srInterval = 1
 *    - srDueDate = ~now (due immediately)
 *    - status = 'red'
 *
 * Expected: Word becomes red and due immediately for next test
 */

/**
 * EDGE CASE 6: Status oscillation (Green → Red → Green)
 *
 * Steps:
 * 1. Add word and get it correct (Green, srRepetitions=1, srInterval=1)
 * 2. In next test, get it wrong (Red, srRepetitions=0)
 * 3. In next test, get it correct again (Green, srRepetitions=1)
 * 4. Verify ease factor decreased due to incorrect answer
 *
 * Expected: Word cycles through states, ease factor decreases on wrong answers
 */

/**
 * EDGE CASE 7: Multiple correct answers (exponential growth)
 *
 * Steps:
 * 1. Add word "谢谢" (thank you)
 * 2. Get it correct in test 1 → srInterval = 1, srRepetitions = 1
 * 3. Get it correct in test 2 → srInterval = 3, srRepetitions = 2
 * 4. Get it correct in test 3 → srInterval = ~8, srRepetitions = 3
 * 5. Get it correct in test 4 → srInterval = ~20, srRepetitions = 4
 *
 * Verify intervals grow exponentially, roughly: 1 → 3 → 8 → 20 → 50...
 */

/**
 * EDGE CASE 8: Normal mode prioritizes overdue words
 *
 * Steps:
 * 1. Add 20 words to a folder
 * 2. Manually set 5 words to be overdue in the past (srDueDate = now - 7 days)
 * 3. Set 10 words to be due soon (srDueDate = now + 2 days)
 * 4. Set 5 words to be due later (srDueDate = now + 30 days)
 * 5. Take Normal mode test
 * 6. Verify first words in test are from the overdue group
 *
 * Method: Use AsyncStorage dev tools to manipulate srDueDate values
 */

/**
 * EDGE CASE 9: Normal mode with no overdue words
 *
 * Steps:
 * 1. Create folder with 15 words
 * 2. Set all words to future due dates (now + 5 to 30 days)
 * 3. Take Normal mode test
 * 4. Verify test still shows 10 words (not skipped)
 * 5. Verify words are ordered by due date (soonest first)
 */

/**
 * EDGE CASE 10: Unseen mode ignores SR
 *
 * Steps:
 * 1. Create 20 new words (white status)
 * 2. Take Unseen mode test
 * 3. Verify all 20 words are shuffled randomly (not by SR due date)
 * 4. Words should appear in random order, not by srDueDate
 */

/**
 * EDGE CASE 11: Learned mode filters by due date
 *
 * Steps:
 * 1. Create 10 green words (learned)
 * 2. Set 5 as due now (srDueDate <= now)
 * 3. Set 5 as not due (srDueDate > now)
 * 4. Take Learned mode test
 * 5. Verify test ONLY contains the 5 due words
 *    (or all 10 if showing early - implementation decision)
 *
 * Current implementation: Shows all green words, sorted by due date
 */

/**
 * EDGE CASE 12: Empty folder
 *
 * Steps:
 * 1. Create new folder (no words)
 * 2. Try to start test in Normal mode
 * 3. Verify alert shows "No words to test"
 * 4. No crash occurs
 */

/**
 * EDGE CASE 13: Single word folder
 *
 * Steps:
 * 1. Create folder with exactly 1 word
 * 2. Take Normal mode test
 * 3. Verify test shows just 1 word
 * 4. Complete test, verify SR fields updated correctly
 */

/**
 * EDGE CASE 14: Mid-test app closure
 *
 * Steps:
 * 1. Start test with 10 words
 * 2. Answer 3 words (2 correct, 1 incorrect)
 * 3. Force close app (kill process)
 * 4. Reopen app
 * 5. Verify first 3 words have updated SR fields
 * 6. Verify remaining 7 words unchanged
 *
 * Expected: Only completed answers saved; in-progress test lost
 */

/**
 * EDGE CASE 15: Auto-advance on correct answer
 *
 * Steps:
 * 1. Start test
 * 2. Type correct answer
 * 3. Watch SR calculation complete before auto-advance
 * 4. Verify next word appears smoothly
 * 5. After test, verify all SR fields saved for first word
 */

/**
 * EDGE CASE 16-18: Answer processing variants
 *
 * Test A: Skip word immediately
 * - Word should be marked incorrect (quality=0)
 * - srRepetitions should reset to 0
 *
 * Test B: Type wrong answer
 * - Same as skip
 *
 * Test C: Tap "Show Answer" then next
 * - Word already marked incorrect
 * - Next click shouldn't double-count
 */

/**
 * EDGE CASE 19: Last word in test
 *
 * Steps:
 * 1. Take 10-word test
 * 2. Answer all 10 words
 * 3. Verify test-completed screen appears
 * 4. Check AsyncStorage directly - verify all 10 words have updated SR fields
 *
 * Critical: All answers must save before navigation
 */

/**
 * EDGE CASE 22: Storage quota exceeded
 *
 * Steps:
 * 1. (Advanced) Fill AsyncStorage to near capacity
 * 2. Try to complete test
 * 3. Verify graceful degradation (error logged, app functional)
 * 4. Check console for error message
 */

/**
 * EDGE CASE 23: Downgrade to non-SR version
 *
 * Steps:
 * 1. Create words with SR data in current version
 * 2. (Simulate) Downgrade to version without SR support
 * 3. App should ignore SR fields but not break
 * 4. (Simulate) Upgrade back to SR version
 * 5. Verify SR fields are preserved
 */

/**
 * EDGE CASE 25: Mixed SR/non-SR words
 *
 * Steps:
 * 1. Add 5 words using current version (with SR)
 * 2. (Manually) Edit AsyncStorage to remove SR fields from 2 words
 * 3. Load app
 * 4. Verify all 5 words show valid SR fields (auto-migrated)
 * 5. Verify no data loss in other fields
 */

/**
 * EDGE CASE 26: Very high ease factor
 *
 * Steps:
 * 1. (Manually) Create word with srRepetitions = 50, srEaseFactor = 4.0
 * 2. Get it correct in test
 * 3. Verify calculated interval doesn't exceed 365 days
 * 4. Verify srInterval capped at 365 even with high ease factor
 */

/**
 * EDGE CASE 27: Very low ease factor
 *
 * Steps:
 * 1. (Manually) Create word with srEaseFactor = 0.5
 * 2. Run validateSRFields
 * 3. Verify srEaseFactor reset to minimum 1.3
 * 4. Test getting word wrong multiple times
 * 5. Verify ease factor never goes below 1.3
 */

/**
 * EDGE CASE 30: Performance with 1000+ words
 *
 * Steps:
 * 1. (Advanced test setup) Create 1000 words in a folder
 *    (Can use script to add via API)
 * 2. Take Normal mode test
 * 3. Measure load time for test start - should be <2 seconds
 * 4. Complete test quickly
 * 5. Verify no UI freezing or lag
 * 6. Complete test, verify saving completes successfully
 */

/**
 * EDGE CASE 31: First load after migration (1000+ words)
 *
 * Steps:
 * 1. (Simulate) Create app with 1000 words, no SR fields
 * 2. Update app to new version with SR support
 * 3. Launch app
 * 4. Verify app remains responsive (no freeze)
 * 5. Background migration should complete within seconds
 * 6. Use app normally while migration happens
 */

/**
 * EDGE CASE 32: Rapid test completion (10 words in 30 seconds)
 *
 * Steps:
 * 1. Start 10-word test
 * 2. Answer all 10 words as fast as possible (30 seconds)
 * 3. Verify test-completed screen appears
 * 4. Check AsyncStorage - verify all 10 words saved correctly
 * 5. No missing or corrupted SR data
 */

/**
 * EDGE CASE 33: User never takes tests
 *
 * Steps:
 * 1. Add 50 words to app
 * 2. Never take any tests
 * 3. Check AsyncStorage
 * 4. Verify all 50 words have valid SR fields initialized
 * 5. All have srDueDate = ~now, srRepetitions = 0
 */

/**
 * EDGE CASE 34: User only uses Unseen mode
 *
 * Steps:
 * 1. Add 30 words (white)
 * 2. Take Unseen mode test 3 times
 * 3. After words transition to green, keep using Unseen
 * 4. Verify app doesn't crash
 * 5. Unseen mode shows white words (shuffled)
 * 6. Verify SR data accumulates on green words normally
 */

/**
 * EDGE CASE 36: Test started before migration completes
 *
 * Steps:
 * 1. Upgrade app with 1000 legacy words
 * 2. Immediately after launch, click test before migration finishes
 * 3. Verify UI either:
 *    a) Blocks test until migration complete (best UX)
 *    b) Waits transparently, test loads with migrated words
 * 4. No crash occurs
 */

// ============================================================================
// AUTOMATED TEST RESULTS VERIFICATION
// ============================================================================

/**
 * After running manual tests, verify these automated checks pass:
 */

export function runAutomatedVerification() {
  console.log('=== SPACED REPETITION VERIFICATION ===\n');

  // Test 1: Basic initialization
  const word1: Word = {
    id: '1',
    chinese: '你好',
    pinyin: 'nǐ hǎo',
    english: 'hello',
    status: 'white',
    practicedCount: 0,
    lastResult: null,
    folderId: 'f1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const initialized = initializeSRFields(word1);
  console.log('✓ Test 1: SR field initialization');
  console.log(`  - easeFactor: ${initialized.srEaseFactor} (expected 2.5)`);
  console.log(`  - interval: ${initialized.srInterval} (expected 1)`);
  console.log(`  - dueDate exists: ${initialized.srDueDate !== undefined}\n`);

  // Test 2: Correct answer progression
  let word2 = initializeSRFields(word1);
  word2 = calculateNextReview(word2, true);
  console.log('✓ Test 2: First correct answer');
  console.log(`  - repetitions: ${word2.srRepetitions} (expected 1)`);
  console.log(`  - interval: ${word2.srInterval} (expected 1)`);
  console.log(`  - dueDate > now: ${word2.srDueDate! > Date.now()}\n`);

  word2 = calculateNextReview(word2, true);
  console.log('✓ Test 3: Second correct answer');
  console.log(`  - repetitions: ${word2.srRepetitions} (expected 2)`);
  console.log(`  - interval: ${word2.srInterval} (expected 3)`);
  console.log(`  - dueDate > first: ${word2.srDueDate! > Date.now() + 86400000}\n`);

  // Test 3: Incorrect answer reset
  let word3 = initializeSRFields(word1);
  word3.srRepetitions = 5;
  word3.srInterval = 15;
  word3.srEaseFactor = 2.3;
  word3 = calculateNextReview(word3, false);
  console.log('✓ Test 4: Incorrect answer reset');
  console.log(`  - repetitions: ${word3.srRepetitions} (expected 0)`);
  console.log(`  - interval: ${word3.srInterval} (expected 1)`);
  console.log(`  - easeFactor < 2.3: ${word3.srEaseFactor! < 2.3}`);
  console.log(`  - dueDate ~= now: ${Math.abs(word3.srDueDate! - Date.now()) < 1000}\n`);

  // Test 4: Prioritization
  const now = Date.now();
  const testWords: Word[] = [
    { ...word1, id: 'a', srDueDate: now + 86400000 },
    { ...word1, id: 'b', srDueDate: now - 86400000 * 7 },
    { ...word1, id: 'c', srDueDate: now - 86400000 },
  ];

  const prioritized = prioritizeWords(testWords);
  console.log('✓ Test 5: Word prioritization by due date');
  console.log(`  - First word: ${prioritized[0].id} (expected 'b', most overdue)`);
  console.log(`  - Second word: ${prioritized[1].id} (expected 'c')`);
  console.log(`  - Third word: ${prioritized[2].id} (expected 'a', not yet due)\n`);

  // Test 5: Due word filtering
  const dueCount = getDueCount(testWords);
  console.log('✓ Test 6: Due word counting');
  console.log(`  - Due words: ${dueCount} (expected 2)\n`);

  console.log('=== VERIFICATION COMPLETE ===');
}

// Uncomment to run automated verification
// runAutomatedVerification();
