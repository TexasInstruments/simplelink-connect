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

import { StyleSheet } from 'react-native';
import { PeripheralInfo } from 'react-native-ble-manager';
import { View } from '../../Themed';
import DevicePresentation from './DevicePresentation';
import DeviceState from './DeviceState';
import Colors from '../../../constants/Colors';

interface Props {
  peripheralInfo?: PeripheralInfo | undefined;
  deviceState: string;
  discover: (peripheralId: string) => void;
  connect: (peripheralId: string) => void;
  peripheralId: string;
  isBonded: boolean;
  isConnected: boolean;
}
const DeviceInfo: React.FC<Props> = ({
  peripheralInfo,
  deviceState,
  discover,
  connect,
  peripheralId,
  ...props
}) => {
  const OadServiceUuid = 'F000FFC0-0451-4000-B000-000000000000';
  const OadResetServiceUuid = 'F000FFD0-0451-4000-B000-000000000000';

  let oadserviceUuidList = peripheralInfo?.services?.filter(
    (service) =>
      service.uuid.toUpperCase() === OadServiceUuid ||
      service.uuid.toUpperCase() === OadResetServiceUuid
  );

  //@ts-ignore
  let hasOadserviceUuid: boolean = oadserviceUuidList?.length > 0;

  return (
    <View style={{ backgroundColor: Colors.lightGray }}>
      <View style={[styles.container, { backgroundColor: Colors.lightGray, flexDirection: 'row' }]}>
        <DevicePresentation peripheral={peripheralInfo} deviceState={deviceState} />
      </View>
      <DeviceState
        deviceState={deviceState}
        discover={discover}
        connect={connect}
        hasOadserviceUuid={hasOadserviceUuid}
        peripheralId={peripheralId}
        peripheralInfo={peripheralInfo}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 15,
    display: 'flex',
    flexDirection: 'column',
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowOffset: {
      height: 1,
      width: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 5,
  },
});

export default DeviceInfo;
