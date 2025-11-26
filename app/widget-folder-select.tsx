import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { storage } from '@/utils/storage';
import { colors } from '@/utils/colors';
import { t } from '@/utils/translations';
import { Folder, AppState } from '@/types';

export default function WidgetFolderSelectScreen() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [appState, setAppState] = useState<AppState | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Check internet connectivity first
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        const state = await storage.getAppState();
        Alert.alert(
          t('noInternet', state?.language || 'en'),
          t('noInternetMessage', state?.language || 'en'),
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      const allFolders = await storage.getFolders();
      const state = await storage.getAppState();
      setFolders(allFolders);
      setAppState(state);

      // If no folders exist, go to onboarding
      if (allFolders.length === 0) {
        router.replace('/onboarding');
        return;
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderSelect = async (folder: Folder) => {
    try {
      // Update current folder in app state
      const updatedState = { ...appState!, currentFolderId: folder.id };
      await storage.saveAppState(updatedState);

      // Navigate to add word screen
      router.replace('/add-word');
    } catch (error) {
      console.error('Error selecting folder:', error);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.buttonPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Select Folder</Text>
        <View style={styles.placeholder} />
      </View>

      <Text style={styles.subtitle}>Choose where to add your new word</Text>

      <FlatList
        data={folders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.folderItem}
            onPress={() => handleFolderSelect(item)}
            activeOpacity={0.7}
          >
            <View style={styles.folderIcon}>
              <Text style={styles.folderIconText}>F</Text>
            </View>
            <View style={styles.folderInfo}>
              <Text style={styles.folderName}>{item.name}</Text>
              <Text style={styles.folderCount}>
                {item.wordCount} {item.wordCount === 1 ? 'word' : 'words'}
              </Text>
            </View>
            <Text style={styles.chevron}>{'>'}</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: colors.buttonPrimary,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  placeholder: {
    width: 60,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  folderIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  folderIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  folderCount: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: 18,
    color: colors.textTertiary,
    marginLeft: 8,
  },
  separator: {
    height: 8,
  },
});
