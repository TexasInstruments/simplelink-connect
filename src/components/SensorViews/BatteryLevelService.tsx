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

import { TouchableOpacity, View } from '../Themed';
import bleManager from 'react-native-ble-manager';
import { BATTERY_LEVEL } from '../../constants/SensorTag';
import { Icon, Text } from '@rneui/themed';
import SensorPresentation from './SensorPresentation';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

interface Props {
  peripheralId: string;
}

const BatteryLevelService: React.FC<Props> = ({ peripheralId }) => {
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const readBatteryLevel = () => {
    setBatteryLevel(null);
    bleManager
      .read(peripheralId, BATTERY_LEVEL.service, BATTERY_LEVEL.data)
      .then((data) => {
        console.debug('Battery service read.');
        setBatteryLevel(data[0]);
      })
      .catch((error) => {
        console.debug(`Battery service error: ${error}`);
      });
  };

  useEffect(() => {
    readBatteryLevel();
  }, []);

  let batteryIcon = useMemo(() => {
    if (!batteryLevel) {
      return 'battery-empty';
    }

    if (batteryLevel >= 0 && batteryLevel <= 34) {
      return 'battery-quarter';
    } else if (batteryLevel >= 35 && batteryLevel <= 59) {
      return 'battery-half';
    } else if (batteryLevel >= 60 && batteryLevel <= 80) {
      return 'battery-three-quarters';
    } else if (batteryLevel >= 81 && batteryLevel <= 100) {
      return 'battery-full';
    } else {
      return 'battery-empty';
    }
  }, [batteryLevel]);

  return (
    <View>
      <SensorPresentation name="Battery Level" uuid={BATTERY_LEVEL.service} />
      <View style={styles.insideContainer}>
        <Icon name={batteryIcon} type="font-awesome-5" size={32} />
        <Text style={{ paddingTop: 10, fontWeight: 'bold' }}>
          {batteryLevel ? `${batteryLevel}%` : 'Loading...'}
        </Text>
        <TouchableOpacity
          style={{ position: 'absolute', right: 30, bottom: 20 }}
          onPress={readBatteryLevel}
        >
          <Icon name={'sync'} type="font-awesome-5" size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const styles = StyleSheet.create({
  insideContainer: {
    paddingVertical: 19,
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
  },
});

export default BatteryLevelService;
