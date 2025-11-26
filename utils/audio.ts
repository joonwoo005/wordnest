import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

export const audioUtils = {
  // Initialize audio mode
  async initializeAudio(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  },

  // Speak Chinese text using native text-to-speech
  async speakChinese(text: string): Promise<void> {
    try {
      // Check if speech is already playing and stop it
      await Speech.stop();

      // Speak the text in Mandarin Chinese
      await Speech.speak(text, {
        language: 'zh-CN',
        rate: 0.9,
        pitch: 1.0,
      });
    } catch (error) {
      console.error('Error speaking text:', error);
    }
  },

  // Stop any playing audio
  async stopAudio(): Promise<void> {
    try {
      await Speech.stop();
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  },

  // Check if speech is available
  async isSpeechAvailable(): Promise<boolean> {
    try {
      return await Speech.isSpeakingAsync();
    } catch (error) {
      console.error('Error checking speech availability:', error);
      return false;
    }
  },
};
