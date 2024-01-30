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
import { MovementSensorState } from '../../../types';
import bleManager from 'react-native-ble-manager';
import { getBytes } from '../../hooks/convert';
import { MOVEMENT_SENSOR } from '../../constants/SensorTag';
import { LineChart } from 'react-native-chart-kit';
import { Text } from '@rneui/themed';
import { Dimensions, StyleSheet } from 'react-native';
import { chartConfig, chartStyles } from '../../constants/Charts';
import SensorPresentation from './SensorPresentation';
import Legend from './Legend';

interface Props {
  peripheralId: string;
  movementData: MovementSensorState;
}

const MovementSensor: React.FC<Props> = ({ peripheralId, movementData }) => {
  const [enable, setEnable] = useState<boolean>(false);

  useEffect(() => {
    if (enable) {
      bleManager.startNotification(
        peripheralId,
        MOVEMENT_SENSOR.service,
        MOVEMENT_SENSOR.notification
      );
      let writeBytes = getBytes('FFFF'); //17F
      bleManager.write(
        peripheralId,
        MOVEMENT_SENSOR.service,
        MOVEMENT_SENSOR.configuration,
        writeBytes,
        writeBytes.length
      );
    } else {
      let writeBytes = getBytes('000');
      bleManager.stopNotification(
        peripheralId,
        MOVEMENT_SENSOR.service,
        MOVEMENT_SENSOR.notification
      );
      bleManager.write(
        peripheralId,
        MOVEMENT_SENSOR.service,
        MOVEMENT_SENSOR.configuration,
        writeBytes,
        writeBytes.length
      );
    }
  }, [enable]);

  let lastAccValue = useMemo(() => {
    return {
      x: movementData.acc[movementData.acc.length - 1].x.toFixed(2),
      y: movementData.acc[movementData.acc.length - 1].y.toFixed(2),
      z: movementData.acc[movementData.acc.length - 1].z.toFixed(2),
    };
  }, [movementData.acc]);

  useEffect(() => {
    return () => {
      bleManager.stopNotification(
        peripheralId,
        MOVEMENT_SENSOR.service,
        MOVEMENT_SENSOR.notification
      );
      let writeBytes = getBytes('000');

      bleManager.write(
        peripheralId,
        MOVEMENT_SENSOR.service,
        MOVEMENT_SENSOR.configuration,
        writeBytes,
        writeBytes.length
      );
    };
  }, []);

  return (
    <View style={styles.container}>
      <SensorPresentation name="Accelerometer" uuid={MOVEMENT_SENSOR.service} />
      <View style={styles.chartContainer}>
        <View style={styles.switchContainer}>
          <Text style={{ paddingRight: 10 }}>Enable</Text>
          <Switch value={enable} onValueChange={setEnable} />
        </View>
        <LineChart
          data={{
            datasets: [
              { data: [...movementData.acc.map((t) => t.x)], strokeWidth: 2, color: () => 'red' },
              { data: [...movementData.acc.map((t) => t.y)], strokeWidth: 2, color: () => 'green' },
              {
                data: [...movementData.acc.map((t) => t.z)],
                strokeWidth: 2,
                color: () => 'yellow',
              },
            ],
            labels: [],
            legend: ['X', 'Y', 'Z'],
          }}
          width={Dimensions.get('window').width}
          height={220}
          segments={10}
          chartConfig={chartConfig}
          bezier
          style={chartStyles}
        />
        <Legend values={[`X: ${lastAccValue.x}`, `Y: ${lastAccValue.y}`, `Z: ${lastAccValue.z}`]} />
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

export default MovementSensor;
