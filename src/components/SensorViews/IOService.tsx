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

import { StyleSheet } from 'react-native';
import { Switch, View } from '../Themed';
import { IO_SERVICE } from '../../constants/SensorTag';
import SensorPresentation from './SensorPresentation';
import { Text } from '@rneui/themed';
import { useEffect, useState } from 'react';
import bleManager from 'react-native-ble-manager';
import { getBytes } from '../../hooks/convert';

interface Props {
  peripheralId: string;
}

const IOService: React.FC<Props> = ({ peripheralId }) => {
  const [ioServiceData, setIOServiceData] = useState<{
    ledOn: number;
    buzzer: number;
  }>({ buzzer: 0, ledOn: 0 });

  const toggleLedOn = (value: boolean) => {
    console.debug('I/O toggle ledOn LED');

    setIOServiceData((prev) => ({ ...prev, ledOn: Number(value) }));

    let writeByteArray = Uint8Array.from([(Number(value ? '1' : '0') + Number((ioServiceData.buzzer << 2)))])
    let writeBytes = Array.from(writeByteArray);

    bleManager
      .write(peripheralId, IO_SERVICE.service, IO_SERVICE.data, writeBytes, writeBytes.length)
      .then(() => {
        console.debug('I/O toggle ledOn LED');
      })
      .catch((error) => {
        console.debug('I/O service write error: ', error);
      });
  };

  const toggleBuzzer = (value: boolean) => {
    setIOServiceData((prev) => ({ ...prev, buzzer: Number(value) }));

    let writeByteArray = Uint8Array.from([Number(ioServiceData.ledOn + (Number(value ? '4' : '0')))])
    let writeBytes = Array.from(writeByteArray);

    bleManager
      .write(peripheralId, IO_SERVICE.service, IO_SERVICE.data, writeBytes, writeBytes.length)
      .then(() => {
        console.debug('I/O toggle buzzer');
      })
      .catch((error) => {
        console.debug('I/O service write error: ', error);
      });
  };

  useEffect(() => {
    console.debug('I/O service setting buzzer off');
    toggleBuzzer(false);
    //Set to remote mode to manualy control service
    let writeBytes = getBytes('1');
    bleManager
      .write(
        peripheralId,
        IO_SERVICE.service,
        IO_SERVICE.configuration,
        writeBytes,
        writeBytes.length
      )
      .then(() => {
        console.debug('I/O service remote mode...');
      })
      .catch((error) => {
        console.debug('I/O service write error: ', error);
      });
  }, []);

  return (
    <View style={{ display: 'flex', flexDirection: 'column' }}>
      <SensorPresentation name="I/O Service" uuid={IO_SERVICE.service} />
      <View style={styles.chartContainer}>
        <View style={styles.switchContainer}>
          <View style={styles.serviceContainer}>
            <Text style={styles.serviceName}>LED On</Text>
            <Switch style={styles.switch} value={(ioServiceData.ledOn != 0)} onValueChange={toggleLedOn} />
          </View>
          <View style={styles.serviceContainer}>
            <Text style={styles.serviceName}>Buzzer</Text>
            <Switch
              style={styles.switch}
              value={ioServiceData.buzzer != 0}
              onValueChange={toggleBuzzer}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const EnabledDot: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  return (
    <View
      style={{
        backgroundColor: enabled ? 'ledFlash' : 'ledOn',
        height: 20,
        width: 20,
        borderRadius: 10,
      }}
    ></View>
  );
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
  },
  chartContainer: {
    flexDirection: 'column',
    paddingVertical: 15,
  },
  switchContainer: {
    flexDirection: 'row',
    paddingHorizontal: '20%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  serviceName: {
    marginBottom: 10,
  },
  switch: {},
});

export default IOService;
