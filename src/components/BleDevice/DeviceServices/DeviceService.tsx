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

import { View, StyleSheet } from 'react-native';
import { Text } from '../../Themed';
import React from 'react';
import BleManager, { PeripheralInfo, Service } from 'react-native-ble-manager';
import { useNavigation } from '@react-navigation/native';
import { DeviceScreenNavigationProp } from '../../../../types';
import { TouchableOpacity } from '../../Themed';
import { Icon } from '@rneui/themed';
import Layout from '../../../constants/Layout';
import { useState } from 'react';
import { useEffect } from 'react';
import { uuidToIcon, uuidToServiceName } from '../../../hooks/uuidToName';
import { useMemo } from 'react';
import TIcon from '../../TIcon';
import Colors from '../../../constants/Colors';

interface Props {
  service: Service;
  peripheralInfo?: PeripheralInfo;
}

const DeviceService: React.FC<Props> = ({ service, peripheralInfo }) => {
  let navigation = useNavigation<DeviceScreenNavigationProp>();

  const [serviceName, setServiceName] = useState<string>('Unknown Service');
  const [icon, setIcon] = useState<{
    type: 'svg' | 'font-awesome' | 'font-awesome-5';
    iconName: string;
  }>();

  let characteristicsCount = useMemo(
    () => peripheralInfo?.characteristics?.filter((char) => char.service === service.uuid).length,
    []
  );

  let serviceUuidString = service.uuid;
  if (serviceUuidString.length === 4) {
    serviceUuidString = '0x' + serviceUuidString.toUpperCase();
  }

  useEffect(() => {
    let checkIfServiceNameAvailable = async () => {
      let check = await uuidToServiceName({ uuid: service.uuid });
      let checkIcon = await uuidToIcon({ uuid: service.uuid });
      if (check !== undefined) {
        setIcon(checkIcon);
        setServiceName(check);
      }
    };

    checkIfServiceNameAvailable();
  }, []);

  return (
    <View style={[styles.container]}>
      {icon?.type === 'svg' ? (
        <TIcon name={icon.iconName} />
      ) : (
        <Icon name={icon?.iconName!} type={icon?.type} />
      )}
      <View style={{ paddingLeft: 10, flexDirection: 'column' }}>
        <Text style={{ fontWeight: 'bold' }}>{serviceName}</Text>
        <Text numberOfLines={1} ellipsizeMode="middle" style={{ color: Colors.gray, width: '85%' }}>
          {serviceUuidString}
        </Text>
        <Text
          adjustsFontSizeToFit
          allowFontScaling
          numberOfLines={1}
          style={{ color: Colors.gray }}
        >
          {`${characteristicsCount} `}
          characteristics
        </Text>
      </View>
      <View style={{ marginLeft: 'auto' }}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('Characteristics', {
              peripheralInfo: peripheralInfo!,
              serviceUuid: service.uuid,
              icon: {
                type: icon?.type!,
                iconName: icon?.iconName!,
              },
              serviceName: serviceName,
            })
          }
        >
          <Icon name="chevron-right" type="evilicon" size={40} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
    display: 'flex',
    flexDirection: 'row',
    paddingVertical: 15,
    alignItems: 'center',
    marginHorizontal: 20,
    ...Layout.separators,
  },
});

export default DeviceService;
