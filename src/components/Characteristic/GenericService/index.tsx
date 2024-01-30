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
import React, { useCallback, useEffect, useState } from 'react';
import ServiceParameters from './ServiceParameters';
import ServicePresentation from './ServicePresentation';
import { TouchableOpacity } from '../../Themed';
import Colors from '../../../constants/Colors';
import { uuidToServiceSpecificScreen } from '../../../hooks/uuidToName';
import { CharacteristicsScreenNavigationProp, Icon, RootStackParamList } from '../../../../types';
import { useNavigation } from '@react-navigation/native';
import { SUPPORTED_SPAECIFIC_SCREEN } from '../../../constants/SensorTag';

interface Props {
  serviceUuid: string;
  serviceName: string;
  icon: Icon;
  peripheralId: string;
}

const GenericService: React.FC<Props> = ({ serviceUuid, serviceName, icon, peripheralId }) => {
  let navigation = useNavigation<CharacteristicsScreenNavigationProp>();

  const [screenSpecific, setScreenSpecific] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let checkForScreenSpecificScreen = await uuidToServiceSpecificScreen({ uuid: serviceUuid });
        if (!checkForScreenSpecificScreen || !isServiceSupportSensor()) throw Error('Service Specific Screen not implemented!');

        setScreenSpecific(
          checkForScreenSpecificScreen.serviceSpecificScreen as keyof RootStackParamList
        );

      } catch (error) {
        setScreenSpecific(null);
      }
    })();
  }, [serviceUuid]);

  let isServiceSupportSensor = () => {
    return SUPPORTED_SPAECIFIC_SCREEN.find(sensor => serviceName.toLowerCase().includes(sensor))
  }

  let navigateToScreenSpecific = useCallback(() => {
    if (!screenSpecific) {
      return;
    }

    navigation.navigate(screenSpecific, {
      peripheralId, serviceName
    });
  }, [screenSpecific]);

  return (
    <View>
      <View style={[styles.container, { width: '100%', marginTop: 0, flexDirection: 'row' }]}>
        <ServicePresentation icon={icon} />
        <ServiceParameters serviceName={serviceName} serviceUuid={serviceUuid} />
      </View>
      {screenSpecific && (
        <View style={[styles.ServiceSpecficContainer]}>
          <TouchableOpacity onPress={screenSpecific ? navigateToScreenSpecific : undefined}>
            <Text style={{ color: Colors.blue }}>Change to Service Specific View</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.lightGray,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowOffset: {
      height: 1,
      width: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 5,
  },
  ServiceSpecficContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
});

export default GenericService;
