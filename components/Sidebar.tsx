import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  PanResponder,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Folder } from '@/types';
import { colors } from '@/utils/colors';
import { t } from '@/utils/translations';
import { AlertDialog } from './AlertDialog';

interface SidebarProps {
  visible: boolean;
  username: string;
  folders: Folder[];
  currentFolderId: string | null;
  onFolderSelect: (folderId: string) => void;
  onNewFolder: (folderName: string) => void;
  onDeleteFolders: (folderIds: string[]) => Promise<void>;
  onExportFolders: (folderIds: string[]) => Promise<void>;
  onRenameFolder: (folderId: string, newName: string) => Promise<void>;
  onClose: () => void;
  totalWords: number;
  language: 'zh' | 'en';
}

const { width: screenWidth } = Dimensions.get('window');

export const Sidebar: React.FC<SidebarProps> = ({
  visible,
  username,
  folders,
  currentFolderId,
  onFolderSelect,
  onNewFolder,
  onDeleteFolders,
  onExportFolders,
  onRenameFolder,
  onClose,
  totalWords,
  language,
}) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [inputError, setInputError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [showRenameInput, setShowRenameInput] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const insets = useSafeAreaInsets();

  // Animation for sidebar slide in/out
  const slideAnimRef = useRef(new Animated.Value(-screenWidth * 0.9)).current;

  useEffect(() => {
    Animated.timing(slideAnimRef, {
      toValue: visible ? 0 : -screenWidth * 0.9,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnimRef]);

  // Setup pan responder for interactive swipe gesture to close sidebar
  const panResponderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => visible,
      onMoveShouldSetPanResponder: () => visible,
      onPanResponderMove: (evt, gestureState) => {
        // Move animation with finger in real-time
        // gestureState.dx is negative when swiping left, positive when swiping right
        // We want the sidebar to follow from 0 (open) to -screenWidth * 0.9 (closed)
        const newValue = Math.max(-screenWidth * 0.9, Math.min(0, gestureState.dx));
        slideAnimRef.setValue(newValue);
      },
      onPanResponderRelease: (evt, gestureState) => {
        // If swiped enough to the left, close it
        if (gestureState.dx < -50 && Math.abs(gestureState.dy) < 30) {
          // Animate to closed position
          Animated.timing(slideAnimRef, {
            toValue: -screenWidth * 0.9,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        } else {
          // Snap back to open position
          Animated.timing(slideAnimRef, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => {
      if (showNewFolderInput) {
        setNewFolderName('');
        setShowNewFolderInput(false);
      }
    });

    return () => {
      keyboardWillHide.remove();
    };
  }, [showNewFolderInput]);

  // Reset edit mode when sidebar is closed
  useEffect(() => {
    if (!visible && editMode) {
      setEditMode(false);
      setSelectedFolders(new Set());
    }
  }, [visible]);

  const MAX_FOLDER_NAME_LENGTH = 30;

  const toggleFolderSelection = (folderId: string) => {
    const newSelected = new Set(selectedFolders);
    if (newSelected.has(folderId)) {
      newSelected.delete(folderId);
    } else {
      newSelected.add(folderId);
    }
    setSelectedFolders(newSelected);
  };

  const handleEditModeToggle = () => {
    if (editMode) {
      setSelectedFolders(new Set());
    }
    setEditMode(!editMode);
  };

  const handleNewFolder = () => {
    const trimmedName = newFolderName.trim();
    if (!trimmedName) {
      setInputError('Folder name cannot be empty');
      setNewFolderName('');
      return;
    }
    if (trimmedName.length > MAX_FOLDER_NAME_LENGTH) {
      setInputError(`Folder name cannot exceed ${MAX_FOLDER_NAME_LENGTH} characters`);
      return;
    }
    onNewFolder(newFolderName);
    setNewFolderName('');
    setShowNewFolderInput(false);
    setInputError('');
  };

  const handleDeleteFolders = () => {
    if (selectedFolders.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await onDeleteFolders(Array.from(selectedFolders));
      setSelectedFolders(new Set());
      setEditMode(false);
      setShowDeleteSuccess(true);
      setTimeout(() => setShowDeleteSuccess(false), 2000);
    } catch (error) {
      console.error('Error deleting folders:', error);
      Alert.alert(t('error', language), 'Failed to delete folders');
    }
  };

  const handleExportFolders = () => {
    if (selectedFolders.size === 0) return;
    setShowExportConfirm(true);
  };

  const handleConfirmExport = async () => {
    setShowExportConfirm(false);
    // Close the sidebar to allow share dialog to appear
    onClose();
    try {
      const result = await onExportFolders(Array.from(selectedFolders));
      // Only show success message if user actually shared the file
      if (result && result.action === 'shared') {
        setShowExportSuccess(true);
        setTimeout(() => setShowExportSuccess(false), 2000);
      }
    } catch (error) {
      console.error('Error exporting folders:', error);
      Alert.alert(t('error', language), 'Failed to export folders');
    }
  };

  const handleRenameClick = () => {
    if (selectedFolders.size !== 1) {
      Alert.alert(
        t('error', language),
        language === 'zh' ? '请选择一个文件夹进行重命名' : 'Please select one folder to rename'
      );
      return;
    }

    const folderId = Array.from(selectedFolders)[0];
    const folderToRename = folders.find(f => f.id === folderId);
    if (folderToRename) {
      setRenameFolderId(folderId);
      setRenameValue(folderToRename.name);
      setShowRenameInput(true);
      setRenameError('');
    }
  };

  const handleConfirmRename = async () => {
    if (!renameFolderId) return;

    const trimmedName = renameValue.trim();
    if (!trimmedName) {
      setRenameError(language === 'zh' ? '文件夹名称不能为空' : 'Folder name cannot be empty');
      return;
    }
    if (trimmedName.length > MAX_FOLDER_NAME_LENGTH) {
      setRenameError(`Folder name cannot exceed ${MAX_FOLDER_NAME_LENGTH} characters`);
      return;
    }

    try {
      setShowRenameInput(false);
      await onRenameFolder(renameFolderId, trimmedName);
      setSelectedFolders(new Set());
      setEditMode(false);
      setRenameFolderId(null);
      setRenameValue('');
      setRenameError('');
    } catch (error) {
      console.error('Error renaming folder:', error);
      Alert.alert(t('error', language), 'Failed to rename folder');
      setShowRenameInput(true);
    }
  };

  const sidebarWidth = screenWidth * 0.9;
  const overlayWidth = screenWidth * 0.1;

  return (
    <Modal visible={visible} transparent animationType="none" presentationStyle="overFullScreen">
      <View style={styles.container}>
        {/* Dark overlay (10% of screen on left) */}
        <TouchableOpacity
          style={[
            styles.overlay,
            {
              width: overlayWidth,
            },
          ]}
          onPress={onClose}
          activeOpacity={0.5}
        />

        {/* Sidebar (90% of screen on right) */}
        <View
          {...panResponderRef.panHandlers}
        >
          <Animated.View
            style={[
              {
                transform: [{ translateX: slideAnimRef }],
                width: sidebarWidth,
              },
            ]}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
              style={[
                styles.sidebarContainer,
                {
                  width: sidebarWidth,
                },
              ]}
            >
              <View
                style={{
                  paddingTop: insets.top + 12,
                  paddingBottom: insets.bottom + 6,
                  flex: 1,
                }}
              >
                {/* Header with Username and Create/Edit Folder Icons */}
                <View style={styles.header}>
                  <Text style={styles.username}>{username}</Text>
                  <View style={styles.headerButtons}>
                    <TouchableOpacity
                      style={styles.createFolderButton}
                      onPress={() => setShowNewFolderInput(true)}
                    >
                      <Text style={styles.createFolderIcon}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.createFolderButton, editMode && styles.editButtonActive]}
                      onPress={handleEditModeToggle}
                    >
                      <Text style={styles.createFolderIcon}>⋯</Text>
                    </TouchableOpacity>
                  </View>
                </View>


                {/* Stats Section */}
                <View style={styles.statsSection}>
                  <Text style={styles.statsText}>
                    {totalWords} {t('wordCountFormat', language)}{folders.length} {t('folderCountFormat', language)}
                  </Text>
                </View>

                {/* Separator Line */}
                <View style={styles.separator} />

                {/* Folder List */}
                <ScrollView style={styles.folderList}>
                  {folders.map(folder => (
                    <TouchableOpacity
                      key={folder.id}
                      style={[
                        styles.folderItem,
                        currentFolderId === folder.id && !editMode && styles.folderItemActive,
                      ]}
                      onPress={() => {
                        if (editMode) {
                          toggleFolderSelection(folder.id);
                        } else {
                          onFolderSelect(folder.id);
                        }
                      }}
                    >
                      {editMode && (
                        <View style={styles.folderCheckbox}>
                          {selectedFolders.has(folder.id) ? (
                            <View style={styles.checkboxChecked}>
                              <Text style={styles.checkmark}>✓</Text>
                            </View>
                          ) : (
                            <View style={styles.checkboxEmpty} />
                          )}
                        </View>
                      )}
                      <Text
                        style={[
                          styles.folderName,
                          currentFolderId === folder.id && !editMode && styles.folderNameActive,
                        ]}
                      >
                        {folder.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* New Folder Input */}
                {showNewFolderInput && (
                  <View>
                    <View style={styles.newFolderInputContainer}>
                      <TextInput
                        style={[styles.input, inputError && styles.inputError]}
                        placeholder={t('inputFolderName', language)}
                        placeholderTextColor={colors.textTertiary}
                        value={newFolderName}
                        onChangeText={(text) => {
                          setNewFolderName(text);
                          setInputError('');
                        }}
                        maxLength={MAX_FOLDER_NAME_LENGTH}
                        autoFocus
                        keyboardType="default"
                        allowFontScaling={true}
                        editable={true}
                      />
                      <TouchableOpacity
                        style={styles.inputButton}
                        onPress={handleNewFolder}
                      >
                        <Text style={styles.inputButtonText}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.inputButton, styles.cancelButton]}
                        onPress={() => {
                          setNewFolderName('');
                          setShowNewFolderInput(false);
                          setInputError('');
                        }}
                      >
                        <Text style={styles.inputButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    {inputError && (
                      <Text style={styles.errorMessage}>{inputError}</Text>
                    )}
                  </View>
                )}

                {/* Action Buttons (Edit Mode) */}
                {editMode && (
                  <>
                    {/* Rename Button */}
                    <TouchableOpacity
                      style={[
                        styles.renameButton,
                        selectedFolders.size !== 1 && styles.renameButtonDisabled,
                      ]}
                      onPress={handleRenameClick}
                      disabled={selectedFolders.size !== 1}
                    >
                      <Text style={styles.renameButtonText}>
                        {language === 'zh' ? '重命名' : 'Rename'}
                      </Text>
                    </TouchableOpacity>

                    {/* Delete Button */}
                    <TouchableOpacity
                      style={[
                        styles.deleteAllButton,
                        selectedFolders.size === 0 && styles.deleteAllButtonDisabled,
                      ]}
                      onPress={handleDeleteFolders}
                      disabled={selectedFolders.size === 0}
                    >
                      <Text style={styles.deleteAllButtonText}>
                        {t('delete', language)} ({selectedFolders.size})
                      </Text>
                    </TouchableOpacity>

                    {/* Export Button */}
                    <TouchableOpacity
                      style={[
                        styles.exportButton,
                        selectedFolders.size === 0 && styles.exportButtonDisabled,
                      ]}
                      onPress={handleExportFolders}
                      disabled={selectedFolders.size === 0}
                    >
                      <Text style={styles.exportButtonText}>
                        {language === 'zh' ? '导出 CSV' : 'Export CSV'} ({selectedFolders.size})
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>

        {/* Delete Confirmation Alert */}
        <AlertDialog
          visible={showDeleteConfirm}
          title={t('delete', language)}
          message={`Delete ${selectedFolders.size} folder${selectedFolders.size > 1 ? 's' : ''}?`}
          cancelText={t('cancel', language)}
          confirmText={t('delete', language)}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmDelete}
          isDangerous={true}
        />

        {/* Delete Success Alert */}
        <AlertDialog
          visible={showDeleteSuccess}
          title="Success"
          message={`${selectedFolders.size} folder${selectedFolders.size > 1 ? 's' : ''} deleted`}
          confirmText="OK"
          onCancel={() => setShowDeleteSuccess(false)}
          onConfirm={() => setShowDeleteSuccess(false)}
        />

        {/* Export Confirmation Alert */}
        <AlertDialog
          visible={showExportConfirm}
          title={language === 'zh' ? '导出文件夹' : 'Export Folders'}
          message={language === 'zh' ? `导出 ${selectedFolders.size} 个文件夹的词汇到 CSV？` : `Export words from ${selectedFolders.size} folder${selectedFolders.size > 1 ? 's' : ''} to CSV?`}
          cancelText={t('cancel', language)}
          confirmText={language === 'zh' ? '导出' : 'Export'}
          onCancel={() => setShowExportConfirm(false)}
          onConfirm={handleConfirmExport}
        />

        {/* Export Success Alert */}
        <AlertDialog
          visible={showExportSuccess}
          title="Success"
          message={language === 'zh' ? '词汇已导出' : 'Words exported successfully'}
          confirmText="OK"
          onCancel={() => setShowExportSuccess(false)}
          onConfirm={() => setShowExportSuccess(false)}
        />

        {/* Rename Dialog */}
        {showRenameInput && (
          <View style={styles.renameDialogOverlay}>
            <View style={styles.renameDialog}>
              <Text style={styles.renameDialogTitle}>
                {language === 'zh' ? '重命名文件夹' : 'Rename Folder'}
              </Text>
              <TextInput
                style={[styles.renameDialogInput, renameError && styles.renameDialogInputError]}
                placeholder={language === 'zh' ? '输入新的文件夹名称' : 'Enter new folder name'}
                placeholderTextColor={colors.textTertiary}
                value={renameValue}
                onChangeText={(text) => {
                  setRenameValue(text);
                  setRenameError('');
                }}
                maxLength={MAX_FOLDER_NAME_LENGTH}
                autoFocus
              />
              {renameError && (
                <Text style={styles.renameDialogError}>{renameError}</Text>
              )}
              <View style={styles.renameDialogButtons}>
                <TouchableOpacity
                  style={[styles.renameDialogButton, styles.renameDialogButtonCancel]}
                  onPress={() => {
                    setShowRenameInput(false);
                    setRenameFolderId(null);
                    setRenameValue('');
                    setRenameError('');
                  }}
                >
                  <Text style={styles.renameDialogButtonCancelText}>
                    {language === 'zh' ? '取消' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.renameDialogButton, styles.renameDialogButtonConfirm]}
                  onPress={handleConfirmRename}
                >
                  <Text style={styles.renameDialogButtonConfirmText}>
                    {language === 'zh' ? '确认' : 'Confirm'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row-reverse',
    backgroundColor: 'transparent',
  },
  overlay: {
    flex: 0,
    backgroundColor: colors.overlay,
  },
  sidebarContainer: {
    backgroundColor: colors.sidebarBackground,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.sidebarBorder,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  createFolderButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonActive: {
    backgroundColor: colors.buttonPrimary,
    borderColor: colors.buttonPrimary,
  },
  createFolderIcon: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '600',
    transform: [{scaleX: -1}],
  },
  statsSection: {
    marginBottom: 16,
  },
  statsText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  folderList: {
    flex: 1,
    marginBottom: 16,
  },
  folderItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderItemActive: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: colors.buttonPrimary,
  },
  folderName: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  folderNameActive: {
    fontWeight: '700',
    color: colors.buttonPrimary,
  },
  folderCheckbox: {
    marginRight: 12,
    justifyContent: 'center',
  },
  checkboxEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  checkboxChecked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  newFolderInputContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.red,
  },
  inputButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  inputError: {
    borderColor: colors.red,
    borderWidth: 1.5,
  },
  errorMessage: {
    fontSize: 12,
    color: colors.red,
    marginTop: 6,
    paddingHorizontal: 4,
    fontWeight: '500',
  },
  deleteAllButton: {
    backgroundColor: colors.red,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 'auto',
  },
  deleteAllButtonDisabled: {
    backgroundColor: colors.red,
    opacity: 0.5,
  },
  deleteAllButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  exportButton: {
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  exportButtonDisabled: {
    backgroundColor: colors.buttonPrimary,
    opacity: 0.5,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  renameButton: {
    backgroundColor: colors.buttonPrimary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  renameButtonDisabled: {
    backgroundColor: colors.buttonPrimary,
    opacity: 0.5,
  },
  renameButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  renameDialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  renameDialog: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 24,
    width: '80%',
    maxWidth: 320,
  },
  renameDialogTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  renameDialogInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    marginBottom: 8,
  },
  renameDialogInputError: {
    borderColor: colors.red,
    borderWidth: 1.5,
  },
  renameDialogError: {
    fontSize: 12,
    color: colors.red,
    marginBottom: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  renameDialogButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  renameDialogButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  renameDialogButtonCancel: {
    backgroundColor: colors.border,
  },
  renameDialogButtonCancelText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  renameDialogButtonConfirm: {
    backgroundColor: colors.buttonPrimary,
  },
  renameDialogButtonConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
