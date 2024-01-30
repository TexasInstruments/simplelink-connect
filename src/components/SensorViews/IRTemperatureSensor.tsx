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

import { Dimensions, StyleSheet } from 'react-native';
import { Switch, View } from '../Themed';
import SensorPresentation from './SensorPresentation';
import { IR_TEMPERATURE_SENSOR } from '../../constants/SensorTag';
import { Text } from '@rneui/themed';
import { useEffect, useMemo, useState } from 'react';
import { LineChart } from 'react-native-chart-kit';
import { chartConfig, chartStyles } from '../../constants/Charts';
import bleManager from 'react-native-ble-manager';
import { getBytes } from '../../hooks/convert';
import Legend from './Legend';

interface Props {
  irTemperatureData: { obj: number[]; amb: number[] };
  peripheralId: string;
}

const IRTemperatureSensor: React.FC<Props> = ({ irTemperatureData, peripheralId }) => {
  const [enable, setEnable] = useState<boolean>(false);
  useEffect(() => {
    if (enable) {
      let writeBytes = getBytes('1');
      bleManager.startNotification(
        peripheralId,
        IR_TEMPERATURE_SENSOR.service,
        IR_TEMPERATURE_SENSOR.notification
      );

      bleManager
        .write(
          peripheralId,
          IR_TEMPERATURE_SENSOR.service,
          IR_TEMPERATURE_SENSOR.configuration,
          writeBytes,
          writeBytes.length
        )
        .then(() => {
          console.debug('IR Temperature sensor enabled');
        });
    } else {
      bleManager.stopNotification(
        peripheralId,
        IR_TEMPERATURE_SENSOR.service,
        IR_TEMPERATURE_SENSOR.notification
      );

      let writeBytes = getBytes('0');
      bleManager
        .write(
          peripheralId,
          IR_TEMPERATURE_SENSOR.service,
          IR_TEMPERATURE_SENSOR.configuration,
          writeBytes,
          writeBytes.length
        )
        .then(() => {
          console.debug('IR Temperature sensor disabled');
        });
    }
  }, [enable]);

  let lastAmbTempValue = useMemo(() => {
    return irTemperatureData.amb[irTemperatureData.amb.length - 1].toFixed(2);
  }, [irTemperatureData.amb]);

  let lastObjTempValue = useMemo(() => {
    return irTemperatureData.obj[irTemperatureData.obj.length - 1].toFixed(2);
  }, [irTemperatureData.obj]);

  useEffect(() => {
    return () => {
      bleManager.stopNotification(
        peripheralId,
        IR_TEMPERATURE_SENSOR.service,
        IR_TEMPERATURE_SENSOR.notification
      );
      let writeBytes = getBytes('0');
      bleManager.write(
        peripheralId,
        IR_TEMPERATURE_SENSOR.service,
        IR_TEMPERATURE_SENSOR.configuration,
        writeBytes,
        writeBytes.length
      );
    };
  }, []);

  return (
    <View style={styles.container}>
      <SensorPresentation name="IR Temperature" uuid={IR_TEMPERATURE_SENSOR.service} />
      <View style={styles.chartContainer}>
        <View style={styles.switchContainer}>
          <Text style={{ paddingRight: 10 }}>Enable</Text>
          <Switch value={enable} onValueChange={setEnable} />
        </View>
        <LineChart
          data={{
            datasets: [
              { data: irTemperatureData.amb, color: (opacity) => `rgba(255,0,0,${opacity})` },
              { data: irTemperatureData.obj, color: (opacity) => `rgba(0,255,0,${opacity})` },
            ],
            legend: ['Ambience', 'Object'],
            labels: [],
          }}
          width={Dimensions.get('window').width}
          height={220}
          withVerticalLabels={false}
          segments={10}
          chartConfig={chartConfig}
          style={chartStyles}
        />
        <Legend values={[`Ambience: ${lastAmbTempValue}°C`, `Object: ${lastObjTempValue}°C`]} />
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

export default IRTemperatureSensor;
