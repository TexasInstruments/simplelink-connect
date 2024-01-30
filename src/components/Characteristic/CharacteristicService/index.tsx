/*
 * Copyright (c) 2023, Texas Instruments Incorporated
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * *  Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *
 * *  Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * *  Neither the name of Texas Instruments Incorporated nor the names of
 *    its contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import {
  View,
  NativeEventEmitter,
  NativeModules,
  NativeSyntheticEvent,
  Switch,
  TextInputSubmitEditingEventData,
  StyleSheet,
  InteractionManager
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text } from '../../Themed';
import React, { useCallback, useEffect, useState, useRef, Dispatch, SetStateAction } from 'react';
import Layout from '../../../constants/Layout';
import BleManager from 'react-native-ble-manager';
import Colors from '../../../constants/Colors';
import { Input } from '@rneui/themed';
import { TouchableOpacity } from '../../Themed';
import { Buffer } from 'buffer';
import { uuidToCharacteristicName } from '../../../hooks/uuidToName';
import ServiceResponse from './ServiceResponse';
import * as encoding from 'text-encoding';
import { encode as btoa, decode } from 'base-64';
import { useCharacteristicContext } from '../../../context/CharacteristicContext';
interface Props {
  peripheralId: string;
  serviceUuid: string;
  serviceName: string;
  char: BleManager.Characteristic;
  selectedFormat: string;
  setSelectedFormat: Dispatch<SetStateAction<string>>;
}

type Response = {
  data: string;
  time: string;
}

const CharacteristicService: React.FC<Props> = ({
  peripheralId,
  serviceUuid: serviceUuid,
  serviceName: serviceName,
  char,
  selectedFormat,
  setSelectedFormat
}) => {
  console.log('CharacteristicService: serviceUuid', serviceUuid);
  console.log('CharacteristicService: char.properties', char.properties);

  const { characteristicData, loading } = useCharacteristicContext();


  let checkNotify = Object.values(char.properties).indexOf('Notify') > -1;
  let checkWrite = Object.values(char.properties).indexOf('Write') > -1
  let checkWriteWithoutRsp = Object.values(char.properties).indexOf('WriteWithoutResponse') > -1;
  let checkRead = Object.values(char.properties).indexOf('Read') > -1;

  let propertiesString = ''
  if (checkRead) { propertiesString += 'Read ' }
  if (checkWrite) { propertiesString += 'Write ' }
  if (checkWriteWithoutRsp) { propertiesString += 'WriteNoRsp ' }
  if (checkNotify) { propertiesString += 'Notify' }

  const [charName, setCharName] = useState<string>(() => {
    if (char.characteristic.length == 4) {
      return '0x' + char.characteristic.toUpperCase();
    } else {
      return char.characteristic;
    }
  });

  const [writeInput, setWriteInput] = useState<string>('');
  const [writeWithResponseSwitch, setWriteWithResponseSwitch] = useState<boolean>(false);

  const [notificationSwitch, setNotificationSwitch] = useState<boolean>(false);

  const BleManagerModule = NativeModules.BleManager;
  const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

  const [readResponse, setReadResponse] = useState<Response[]>([]);
  const [writeResponse, setWriteResponse] = useState<Response[]>([]);
  const [notifyResponse, setNotifyResponse] = useState<Response[]>([]);

  const writeTextInputRef = useRef({})

  let initialFocus = useRef<boolean>(true);

  console.log(char.properties);

  let charUuidString = char.characteristic;
  if (charUuidString.length === 4) {
    charUuidString = '0x' + charUuidString.toUpperCase();
  }

  let charNameSize = 20;
  /* is it a 64B UUID */
  if (char.characteristic.length == 36) {
    charNameSize = 15;
  }

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        if (initialFocus.current) {
          console.log('initial focuse');
          initialFocus.current = false;
        } else {
          console.log('refocuse');
        }

        console.log('CharacteristicService: addListener')
        bleManagerEmitter.addListener(
          'BleManagerDidUpdateValueForCharacteristic',
          ({ value, peripheral, characteristic, service }) => {
            console.log('notification: ', value);
            let hexString = ''
            if (selectedFormat === 'UTF-8') {
              hexString = Buffer.from(value).toString('utf8');
              console.log('notification: converted to UTF-8 ', hexString);
            }
            else if (selectedFormat === 'Dec') {
              hexString = value;
              console.log('notification: converted to Dec ', hexString);
            }
            else { // must be hex
              hexString = Buffer.from(value).toString('hex');
              console.log('notification: converted to Hex ', hexString);
            }

            /* Check include string and not dirrect match to ork around issue 
               switching between SimplePeripheral and PersistantApp */
            if (characteristic.toLowerCase().includes(char.characteristic.toLowerCase())) {
              setNotifyResponse((prev) => [
                { data: hexString, time: new Date().toTimeString().split(' ')[0] },
                ...prev.slice(0, 4),
              ]);
            }
          }
        );
      });

      return () => {
        task.cancel();
        console.log('CharacteristicService: removeAllListeners')
        bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');
        if (Object.values(char.properties).indexOf('Notify') > -1) {
          //Cleaning up notification
          BleManager.stopNotification(peripheralId, serviceUuid, char.characteristic);
        }
      }
    }, [, selectedFormat])
  );

  useEffect(() => {
    console.log('selectedFormat ', selectedFormat)
  }, [selectedFormat]);

  useEffect(() => {
    let checkIfCharacteristicNameAvailable = async () => {
      try {
        let check = uuidToCharacteristicName(char.characteristic, characteristicData);
        if (check !== undefined) {
          setCharName(check);
        }
      } catch (error) { }
    };

    checkIfCharacteristicNameAvailable();

    return () => {
      // console.log('remove all listeners');
      // bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');
      // if (Object.values(char.properties).indexOf('Notify') > -1) {
      //   //Cleaning up notification
      //   BleManager.stopNotification(peripheralId, serviceUuid, char.characteristic);
      // }
    };
  }, [notificationSwitch, selectedFormat]);

  useEffect(() => {
    if (Object.values(char.properties).indexOf('Notify') > -1) {
      if (notificationSwitch) {
        console.log('enabling notifications');
        // To enable BleManagerDidUpdateValueForCharacteristic listener
        BleManager.startNotification(peripheralId, serviceUuid, char.characteristic);
      } else {
        console.log('disabling notifications');
        BleManager.stopNotification(peripheralId, serviceUuid, char.characteristic);
      }
    } else {
      console.log('Notify not supported by this characteristic');
    }
  }, [notificationSwitch, selectedFormat]);

  const [writeBytes, setWriteBytes] = useState<Uint8Array | string>();

  const handleWrite = (hexString: string) => {
    if (hexString !== '') {
      setWriteBytes(hexString);

      setWriteWithResponseSwitch(true);
    } else {
      setWriteWithResponseSwitch(false);
    }
    setWriteInput(hexString);
  };

  const handleWriteSubmit = useCallback(
    (e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {

      if ((!checkWrite) && (checkWriteWithoutRsp)) {
        console.log('handleWriteSubmit: error write and writeWithoutRsp not supported')
        return;
      }

      let writeFunction = checkWrite
        ? BleManager.write
        : BleManager.writeWithoutResponse;

      //let properteisString = writeWithResponseSwitch ? 'Write' : 'WriteWithoutResponse';

      let hexString = e.nativeEvent.text;

      let writeByteArray = Uint8Array.from([]);

      console.log('handleWriteSubmit: selectedFormat ' + selectedFormat);

      if (selectedFormat === 'UTF-8') {
        console.log('handleWriteSubmit: converting to UTF-8');

        let utf8Encode = new encoding.TextEncoder();
        writeByteArray = utf8Encode.encode(hexString);
      }
      else if (selectedFormat === 'Dec') {
        hexString = hexString.toLowerCase();
        // check input it Dec
        if (hexString.match(/^[0-9]+$/) === null) {
          alert('Value enterd is not Decimal format')
          return;
        }
        console.log('handleWriteSubmit: converting to Dec');
        writeByteArray = Uint8Array.from(
          //@ts-ignore
          hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 10))
        );
      }
      else { // must be hex
        hexString = hexString.toLowerCase();
        // check input it Hex
        if (hexString.match(/^[0-9a-f]+$/) === null) {
          alert('Value enterd is not Hex format')
          return;
        }
        writeByteArray = Uint8Array.from(
          //@ts-ignore
          hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
        );
      }

      let writeBytes = Array.from(writeByteArray);

      console.log('handleWriteSubmit[' + writeBytes.length + ']: ' + writeBytes);

      writeFunction(peripheralId, serviceUuid, char.characteristic, writeBytes, writeBytes.length)
        .then(() => {
          // Success code
          console.log('Writen: ' + writeByteArray + ' to ' + char.characteristic);

          setWriteInput('');

          let hexString = ''
          if (selectedFormat === 'UTF-8') {
            hexString = Buffer.from(writeByteArray).toString('utf8');
          }
          else if (selectedFormat === 'Dec') {
            hexString = writeByteArray.map((byte) => parseInt(byte.toString(10))).toString()
          }
          else {
            hexString = Buffer.from(writeByteArray).toString('hex');
          }

          setWriteResponse((prev) => [
            { data: hexString, time: new Date().toTimeString().split(' ')[0] },
            ...prev.slice(0, 4),
          ]);
        })
        .catch((error) => {
          // Failure code
          console.log('write error: ', error);
        });
    },
    [writeWithResponseSwitch, selectedFormat]
  );

  const handleWriteWithResponseSwitch = useCallback(() => {
    setWriteWithResponseSwitch((prev) => !prev);
    console.log('handleWriteSwitch');
  }, []);

  const handleWriteButton = useCallback(() => {
    writeTextInputRef[char.characteristic].focus();
  }, []);

  const handleReadButton = useCallback(() => {
    console.log('handleReadButton selectedFormat ', selectedFormat)
    if (Object.values(char.properties).indexOf('Read') > -1) {
      BleManager.read(peripheralId, serviceUuid, char.characteristic)
        .then((data) => {
          // Success code
          let hexString = ''

          if (selectedFormat == 'UTF-8') {
            hexString = Buffer.from(data).toString('utf8');
            console.log('handleReadButton: converted to UTF-8 ', hexString);
          }
          else if (selectedFormat === 'Dec') {
            hexString = data;
            console.log('handleReadButton: converted to Dec ', hexString);
          }
          else { // must be hex
            hexString = Buffer.from(data).toString('hex');
            console.log('handleReadButton: converted to Hex ', hexString);
          }

          console.log('readResponse.length: ' + readResponse.length);
          setReadResponse((prev) => [
            { data: hexString, time: new Date().toTimeString().split(' ')[0] },
            ...prev.slice(0, 4),
          ]);
        })
        .catch((error) => {
          // Failure code
          console.log('read error: ', error);
        });
    } else {
      console.log('Read not supported by this characteristic');
    }
  }, [selectedFormat]);

  const handleNotificationSwitch = useCallback(async () => {
    setNotificationSwitch((prev) => !prev);
  }, [notificationSwitch]);

  return (
    <View>
      <View style={[styles.charContainer]}>
        <Text style={{ fontWeight: 'bold', fontSize: charNameSize }}>{charName}</Text>
        <View
          style={[
            {
              alignItems: 'flex-start',
              paddingTop: 10,
              paddingLeft: 10,
              flexDirection: 'column',
            },
          ]}
        >
          {(charName != charUuidString) &&
            <Text style={[{}]}>UUID: {charUuidString}</Text>
          }
          <Text style={[{ fontWeight: '200', paddingTop: 5 }]}>Properties: {propertiesString}</Text>
        </View>
      </View>
      {(checkWrite || checkWriteWithoutRsp) && (
        <View style={{ ...Layout.separators }}>
          <View style={[styles.container]}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingBottom: 0,
              }}
            >
              <TouchableOpacity onPress={handleWriteButton} style={[styles.readWriteButton]}>
                <Text style={[{ fontWeight: 'bold' }]}>Write</Text>
              </TouchableOpacity>
              <Input
                ref={(input) => { writeTextInputRef[char.characteristic] = input; }}
                value={writeInput}
                containerStyle={{
                  display: 'flex',
                  flexDirection: 'row',
                  borderWidth: 0,
                  borderBottomWidth: 0,
                }}
                inputContainerStyle={{
                  borderWidth: 0,
                  borderBottomWidth: 0,
                }}
                inputStyle={[styles.inputStyles]}
                onChangeText={(text) => handleWrite(text)}
                onSubmitEditing={(e) => handleWriteSubmit(e)}
              />
            </View>
          </View>
          <View style={{ paddingLeft: 25, paddingBottom: 20 }}>
            <ServiceResponse responseArray={writeResponse} />
          </View>
        </View>
      )}
      {checkRead && (
        <View style={{ ...Layout.separators }}>
          <View style={[styles.container]}>
            <View>
              <View
                style={{
                  flexDirection: 'row',
                  flex: 1,
                  paddingBottom: 10,
                }}>
                <TouchableOpacity onPress={handleReadButton} style={[styles.readWriteButton]}>
                  <Text style={[{ fontWeight: 'bold' }]}>Read</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={{ paddingLeft: 25, paddingBottom: 20 }}>
            <ServiceResponse responseArray={readResponse} />
          </View>
        </View>
      )}
      {checkNotify && (
        <View>
          <View style={[styles.container]}>
            <View>
              <View style={{ alignContent: 'center', alignItems: 'center', flexDirection: 'row' }}>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={{ fontWeight: 'bold', paddingLeft: 12, paddingRight: 20 }}>Notifications</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 80, paddingRight: 'auto' }}>
                  <Text style={{ paddingRight: 10 }}>Enable</Text>
                  <Switch
                    value={notificationSwitch}
                    onChange={handleNotificationSwitch}
                  />
                </View>
              </View>
            </View>
          </View>
          <View style={{ paddingLeft: 25, paddingBottom: 20 }}>
            <ServiceResponse responseArray={notifyResponse} />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  charContainer: {
    paddingVertical: 15,
    paddingLeft: 20,
    marginHorizontal: 0,
    backgroundColor: Colors.lightGray,
  },
  container: {
    paddingTop: 10,
    marginLeft: 20,
    flexDirection: 'row'
  },
  characteristicUUIDWrapper: {
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  inputStyles: {
    borderWidth: 0,
    borderBottomWidth: 0,
    borderColor: 'black',
    paddingHorizontal: 10,
  },
  readWriteButton: {
    paddingVertical: 4,
    borderRadius: 5,
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: Colors.lightGray,
    borderWidth: 0,
    borderBottomWidth: 0,
  },
  writeWrapper: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
  },
});

export default CharacteristicService;
