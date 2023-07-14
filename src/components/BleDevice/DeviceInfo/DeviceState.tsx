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
import { Text } from '../../../../components/Themed';
import React, { useCallback } from 'react';
import { TouchableOpacity } from '../../../../components/Themed';
import Colors from '../../../../constants/Colors';
import { DeviceScreenNavigationProp } from '../../../../types';
import { useNavigation } from '@react-navigation/native';

interface Props {
  deviceState: string;
  discover: (peripheralId: string) => void;
  connect: (peripheralId: string) => void;
  hasOadserviceUuid: boolean;
  peripheralId: string;
}

const DeviceState: React.FC<Props> = ({ deviceState, hasOadserviceUuid, peripheralId, connect }) => {
  let navigation = useNavigation<DeviceScreenNavigationProp>();

  const openFWUpdateModal = () => {
    navigation.navigate('FwUpdateServiceModel', { peripheralId: peripheralId });
  }

  return (
    <View style={[styles.container]}>
      {/* Rediscover devices services feature */}
      <TouchableOpacity onPress={() => connect(peripheralId)}>
        <Text>
          State: <Text style={{fontWeight: 'bold' }}>{deviceState}</Text>
        </Text>
      </TouchableOpacity> 
      {hasOadserviceUuid && (
        <TouchableOpacity
          onPress={openFWUpdateModal}
          style={{
            paddingHorizontal: 10,
            borderRadius: 15,
          }}
        >
          <Text style={[{ color: Colors.blue }]}>Update FW</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 15,
  },
});

export default DeviceState;
