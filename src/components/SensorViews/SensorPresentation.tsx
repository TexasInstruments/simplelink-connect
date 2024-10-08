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

import { Text } from '@rneui/themed';
import { View } from '../Themed';
import Colors from '../../constants/Colors';
import { StyleSheet } from 'react-native';
import { Icon } from '@rneui/themed';

interface Props {
  name: string;
  uuid: string;
  icon?: any;
}

const SensorPresentation: React.FC<Props> = ({ name, uuid, icon }) => {
  return (
    <View style={styles.container}>
      <View style={[styles.container, { flexDirection: 'row', marginBottom: 2, paddingHorizontal: 0, paddingVertical: 0 },]}>
        <View style={[styles.deviceInfoIconContainer, { backgroundColor: 'white', },]}>
          <Icon name={icon ? icon?.iconName : "devices"} type={icon ? icon?.type : "fontawesome"} size={32} />
        </View>
        <Text style={{ fontWeight: 'bold', fontSize: 30, alignSelf: 'center', marginLeft: 10 }}>
          {name}
        </Text>
      </View>
      <Text style={{ color: 'rgba(0,0,0)', justifyContent: 'center', }}>UUID: {uuid}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    backgroundColor: Colors.lightGray,
    paddingVertical: 15,
    paddingHorizontal: 8
  },
  deviceInfoIconContainer: {
    alignSelf: 'flex-start',
    width: 50,
    height: 50,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Colors.gray,
    borderWidth: 1,
  },
});

export default SensorPresentation;
