import React, { Component, useEffect, useState } from 'react';
import { Dialog } from 'react-native-paper';
import { Keyboard, Platform } from 'react-native';

interface KeyboardAvoidingDialogProps {
  visible: boolean;
  onDismiss: () => void;
  children?: React.ReactNode;
}

export const KeyboardAvoidingDialog: React.FC<KeyboardAvoidingDialogProps> = ({
  visible, onDismiss, children }) => {
  const [bottom, setBottom] = useState(0)

  useEffect(() => {
    function onKeyboardChange(e) {
      if (Platform.OS !== "ios") {
        return;
      }
      if (e.endCoordinates.screenY < e.startCoordinates.screenY)
        setBottom(e.endCoordinates.height / 2)
      else setBottom(0)
    }

    if (Platform.OS === "ios") {
      const subscription = Keyboard.addListener("keyboardWillChangeFrame", onKeyboardChange)
      return () => subscription.remove()
    }

    const subscriptions = [
      Keyboard.addListener("keyboardDidHide", onKeyboardChange),
      Keyboard.addListener("keyboardDidShow", onKeyboardChange),
    ]
    return () => subscriptions.forEach((subscription) => subscription.remove())
  }, [])


  return (
    <Dialog dismissable={false} style={{ bottom, backgroundColor: 'white', borderRadius: 15 }} visible={visible} onDismiss={onDismiss}>
      {children}
    </Dialog>
  )
}
