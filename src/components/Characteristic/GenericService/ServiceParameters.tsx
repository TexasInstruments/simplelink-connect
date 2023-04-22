/*
 * Copyright (c) 2015-2018, Texas Instruments Incorporated
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

import { View, Text, StyleSheet } from 'react-native';
import React from 'react';
import Colors from '../../../../constants/Colors';

interface Props {
  serviceName: string;
  serviceUuid: string;
}

const ServiceParameters: React.FC<Props> = ({ serviceName, serviceUuid }) => {
  let serviceNameLable = '';
  let serviceNameFontWeight = 'bold' as any;
  let serviceNameFontSize = 20;
  if (serviceName === 'Unknown Service') {
    serviceNameFontWeight = 'normal';
    if (serviceName.length == 4) {
      serviceName = serviceName.toUpperCase();
      serviceNameLable = 'Service UUID:';
      serviceName = '0x' + serviceUuid;
    } else {
      serviceNameLable = 'Service UUID:';
      serviceName = serviceUuid;
      serviceNameFontSize = 15;
    }
  }

  let serviceUuidString = serviceUuid;

  if(serviceUuidString?.length === 4) {
    serviceUuidString = '0x' + serviceUuidString.toUpperCase();
  }

  return (
    <View style={[styles.container]}>
      {serviceNameLable !== '' && <Text style={{ fontWeight: 'bold' }}>{serviceNameLable}</Text>}
      <View style={{ paddingBottom: 5 }}>
        <Text style={{ fontWeight: serviceNameFontWeight, fontSize: serviceNameFontSize }}>
          {serviceName}
        </Text>
      </View>
      {serviceNameLable === '' && <Text>UUID: {serviceUuidString}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.lightGray,
    width: '80%',
    alignSelf: 'center',
    paddingVertical: 15,
    paddingLeft: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
});

export default ServiceParameters;
