import {
  KeyboardAvoidingView,
  NativeEventEmitter,
  NativeModules,
  Platform,
  StyleSheet,
  TextInput,
  InteractionManager,
  Keyboard,
  KeyboardEvent,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { View } from '../../components/Themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '@rneui/themed';
import { FlashList } from '@shopify/flash-list';
import BleManager from 'react-native-ble-manager';
import TerminalRenderItem from '../../components/Terminal/TerminalMessage';
import { useEffect, useRef, useState, useCallback } from 'react';
import 'react-native-get-random-values';
import { v4 as uuid4 } from 'uuid';
import { Buffer } from 'buffer';
import { convertStringToByteArray } from '../../hooks/convert';
import { useTerminalConfigContext } from '../../context/TerminalOptionsContext';
import { EvilIcons } from '@expo/vector-icons';

// Terminal UUIDs
const DATASTREAMSERVER_SERV_UUID = 'F000C0C0-0451-4000-B000-000000000000';
const DATASTREAMSERVER_DATAIN_UUID = 'F000C0C1-0451-4000-B000-000000000000';
const DATASTREAMSERVER_DATAOUT_UUID = 'F000C0C2-0451-4000-B000-000000000000';

const TerminalItemSeparator = () => <View style={{ opacity: 0, paddingBottom: 5 }} />;

const TerminalServiceModel: React.FC<{ peripheralId: string }> = ({ peripheralId }) => {
  const BleManagerModule = NativeModules.BleManager;
  const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
  const { terminalConfig: config } = useTerminalConfigContext();

  const [terminalMessages, setTerminalMessages] = useState<
    { message: string; id: string; date: string; length: number; received: boolean }[]
  >([]);

  const terminalInputRef = useRef<TextInput | null>(null);
  const [terminalInput, setTerminalInput] = useState<string>('');

  const continuousNotifications = useRef(config.continuousNotifications);
  const lastReceivedMessageId = useRef<string | null>(null);

  const flashListRef = useRef(null);
  const insets = useSafeAreaInsets();

  // Focus input on mount
  useEffect(() => {
    if (terminalInputRef.current) terminalInputRef.current.focus();
  }, []);

  // Update continuousNotifications ref
  useEffect(() => {
    continuousNotifications.current = config.continuousNotifications;
  }, [config.continuousNotifications]);

  // Keyboard listeners
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {

      if (flashListRef.current) {
        // delay scroll slightly to allow layout
        setTimeout(() => {
          try {
            flashListRef.current?.scrollToEnd({ animated: true });
          } catch (err) {
            console.warn('scrollToEnd failed after keyboard:', err);
          }
        }, 200); // 150-250ms is usually safe
      }
    });


    return () => {
      showSub.remove();
    };
  }, []);

  // Submit input
  const onSubmit = () => {
    lastReceivedMessageId.current = null;

    const message = '> ' + terminalInput;
    setTerminalMessages((prev) => [
      ...prev,
      {
        id: uuid4(),
        message,
        date: new Date().toTimeString().split(' ')[0],
        length: terminalInput.length,
        received: false,
      },
    ]);

    const writeByteArray = convertStringToByteArray(terminalInput);
    const writeBytes = Array.from(writeByteArray);

    BleManager.write(peripheralId, DATASTREAMSERVER_SERV_UUID, DATASTREAMSERVER_DATAIN_UUID, writeBytes, writeBytes.length)
      .then(() => console.log('Write success'))
      .catch((error) => console.error('Write error:', error));

    setTerminalInput('');
  };

  // BLE Notifications
  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(async () => {
        try {
          await BleManager.startNotification(peripheralId, DATASTREAMSERVER_SERV_UUID, DATASTREAMSERVER_DATAOUT_UUID);
          console.log('Notifications enabled');
          bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', handleNotifications);
        } catch (error) {
          console.error('Notification setup failed:', error);
        }
      });

      return () => {
        task.cancel();
        bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');
        BleManager.stopNotification(peripheralId, DATASTREAMSERVER_SERV_UUID, DATASTREAMSERVER_DATAOUT_UUID);
      };
    }, [peripheralId])
  );

  const handleNotifications = ({ value }: { value: number[] }) => {
    const buf = Buffer.from(value);
    const len = buf.length;
    const text = buf.toString('utf8');

    if (continuousNotifications.current && lastReceivedMessageId.current !== null) {
      setTerminalMessages((prev) => {
        const index = prev.findIndex((msg) => msg.id === lastReceivedMessageId.current);
        if (index === -1) return prev;

        const updated = [...prev];
        const lastMsg = updated[index];

        updated[index] = {
          ...lastMsg,
          message: lastMsg.message + text,
          date: new Date().toTimeString().split(' ')[0],
          length: lastMsg.length + len,
        };
        return updated;
      });
    } else {
      const newId = uuid4();
      lastReceivedMessageId.current = newId;

      setTerminalMessages((prev) => [
        ...prev,
        {
          id: newId,
          message: '< ' + text,
          date: new Date().toTimeString().split(' ')[0],
          length: len,
          received: true,
        },
      ]);
    }
  };

  const handleContentSizeChange = () => {
    if (flashListRef.current) {
      try {
        flashListRef.current.scrollToEnd({ animated: true });
      } catch (e) {
        console.warn('scrollToEnd failed:', e);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.bottom}
    >
      {/* Terminal messages */}
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <FlashList
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          data={terminalMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TerminalRenderItem message={item.message} length={item.length} date={item.date} received={item.received} />
          )}
          ItemSeparatorComponent={TerminalItemSeparator}
          estimatedItemSize={100}
          ref={flashListRef}
          onContentSizeChange={handleContentSizeChange}
          contentContainerStyle={{}}
          keyboardShouldPersistTaps="handled"
        />
      </View>

      {/* Input */}
      <View style={styles.inputContainer}>
        <Input
          ref={terminalInputRef}
          autoCapitalize="none"
          onSubmitEditing={onSubmit}
          blurOnSubmit={false}
          value={terminalInput}
          onChangeText={setTerminalInput}
          inputStyle={{ color: 'white' }}
          leftIcon={<EvilIcons name="chevron-right" size={40} color="white" />}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  inputContainer: {
    height: 60,
    flexShrink: 0,
    backgroundColor: 'black',
    justifyContent: 'center',
    marginBottom: 35
  },
});

export default TerminalServiceModel;
