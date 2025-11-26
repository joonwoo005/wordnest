import { PartOfSpeech } from '@/types';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export const detectPartOfSpeech = async (
  chinese: string,
  english: string
): Promise<PartOfSpeech> => {
  try {
    if (!chinese.trim()) {
      throw new Error('Chinese text is required');
    }

    const response = await fetch(`${BACKEND_URL}/api/pos-detection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chinese: chinese.trim(),
        english: english.trim(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'POS detection failed');
    }

    const data = await response.json();
    return data.partOfSpeech as PartOfSpeech;
  } catch (error) {
    console.error('POS detection error:', error);
    throw error;
  }
};
