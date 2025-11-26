// Update this to your backend URL
// For local development: http://192.168.x.x:3000 (replace x.x with your local IP)
// For production: your production domain
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export const translateWithDeepL = async (text: string, targetLanguage: 'EN' | 'ZH'): Promise<string> => {
  try {
    // Call backend endpoint instead of directly calling DeepL
    // Backend will use the secure API key
    const response = await fetch(`${BACKEND_URL}/api/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        targetLanguage,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Translation failed');
    }

    const data = await response.json();
    return data.translatedText;
  } catch (error) {
    console.error('DeepL translation error:', error);
    throw error;
  }
};
