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

import { Icon } from '@rneui/themed';
import { StyleSheet } from 'react-native';
import { Text, View } from '../../Themed';
import Colors from '../../../constants/Colors';
import useColorScheme from '../../../hooks/useColorScheme';
import BleManager from 'react-native-ble-manager';
import Spacing from '../../Spacing';
import { Peripheral } from 'react-native-ble-manager';
import PeripheralIcon from '../../PeripheralIcon';

interface Props {
  peripheral?: Peripheral;
  deviceState: string;
}

const DevicePresentation: React.FC<Props> = ({ peripheral, deviceState }) => {
  let theme = useColorScheme();

  console.log('DevicePresentation name', peripheral?.name);
  let name = deviceState === 'Connected' ? peripheral?.name : 'Discovering...';

  console.log('DevicePresentation name', peripheral?.name);

  return (
    <View style={[styles.container, { backgroundColor: Colors.lightGray }]}>
      <View
        style={[
          styles.deviceInfoIconContainer,
          {
            backgroundColor: Colors[theme].background,
          },
        ]}
      >
        <PeripheralIcon icon={peripheral?.icon} size={32} />
      </View>
      <Spacing spaceT={10} />
      <Text style={[styles.deviceName]}>{name}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingLeft: 30,
    paddingVertical: 0,
    flexDirection: 'row',
  },
  deviceName: {
    width: 200,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 20,
    paddingVertical: 0,
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

export default DevicePresentation;
