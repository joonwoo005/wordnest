// Update this to your backend URL
// For local development: http://192.168.x.x:3000 (replace x.x with your local IP)
// For production: your production domain
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export interface EtymologyComponent {
  character: string;
  meaning: string;
  explanation: string;
}

export interface Etymology {
  components: EtymologyComponent[];
  fullMeaning: string;
}

export const generateEtymology = async (chinese: string): Promise<Etymology | null> => {
  try {
    if (!chinese.trim()) return null;

    // Call backend endpoint instead of directly calling Claude
    // Backend will use the secure API key
    const response = await fetch(`${BACKEND_URL}/api/etymology`, {
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
      throw new Error(error.error || 'Etymology generation failed');
    }

    const data = await response.json();
    return data as Etymology;
  } catch (error) {
    console.error('Etymology generation error:', error);
    return null;
  }
};
