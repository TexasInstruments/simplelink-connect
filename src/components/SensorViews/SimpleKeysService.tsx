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

import { useEffect } from 'react';
import { Switch, View } from '../Themed';
import bleManager from 'react-native-ble-manager';
import { Text } from '@rneui/themed';
import { SIMPLE_KEYS_SERVICE } from '../../constants/SensorTag';
import SensorPresentation from './SensorPresentation';
import { Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { chartConfig, chartStyles } from '../../constants/Charts';

interface Props {
  peripheralId: string;
  keys: { left: number[]; right: number[]; zero: number[] };
  enableKeysNotif: boolean;
  setEnableKeysNotif: React.Dispatch<React.SetStateAction<boolean>>;
}

const SimpleKeysService: React.FC<Props> = ({
  peripheralId,
  keys,
  enableKeysNotif: enable,
  setEnableKeysNotif: setEnable,
}) => {
  useEffect(() => {
    if (enable) {
      bleManager
        .startNotification(peripheralId, SIMPLE_KEYS_SERVICE.service, SIMPLE_KEYS_SERVICE.data)
        .then(() => {
          console.debug('Notifications started on Simple Keys Service.');
        });
    } else {
      bleManager
        .stopNotification(peripheralId, SIMPLE_KEYS_SERVICE.service, SIMPLE_KEYS_SERVICE.data)
        .then(() => {
          console.debug('Notifications stoppped on Simple Keys Service.');
        });
    }
  }, [enable]);

  useEffect(() => {
    return () => {
      bleManager
        .stopNotification(peripheralId, SIMPLE_KEYS_SERVICE.service, SIMPLE_KEYS_SERVICE.data)
        .then(() => {
          console.debug('Notifications stoppped on Simple Keys Service.');
        });
    };
  }, []);

  return (
    <View style={{ flexDirection: 'column' }}>
      <SensorPresentation name="Simple Keys" uuid={SIMPLE_KEYS_SERVICE.service} />
      <View style={styles.chartContainer}>
        <View style={styles.switchContainer}>
          <Text style={{ paddingRight: 10 }}>Enable</Text>
          <Switch value={enable} onValueChange={setEnable} />
        </View>
        <LineChart
          data={{
            datasets: [
              { data: keys.left, color: () => 'red' },
              { data: keys.right, color: () => 'green' },
              { data: keys.zero, color: () => 'blue' },
            ],
            labels: [],
            legend: ['Left', 'Right'],
          }}
          width={Dimensions.get('window').width}
          height={150}
          segments={2}
          withHorizontalLabels={true}
          yAxisInterval={1}
          chartConfig={{ ...chartConfig, decimalPlaces: 0 }}
          style={chartStyles}
        />
      </View>
    </View>
  );
};

export default SimpleKeysService;

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
