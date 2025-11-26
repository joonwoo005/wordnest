import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { storage } from '@/utils/storage';
import { colors } from '@/utils/colors';
import { t } from '@/utils/translations';
import { Folder, AppState } from '@/types';

export default function OnboardingScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'username' | 'folder'>('username');

  const handleSetUsername = async () => {
    if (!username.trim()) {
      Alert.alert(t('error', 'en'), 'Please enter your username');
      return;
    }

    setCurrentStep('folder');
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      Alert.alert(t('error', 'en'), 'Please enter a folder name');
      return;
    }

    try {
      setLoading(true);

      // Create first folder
      const newFolder: Folder = {
        id: Date.now().toString(),
        name: folderName.trim(),
        wordCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Initialize app state
      const initialState: AppState = {
        username: username.trim(),
        currentFolderId: newFolder.id,
        folders: [newFolder],
        words: [],
        soundMode: 'word+sound',
        language: 'en',
      };

      // Save to storage
      await storage.saveAppState(initialState);
      await storage.saveFolders([newFolder]);

      // Navigate to home
      router.replace('/');
    } catch (error) {
      console.error('Error during onboarding:', error);
      Alert.alert(t('error', 'en'), t('failedInitialize', 'en'));
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {currentStep === 'username' ? (
          <View style={styles.stepContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('welcome', 'en')}</Text>
              <Text style={styles.subtitle}>{t('getStarted', 'en')}</Text>
            </View>

            <View style={styles.content}>
              <Text style={styles.label}>{t('namePrompt', 'en')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('namePlaceholder', 'en')}
                value={username}
                onChangeText={setUsername}
                placeholderTextColor="#999"
                autoFocus
              />

              <TouchableOpacity
                style={styles.button}
                onPress={handleSetUsername}
                disabled={loading}
              >
                <Text style={styles.buttonText}>{t('continue', 'en')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.stepContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('createFirstFolder', 'en')}</Text>
              <Text style={styles.subtitle}>
                {t('createFolderPrompt', 'en', { username })}
              </Text>
            </View>

            <View style={styles.content}>
              <Text style={styles.label}>{t('folderNameLabel', 'en')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('folderNamePlaceholder', 'en')}
                value={folderName}
                onChangeText={setFolderName}
                placeholderTextColor="#999"
                autoFocus
                keyboardType="default"
                allowFontScaling={true}
                editable={true}
              />

              <TouchableOpacity
                style={styles.button}
                onPress={handleCreateFolder}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>{t('getStartedButton', 'en')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  stepContainer: {
    alignItems: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  content: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 16,
    borderRadius: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
