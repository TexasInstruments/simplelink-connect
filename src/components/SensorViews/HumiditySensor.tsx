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

import { useEffect, useMemo, useState } from 'react';
import { Switch, View } from '../Themed';
import { Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import BleManager from 'react-native-ble-manager';
import { getBytes } from '../../hooks/convert';
import { HUMIDITY_SENSOR } from '../../constants/SensorTag';
import { chartConfig, chartStyles } from '../../constants/Charts';
import SensorPresentation from './SensorPresentation';
import { Text } from '@rneui/themed';
import Legend from './Legend';

interface Props {
  peripheralId: string;
  humidityData: number[];
  temperatureData: number[];
}

const HumiditySensor: React.FC<Props> = ({ peripheralId, humidityData, temperatureData }) => {
  const [enable, setEnable] = useState<boolean>(false);

  useEffect(() => {
    if (enable) {
      let writeBytes = getBytes('1');
      BleManager.startNotification(
        peripheralId,
        HUMIDITY_SENSOR.service,
        HUMIDITY_SENSOR.notification
      );

      console.debug('Writing Humidity sensor enabled');
      BleManager.write(
        peripheralId,
        HUMIDITY_SENSOR.service,
        HUMIDITY_SENSOR.configuration,
        writeBytes,
        writeBytes.length
      ).then(() => {
        console.debug('Humidity sensor enabled');
      });
    } else {
      BleManager.stopNotification(
        peripheralId,
        HUMIDITY_SENSOR.service,
        HUMIDITY_SENSOR.notification
      );

      console.debug('Writing Humidity sensor disabled');
      let writeBytes = getBytes('0');
      BleManager.write(
        peripheralId,
        HUMIDITY_SENSOR.service,
        HUMIDITY_SENSOR.configuration,
        writeBytes,
        writeBytes.length
      ).then(() => {
        console.debug('Humidity sensor disabled');
      });
    }
  }, [enable]);

  useEffect(() => {
    return () => {
      BleManager.stopNotification(
        peripheralId,
        HUMIDITY_SENSOR.service,
        HUMIDITY_SENSOR.notification
      );
      let writeBytes = getBytes('0');
      BleManager.write(
        peripheralId,
        HUMIDITY_SENSOR.service,
        HUMIDITY_SENSOR.configuration,
        writeBytes,
        writeBytes.length
      );
    };
  }, []);

  let lastHumValue = useMemo(() => {
    return humidityData[humidityData.length - 1].toFixed(2);
  }, [humidityData]);

  let lastTempValue = useMemo(() => {
    return temperatureData[temperatureData.length - 1].toFixed(2);
  }, [temperatureData]);

  return (
    <View style={styles.container}>
      <SensorPresentation name="Humidity" uuid={HUMIDITY_SENSOR.service} />
      <View style={styles.chartContainer}>
        <View style={styles.switchContainer}>
          <Text style={{ paddingRight: 10 }}>Enable</Text>
          <Switch value={enable} onValueChange={setEnable} />
        </View>
        <LineChart
          data={{
            datasets: [
              {
                data: humidityData,
                strokeWidth: 3,
                color: (opacity) => `rgba(255,0,0,${opacity})`,
              },
              {
                data: temperatureData,
                strokeWidth: 3,
                color: (opacity) => `rgba(0,255,0,${opacity})`,
              },
            ],
            labels: [],
            legend: [`Humidity`, `Temperature`],
          }}
          width={Dimensions.get('window').width}
          height={220}
          segments={10}
          chartConfig={chartConfig}
          style={chartStyles}
        />
        <Legend values={[`Humidity: ${lastHumValue}%RH`, `Temperature: ${lastTempValue}°C`]} />
      </View>
    </View>
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
  switchContainer: { flexDirection: 'row', paddingHorizontal: 25, alignItems: 'center' },
});

export default HumiditySensor;
