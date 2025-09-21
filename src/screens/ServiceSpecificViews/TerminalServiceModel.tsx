import {
  KeyboardAvoidingView,
  NativeEventEmitter,
  NativeModules,
  Platform,
  StyleSheet,
  TextInput,
  InteractionManager
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { View } from '../../components/Themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '@rneui/themed';
import { FlashList } from '@shopify/flash-list';
import BleManager from 'react-native-ble-manager';
import { Icon } from '@rneui/themed';
import TerminalRenderItem from '../../components/Terminal/TerminalMessage';
import { useEffect, useRef, useState, useCallback } from 'react';
import 'react-native-get-random-values';
import { v4 as uuid4 } from 'uuid';
import { Buffer } from 'buffer';
import { convertStringToByteArray } from '../../hooks/convert';
import { useTerminalConfigContext } from '../../context/TerminalOptionsContext';


//Terminal
const DATASTREAMSERVER_SERV_UUID = 'F000C0C0-0451-4000-B000-000000000000';

// Characteristic defines
const DATASTREAMSERVER_DATAIN_UUID = 'F000C0C1-0451-4000-B000-000000000000';
const DATASTREAMSERVER_DATAOUT_UUID = 'F000C0C2-0451-4000-B000-000000000000';

const TerminalItemSeparator = () => {
  return <View style={{ opacity: 0, paddingBottom: 5 }}></View>;
};

const TerminalServiceModel: React.FC<{ peripheralId: string }> = ({ peripheralId }) => {

  const BleManagerModule = NativeModules.BleManager;
  const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
  let { terminalConfig: config, } = useTerminalConfigContext();


  const [terminalMessages, setTerminalMessages] = useState<
    { message: string; id: string; date: string, length: number, received: boolean }[]
  >([]);

  let terminalInputRef = useRef<TextInput | null>(null);
  const [terminalInput, setTerminalInput] = useState<string>('');

  const continuousNotifications = useRef(config.continuousNotifications);
  const lastReceivedMessageId = useRef<string | null>(null);

  let insets = useSafeAreaInsets();

  const flashListRef = useRef(null);

  useEffect(() => {
    if (terminalInputRef.current) {
      terminalInputRef.current.focus();
    }

  }, []);

  useEffect(() => {
    continuousNotifications.current = config.continuousNotifications
  }, [config.continuousNotifications])

  const onSubmit = () => {
    // Reset so next notification starts a new received message
    lastReceivedMessageId.current = null;
    let message = '> ' + terminalInput
    setTerminalMessages((prev) => [
      ...prev,
      { id: uuid4(), message: message, date: new Date().toTimeString().split(' ')[0], length: terminalInput.length, received: false },
    ]);

    let writeByteArray = convertStringToByteArray(terminalInput);

    // @ts-ignore
    let writeBytes = Array.from(writeByteArray);
    BleManager.write(
      peripheralId,
      DATASTREAMSERVER_SERV_UUID,
      DATASTREAMSERVER_DATAIN_UUID,
      writeBytes,
      writeBytes.length
    )
      .then(() => {
        console.log('success');
      })
      .catch((error) => {
        console.log('Error', error);
      });
    setTerminalInput('');
  };

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(async () => {
        try {
          // await BleManager.retrieveServices(peripheralId);
          await BleManager.startNotification(
            peripheralId,
            DATASTREAMSERVER_SERV_UUID,
            DATASTREAMSERVER_DATAOUT_UUID
          );

          console.log('Notifications enabled');

          bleManagerEmitter.addListener(
            'BleManagerDidUpdateValueForCharacteristic',
            handleNotifications
          );
        } catch (error) {
          console.error(' Notification setup failed:', error);
        }
      });

      return () => {
        task.cancel();
        bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');

        BleManager.stopNotification(
          peripheralId,
          DATASTREAMSERVER_SERV_UUID,
          DATASTREAMSERVER_DATAOUT_UUID
        );
      };
    }, [peripheralId])
  );

  const handleNotifications = ({ value }) => {
    const buf = Buffer.from(value);
    const len = buf.length;
    const hexString = buf.toString('utf8');

    if (
      continuousNotifications.current &&
      lastReceivedMessageId.current !== null
    ) {
      // Concat to last received message
      setTerminalMessages((prev) => {
        const index = prev.findIndex(msg => msg.id === lastReceivedMessageId.current);
        if (index === -1) return prev;

        const updated = [...prev];
        const lastMsg = updated[index];

        updated[index] = {
          ...lastMsg,
          message: lastMsg.message + hexString,
          date: new Date().toTimeString().split(' ')[0],
          length: lastMsg.length + len,
        };

        return updated;
      });

    } else {
      // First received message after a write
      const newId = uuid4();
      lastReceivedMessageId.current = newId;

      setTerminalMessages((prev) => [
        ...prev,
        {
          id: newId,
          message: '< ' + hexString,
          date: new Date().toTimeString().split(' ')[0],
          length: len,
          received: true,
        },
      ]);
    }
  }

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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { paddingBottom: insets.bottom }]}
      keyboardVerticalOffset={150}
    >
      <View style={styles.terminalScreen}>
        <FlashList
          showsVerticalScrollIndicator={false}
          data={terminalMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <TerminalRenderItem message={item.message} length={item.length} date={item.date} received={item.received} />}
          ItemSeparatorComponent={TerminalItemSeparator}
          estimatedItemSize={100}
          ref={flashListRef}
          onContentSizeChange={handleContentSizeChange}
        />
      </View>
      <View style={[styles.terminalInput]}>
        <Input
          ref={terminalInputRef}
          autoCapitalize="none"
          onSubmitEditing={() => {
            onSubmit();
          }}
          blurOnSubmit={false}
          value={terminalInput}
          onChangeText={(text) => setTerminalInput(text)}
          inputStyle={{ color: 'white' }}
          leftIcon={<Icon name="chevron-right" type="evilicon" size={40} color={'white'} />}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flex: 1,
    backgroundColor: 'black',
  },
  terminalScreen: {
    height: '90%',
    color: 'white',
    backgroundColor: 'black',
  },
  terminalInput: {
    height: '10%',
    backgroundColor: 'black',
  },
});

export default TerminalServiceModel;
