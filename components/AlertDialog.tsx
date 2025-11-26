import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { colors } from '@/utils/colors';

interface CustomButton {
  text: string;
  onPress: () => void;
}

interface AlertDialogProps {
  visible: boolean;
  title: string;
  message: string;
  cancelText?: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm?: () => void;
  isDangerous?: boolean;
  customButtons?: CustomButton[];
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  visible,
  title,
  message,
  cancelText = 'Cancel',
  confirmText = 'OK',
  onCancel,
  onConfirm,
  isDangerous = false,
  customButtons,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={styles.container}
        activeOpacity={1}
        onPress={onCancel}
      >
        <TouchableOpacity
          style={styles.alertBox}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}

          {customButtons ? (
            <View style={styles.customButtonsContainer}>
              {customButtons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.customButton}
                  onPress={button.onPress}
                >
                  <Text style={styles.customButtonText}>{button.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  isDangerous ? styles.dangerButton : styles.confirmButton,
                ]}
                onPress={onConfirm}
              >
                <Text style={styles.confirmButtonText}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 24,
    width: '80%',
    maxWidth: 300,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  confirmButton: {
    backgroundColor: colors.buttonPrimary,
  },
  dangerButton: {
    backgroundColor: colors.red,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  customButtonsContainer: {
    gap: 0,
  },
  customButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'flex-start',
  },
  customButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.buttonPrimary,
  },
});
