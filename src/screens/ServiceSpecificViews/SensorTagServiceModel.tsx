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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from '../../components/Themed';
import { InteractionManager, NativeEventEmitter, NativeModules, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MovementSensorState, SensorTagServiceModelScreenProps } from '../../../types';
import { Buffer } from 'buffer';
import { ScrollView } from 'react-native-gesture-handler';
import { Icon } from '@rneui/themed';
import Colors from '../../constants/Colors';
import Spacing from '../../components/Spacing';
import useColorScheme from '../../hooks/useColorScheme';
import {
  BAROMETRIC_SENSOR,
  CONNECTION_CONTROL_SERVICE,
  HUMIDITY_SENSOR,
  IR_TEMPERATURE_SENSOR,
  MOVEMENT_SENSOR,
  OPTICAL_SENSOR,
  SIMPLE_KEYS_SERVICE,
} from '../../constants/SensorTag';
import {
  BarometricSensor,
  BatteryLevelService,
  HumiditySensor,
  IRTemperatureSensor,
  MovementSensor,
  OpticalSensor,
  SimpleKeysService,
} from '../../components/SensorViews';
import IOService from '../../components/SensorViews/IOService';
import ConnectionControlService from '../../components/SensorViews/ConnectionControlService';
import { serviceNameToIcon } from '../../hooks/uuidToName';

interface Props extends SensorTagServiceModelScreenProps { }

const SensorTagServiceModel: React.FC<Props> = ({ route }) => {
  let peripheralId = route.params.peripheralId;
  let theme = useColorScheme();
  let serviceName = route.params.serviceName;

  const BleManagerModule = NativeModules.BleManager;
  const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

  //IR Temperature Sensor
  const [irTemperatureData, setIRTemperatureData] = useState<{ obj: number[]; amb: number[] }>({
    obj: [0],
    amb: [0],
  });

  //Light sensor service
  const [opticalSensorData, setOpticalSensorData] = useState<number[]>([0]);

  //Humidity service
  const [humidityData, setHumidityData] = useState<number[]>([0]);

  //Barometer Service
  const [barometerData, setBarometerData] = useState<number[]>([0]);

  //Simple keys service
  let keysInterval = useRef<any>(null);
  const [enableKeysNotif, setEnableKeysNotif] = useState<boolean>(false);
  const [ky, setKy] = useState<{ left: number[]; right: number[]; zero: number[] }>({
    left: [0],
    right: [0],
    zero: [0],
  });

  //Temperature
  const [temperatureData, setTemperature] = useState<number[]>([0]);

  //Movement sensor
  const [movementData, setMovementData] = useState<MovementSensorState>({
    acc: [{ x: 0, y: 0, z: 0 }],
    gyro: [{ x: 0, y: 0, z: 0 }],
    mag: [{ x: 0, y: 0, z: 0 }],
  });

  let initialFocus = useRef<boolean>(true);
  let [icon, setIcon] = useState<{ type: 'font-awesome' | 'svg' | 'font-awesome-5'; iconName: string } | undefined>(undefined)

  useEffect(() => {
    const updateIcon = async (serviceName: string) => {
      if (serviceName) {
        let updatedIcon = await serviceNameToIcon(serviceName)
        setIcon(updatedIcon)
      }
    }
    updateIcon(serviceName)
  }, [route.params.serviceName]);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        if (initialFocus.current) {
          console.log('initial focuse');
          initialFocus.current = false;
        } else {
          console.log('refocuse');
        }

        console.log('SensorTagServiceModel: addListener')
        bleManagerEmitter.addListener(
          'BleManagerDidUpdateValueForCharacteristic',
          ({
            value,
            peripheral,
            characteristic,
            service,
          }: {
            value: any;
            peripheral: string;
            characteristic: string;
            service: string;
          }) => {
            //All calculations from https://usermanual.wiki/Document/CC265020SensorTag20Users20Guide2020Texas20Instruments20Wiki.2070227354.pdf
            let bytes = Buffer.from(value);

            let lowerCasedCharacteristic = characteristic.toLocaleLowerCase();

            if (lowerCasedCharacteristic == OPTICAL_SENSOR.data) {
              let bytesBuffer = bytes.readUInt16LE();

              let m = bytesBuffer & 0xfff;
              let e = (bytesBuffer & 0xf000) >> 12;

              let opticalResult = m * (0.01 * Math.pow(2.0, e));

              setOpticalSensorData((prev) => [...prev, opticalResult]);
            } else if (lowerCasedCharacteristic == HUMIDITY_SENSOR.data) {
              let hum = Number(((bytes[0] + (bytes[1] << 8)) / 65536) * 100);
              setHumidityData((prev) => [...prev, hum]);

              let temp = (bytes.readUInt16LE() / 65536) * 165 - 40;
              setTemperature((prev) => [...prev, temp]);
            } else if (lowerCasedCharacteristic == BAROMETRIC_SENSOR.data) {
              let press = (bytes[3] + (bytes[4] << 8) + (bytes[5] << 16)) / 100;
              setBarometerData((prev) => [...prev, press]);
            } else if (lowerCasedCharacteristic == SIMPLE_KEYS_SERVICE.data) {
              let key = bytes.readUIntBE(0, 1);

              switch (key) {
                //Keys released
                case 0: {
                  setKy((prev) => ({ ...prev, left: [...prev.left, 0], right: [...prev.right, 0] }));
                  break;
                }
                //Both keys pressed
                case 3: {
                  setKy((prev) => ({ ...prev, left: [...prev.left, 1], right: [...prev.right, 1] }));
                  break;
                }
                //Left key pressed
                case 1: {
                  setKy((prev) => ({ ...prev, left: [...prev.left, 1], right: [...prev.right] }));
                  break;
                }
                //Right key pressed
                case 2: {
                  setKy((prev) => ({ ...prev, left: [...prev.left], right: [...prev.right, 1] }));
                  break;
                }
                default: {
                  setKy((prev) => ({ ...prev, left: [...prev.left, 0], right: [...prev.right, 0] }));
                  break;
                }
              }
            } else if (lowerCasedCharacteristic == MOVEMENT_SENSOR.data.toLocaleLowerCase()) {
              //Gyro
              let gyroX = ((bytes[0] + (bytes[1] << 8)) * 1.0) / (65536 / 500);
              let gyroY = ((bytes[2] + (bytes[3] << 8)) * 1.0) / (65536 / 500);
              let gyroZ = ((bytes[4] + (bytes[5] << 8)) * 1.0) / (65536 / 500);

              //Acc
              let accX = ((bytes[6] + (bytes[7] << 8)) * 1.0) / (32768 / 2);
              let accY = ((bytes[8] + (bytes[9] << 8)) * 1.0) / (32768 / 2);
              let accZ = ((bytes[10] + (bytes[11] << 8)) * 1.0) / (32768 / 2);

              //Mag
              let magX = 1.0 * (bytes[12] + (bytes[13] << 8));
              let magY = 1.0 * (bytes[14] + (bytes[15] << 8));
              let magZ = 1.0 * (bytes[16] + (bytes[17] << 8));

              setMovementData((prev) => ({
                acc: [...prev.acc, { x: accX, y: accY, z: accZ }],
                gyro: [...prev.gyro, { x: gyroX, y: gyroY, z: gyroZ }],
                mag: [...prev.mag, { x: magX, y: magY, z: magZ }],
              }));
            } else if (lowerCasedCharacteristic == IR_TEMPERATURE_SENSOR.data) {
              const SCALE_LSB = 0.03125;
              let rawObjectTemp = bytes[0] + (bytes[1] << 8);
              let rawAmbienceTemp = bytes[2] + (bytes[3] << 8);

              let objectTemp = (rawObjectTemp >> 2) * SCALE_LSB;
              let ambienceTemp = (rawAmbienceTemp >> 2) * SCALE_LSB;

              setIRTemperatureData((prev) => ({
                obj: [...prev.obj, objectTemp],
                amb: [...prev.amb, ambienceTemp],
              }));
            } else if (lowerCasedCharacteristic == CONNECTION_CONTROL_SERVICE.notification) {
              console.log('Connection Control Service: Values updated.');
            }
          }
        );
      })

      return () => {
        console.log('SensorTagServiceModel: removeAllListeners')
        bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');
        clearInterval(keysInterval.current);
        keysInterval.current = null;
      };
    }, [])
  );

  // useEffect(() => {
  //   console.log('SensorTagServiceModel: addListener')
  //   bleManagerEmitter.addListener(
  //     'BleManagerDidUpdateValueForCharacteristic',
  //     ({
  //       value,
  //       peripheral,
  //       characteristic,
  //       service,
  //     }: {
  //       value: any;
  //       peripheral: string;
  //       characteristic: string;
  //       service: string;
  //     }) => {
  //       //All calculations from https://usermanual.wiki/Document/CC265020SensorTag20Users20Guide2020Texas20Instruments20Wiki.2070227354.pdf
  //       let bytes = Buffer.from(value);

  //       let lowerCasedCharacteristic = characteristic.toLocaleLowerCase();

  //       if (lowerCasedCharacteristic == OPTICAL_SENSOR.data) {
  //         let bytesBuffer = bytes.readUInt16LE();

  //         let m = bytesBuffer & 0xfff;
  //         let e = (bytesBuffer & 0xf000) >> 12;

  //         let opticalResult = m * (0.01 * Math.pow(2.0, e));

  //         setOpticalSensorData((prev) => [...prev, opticalResult]);
  //       } else if (lowerCasedCharacteristic == HUMIDITY_SENSOR.data) {
  //         let hum = Number(((bytes[0] + (bytes[1] << 8)) / 65536) * 100);
  //         setHumidityData((prev) => [...prev, hum]);

  //         let temp = (bytes.readUInt16LE() / 65536) * 165 - 40;
  //         setTemperature((prev) => [...prev, temp]);
  //       } else if (lowerCasedCharacteristic == BAROMETRIC_SENSOR.data) {
  //         let press = (bytes[3] + (bytes[4] << 8) + (bytes[5] << 16)) / 100;
  //         setBarometerData((prev) => [...prev, press]);
  //       } else if (lowerCasedCharacteristic == SIMPLE_KEYS_SERVICE.data) {
  //         let key = bytes.readUIntBE(0, 1);

  //         switch (key) {
  //           //Keys released
  //           case 0: {
  //             setKy((prev) => ({ ...prev, left: [...prev.left, 0], right: [...prev.right, 0] }));
  //             break;
  //           }
  //           //Both keys pressed
  //           case 3: {
  //             setKy((prev) => ({ ...prev, left: [...prev.left, 1], right: [...prev.right, 1] }));
  //             break;
  //           }
  //           //Left key pressed
  //           case 1: {
  //             setKy((prev) => ({ ...prev, left: [...prev.left, 1], right: [...prev.right] }));
  //             break;
  //           }
  //           //Right key pressed
  //           case 2: {
  //             setKy((prev) => ({ ...prev, left: [...prev.left], right: [...prev.right, 1] }));
  //             break;
  //           }
  //           default: {
  //             setKy((prev) => ({ ...prev, left: [...prev.left, 0], right: [...prev.right, 0] }));
  //             break;
  //           }
  //         }
  //       } else if (lowerCasedCharacteristic == MOVEMENT_SENSOR.data.toLocaleLowerCase()) {
  //         //Gyro
  //         let gyroX = ((bytes[0] + (bytes[1] << 8)) * 1.0) / (65536 / 500);
  //         let gyroY = ((bytes[2] + (bytes[3] << 8)) * 1.0) / (65536 / 500);
  //         let gyroZ = ((bytes[4] + (bytes[5] << 8)) * 1.0) / (65536 / 500);

  //         //Acc
  //         let accX = ((bytes[6] + (bytes[7] << 8)) * 1.0) / (32768 / 2);
  //         let accY = ((bytes[8] + (bytes[9] << 8)) * 1.0) / (32768 / 2);
  //         let accZ = ((bytes[10] + (bytes[11] << 8)) * 1.0) / (32768 / 2);

  //         //Mag
  //         let magX = 1.0 * (bytes[12] + (bytes[13] << 8));
  //         let magY = 1.0 * (bytes[14] + (bytes[15] << 8));
  //         let magZ = 1.0 * (bytes[16] + (bytes[17] << 8));

  //         setMovementData((prev) => ({
  //           acc: [...prev.acc, { x: accX, y: accY, z: accZ }],
  //           gyro: [...prev.gyro, { x: gyroX, y: gyroY, z: gyroZ }],
  //           mag: [...prev.mag, { x: magX, y: magY, z: magZ }],
  //         }));
  //       } else if (lowerCasedCharacteristic == IR_TEMPERATURE_SENSOR.data) {
  //         const SCALE_LSB = 0.03125;
  //         let rawObjectTemp = bytes[0] + (bytes[1] << 8);
  //         let rawAmbienceTemp = bytes[2] + (bytes[3] << 8);

  //         let objectTemp = (rawObjectTemp >> 2) * SCALE_LSB;
  //         let ambienceTemp = (rawAmbienceTemp >> 2) * SCALE_LSB;

  //         setIRTemperatureData((prev) => ({
  //           obj: [...prev.obj, objectTemp],
  //           amb: [...prev.amb, ambienceTemp],
  //         }));
  //       } else if (lowerCasedCharacteristic == CONNECTION_CONTROL_SERVICE.notification) {
  //         console.log('Connection Control Service: Values updated.');
  //       }
  //     }
  //   );

  //   return () => {
  //     console.log('SensorTagServiceModel: removeAllListeners')
  //     bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');
  //     clearInterval(keysInterval.current);
  //     keysInterval.current = null;
  //   };
  // }, []);

  let memoMovement = useMemo(() => {
    return movementData;
  }, [movementData]);

  useEffect(() => {
    if (enableKeysNotif) {
      setKy({ left: [0], right: [0], zero: [0] });
      keysInterval.current = setInterval(() => {
        setKy((prev) => ({
          ...prev,
          zero: [...prev.zero, 0],
          left: [...prev.left, prev.left[prev.left.length - 1]],
          right: [...prev.right, prev.right[prev.right.length - 1]],
        }));
      }, 1000);
    } else {
      clearInterval(keysInterval.current);
      keysInterval.current = null;
    }
  }, [enableKeysNotif]);

  const getRelevantParameters = (serviceName: string) => {
    if (serviceName.toLowerCase().includes("temp")) {
      return (
        <IRTemperatureSensor
          peripheralId={peripheralId}
          irTemperatureData={irTemperatureData} />
      )

    }
    else if (serviceName.toLowerCase().includes("humidity")) {
      return (
        <HumiditySensor
          peripheralId={peripheralId}
          humidityData={humidityData}
          temperatureData={temperatureData}
        />)
    }
    else if (serviceName.toLowerCase().includes("baromet")) {
      return (
        <BarometricSensor
          peripheralId={peripheralId}
          barometerData={barometerData} />
      )
    }
    else if (serviceName.toLowerCase().includes("optical")) {
      return (
        <OpticalSensor
          peripheralId={peripheralId}
          opticalSensorData={opticalSensorData} />
      )
    }
    else if (serviceName.toLowerCase().includes("movement")) {
      return (
        <MovementSensor
          peripheralId={peripheralId}
          movementData={memoMovement} />
      )
    }
    else if (serviceName.toLowerCase().includes("simple key")) {
      return (
        <SimpleKeysService
          keys={ky}
          peripheralId={peripheralId}
          enableKeysNotif={enableKeysNotif}
          setEnableKeysNotif={setEnableKeysNotif}
        />
      )
    }
    else if (serviceName.toLowerCase().includes("battery")) {
      return (
        <BatteryLevelService peripheralId={peripheralId} />
      )
    }
    else if (serviceName.toLowerCase().includes("i/o")) {
      return (
        <IOService peripheralId={peripheralId} />)
    }
    else if (serviceName.toLowerCase().includes("control")) {
      return (
        <ConnectionControlService peripheralId={peripheralId} />
      )
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <View
        style={[
          styles.container,
          { backgroundColor: Colors.lightGray, flexDirection: 'row', marginBottom: 2 },
        ]}
      >
        <View
          style={[
            styles.deviceInfoIconContainer,
            {
              backgroundColor: Colors[theme].background,
            },
          ]}
        >
          <Icon name={icon ? icon?.iconName : "devices"} type={icon ? icon?.type : "fontawesome"} size={32} color={Colors[theme].text} />
        </View>
        <Spacing spaceT={10} />
        <Text style={[styles.deviceName]}>Sensor Tag</Text>
      </View>
      <ScrollView>
        {getRelevantParameters(serviceName)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingLeft: 30,
    paddingVertical: 15,
    flexDirection: 'row',
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowOffset: {
      height: 1,
      width: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 5,
  },
  deviceName: {
    width: 200,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 0,
    fontSize: 20
  },
  deviceInfoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Colors.gray,
    borderWidth: 2,
    marginVertical: 0,
  },
});

export default SensorTagServiceModel;
