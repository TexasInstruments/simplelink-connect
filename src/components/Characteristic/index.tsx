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

import { StyleSheet, View, Text } from 'react-native';
import BleManager from 'react-native-ble-manager';
import DropDownPicker from 'react-native-dropdown-picker';
import React, { useState, useEffect } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import GenericService from './GenericService';
import CharacteristicsList from './CharacteristicsList';
import { Icon } from '../../../types';

interface Props {
  serviceCharacteristics: BleManager.Characteristic[];
  serviceUuid: string;
  serviceName: string;
  peripheralId: string;
  icon: Icon;
}

const Characteristic: React.FC<Props> = ({
  serviceCharacteristics,
  serviceUuid,
  serviceName,
  peripheralId,
  icon,
}) => {

  type Formats = {
    label: string;
    value: string,
  };

  let availableFormats: Formats[] = [
    {
      label: 'Hex',
      value: 'Hex',
    },
    {
      label: 'Dec',
      value: 'Dec',
    },

    {
      label: 'UTF-8',
      value: 'UTF-8',
    },

  ];

  const [formats, setformats] = useState<Formats[]>(availableFormats);
  const [openDropdown, setOpenDropdown] = useState<boolean>(false);
  const [selectedFormat, setSelectedFormat] = useState<string>("Hex");

  return (
    <View>
      <GenericService
        serviceName={serviceName}
        serviceUuid={serviceUuid}
        icon={icon}
        peripheralId={peripheralId}
      />
      <View style={[styles.formatContainer]}>
        <Text style={{ fontSize: 20, paddingRight: 20}}>Format</Text>
        <DropDownPicker
            zIndex={100}
            containerStyle={[styles.dropDownPickerContainer]}
            placeholder="Hex"
            open={openDropdown}
            setOpen={setOpenDropdown}
            value={selectedFormat}
            setValue={setSelectedFormat}
            items={formats}
            setItems={setformats}
            style={{minHeight: 35}}
        />
      </View>
      <KeyboardAwareScrollView
        extraScrollHeight={30}
        contentContainerStyle={{
          paddingBottom: 240
        }}
        style={[styles.container]}
      >
        <CharacteristicsList
          peripheralId={peripheralId}
          serviceUuid={serviceUuid}
          serviceName={serviceName}
          characteristics={serviceCharacteristics}
          selectedFormat={selectedFormat}
          setSelectedFormat={setSelectedFormat}
        />
      </KeyboardAwareScrollView>
    </View>
  );
};

const styles = StyleSheet.create({ 
  container: {},
  formatContainer: {
    display: 'flex',
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
    zIndex: 100 
  },
  dropDownPickerContainer: {
    width: '30%',
  } 
});

export default Characteristic;
