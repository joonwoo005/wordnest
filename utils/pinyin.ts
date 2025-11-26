// Update this to your backend URL
// For local development: http://192.168.x.x:3000 (replace x.x with your local IP)
// For production: your production domain
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export interface PinyinResult {
  chinese: string;
  pinyin: string;
  pinyinArray: string[];
}

export const generatePinyin = async (chinese: string): Promise<string | null> => {
  try {
    if (!chinese.trim()) return null;

    // Call backend endpoint
    const response = await fetch(`${BACKEND_URL}/api/pinyin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chinese,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Pinyin generation failed');
    }

    const data: PinyinResult = await response.json();
    return data.pinyin;
  } catch (error) {
    console.error('Pinyin generation error:', error);
    return null;
  }
};
