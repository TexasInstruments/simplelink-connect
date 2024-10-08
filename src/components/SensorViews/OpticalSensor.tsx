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

import { View, Switch } from '../Themed';
import bleManager from 'react-native-ble-manager';
import { getBytes } from '../../hooks/convert';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Text } from '@rneui/base';
import { OPTICAL_SENSOR } from '../../constants/SensorTag';
import { chartConfig, chartStyles } from '../../constants/Charts';
import SensorPresentation from './SensorPresentation';
import Legend from './Legend';

interface Props {
  peripheralId: string;
  opticalSensorData: number[];
  icon: any;
}

const OpticalSensor: React.FC<Props> = ({ peripheralId, opticalSensorData, icon }) => {
  const [enable, setEnable] = useState<boolean>(false);

  useEffect(() => {
    if (enable) {
      console.debug('Notification started by on');
      bleManager.startNotification(
        peripheralId,
        OPTICAL_SENSOR.service,
        OPTICAL_SENSOR.notification
      );
      let writeBytes = getBytes('1');
      bleManager.write(
        peripheralId,
        OPTICAL_SENSOR.service,
        OPTICAL_SENSOR.configuration,
        writeBytes,
        writeBytes.length
      );
    } else {
      let writeBytes = getBytes('0');
      bleManager.write(
        peripheralId,
        OPTICAL_SENSOR.service,
        OPTICAL_SENSOR.configuration,
        writeBytes,
        writeBytes.length
      );
      bleManager.stopNotification(
        peripheralId,
        OPTICAL_SENSOR.service,
        OPTICAL_SENSOR.notification
      );
    }
  }, [enable]);

  let lastLuxValue = useMemo(() => {
    return opticalSensorData[opticalSensorData.length - 1].toFixed(2);
  }, [opticalSensorData]);

  useEffect(() => {
    return () => {
      let writeBytes = getBytes('0');
      bleManager.write(
        peripheralId,
        OPTICAL_SENSOR.service,
        OPTICAL_SENSOR.configuration,
        writeBytes,
        writeBytes.length
      );
      bleManager.stopNotification(
        peripheralId,
        OPTICAL_SENSOR.service,
        OPTICAL_SENSOR.notification
      );
    };
  }, []);

  return (
    <View style={styles.container}>
      <SensorPresentation name="Light" uuid={OPTICAL_SENSOR.service} icon={icon} />
      <View style={styles.chartContainer}>
        <View style={styles.switchContainer}>
          <Text style={{ paddingRight: 10 }}>Enable</Text>
          <Switch value={enable} onValueChange={setEnable} />
        </View>
        <LineChart
          data={{
            datasets: [{ data: opticalSensorData, strokeWidth: 5 }],
            labels: [],
          }}
          width={Dimensions.get('window').width}
          withVerticalLabels={false}
          height={220}
          segments={10}
          chartConfig={chartConfig}
          bezier
          style={chartStyles}
        />
        <Legend values={[`Lux: ${lastLuxValue}`]} centered />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  chartContainer: {
    flexDirection: 'column',
    paddingVertical: 15,
  },
  switchContainer: { flexDirection: 'row', paddingHorizontal: 25, alignItems: 'center' },
});

export default OpticalSensor;
