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

import { useCallback, useEffect, useState } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Switch, View } from '../components/Themed';
import { Text } from '../components/Themed';
import { TextInput as Input, Platform, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import Separator from '../components/Separator';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { TerminalConfig, useTerminalConfigContext } from '../context/TerminalOptionsContext';
import { useFocusEffect } from '@react-navigation/native';
import { useCharacteristicViewContext } from '../context/CharactristicViewContext';
import Colors from '../constants/Colors';
import Icon from 'react-native-vector-icons/Ionicons';
import { SpecificScreenConfig, useSpecificScreenConfigContext } from '../context/SpecificScreenOptionsContext';
import { Dropdown } from 'react-native-element-dropdown';

interface Props extends DrawerContentComponentProps { }

const CharacteristicsSettingsDrawer: React.FC<Props> = ({ navigation }) => {
  const { terminalConfig, updateTermninalConfigurations } = useTerminalConfigContext();
  const { specificScreenConfig, updateConfigurations } = useSpecificScreenConfigContext();
  const { charactristicView, toggleView, serviceUUID, hasSpecificScreen, hasTestOption, serviceName, periNameId } = useCharacteristicViewContext();

  const [showTimestamp, setShowTimestamp] = useState<boolean>(terminalConfig.timestamp);
  const [showMessageLength, setShowMessageLength] = useState<boolean>(terminalConfig.messageLength);
  const [disableLocalEcho, setdisableLocalEcho] = useState<boolean>(terminalConfig.disabledLocalEcho);

  // Wifi Provisioning Over BLE
  const [connectionTimeout, setConnectionTimeout] = useState<number>(specificScreenConfig.wifiProvisioningConnectionTimeout);
  const [isConnectionTimeoutFocused, setIsConnectionTimeoutFocused] = useState<boolean>(false);

  const { fontScale } = useWindowDimensions();

  const TI_Terminal_uuid = 'f000c0c0-0451-4000-b000-000000000000';
  const Wifi_Provisioning_UUID = 'cc00';
  const Wifi_Provisioning_UUID_linux = '180d';

  const CONNECTION_TIMEOUT_OPTIONS = [
    { value: 5000, label: '5 seconds' },
    { value: 10000, label: '10 seconds' },
    { value: 30000, label: '30 seconds' },
    { value: 60000, label: '60 seconds' },
  ]

  useFocusEffect(
    useCallback(() => {
      setShowMessageLength(terminalConfig.messageLength);
      setShowTimestamp(terminalConfig.timestamp);
      setdisableLocalEcho(terminalConfig.disabledLocalEcho)
    }, [terminalConfig])
  );

  useFocusEffect(
    useCallback(() => {
      setConnectionTimeout(specificScreenConfig.wifiProvisioningConnectionTimeout);
    }, [specificScreenConfig])
  );

  const changeTimestampState = async (value: boolean) => {

    setShowTimestamp(value);

    let newConfig: TerminalConfig = {
      timestamp: value,
      messageLength: showMessageLength,
      disabledLocalEcho: disableLocalEcho
    }

    updateTermninalConfigurations(newConfig);

  };

  const changeDisableLocalEchoState = async (value: boolean) => {
    setdisableLocalEcho(value);

    let newConfig: TerminalConfig = {
      timestamp: showTimestamp,
      messageLength: showMessageLength,
      disabledLocalEcho: value
    }
    updateTermninalConfigurations(newConfig);
  };

  const changeShowLengthState = async (value: boolean) => {

    setShowMessageLength(value);

    let newConfig: TerminalConfig = {
      timestamp: showTimestamp,
      messageLength: value,
      disabledLocalEcho: disableLocalEcho
    }

    updateTermninalConfigurations(newConfig);
  };

  const changeConnectionTimeoutState = async (value: number) => {

    setConnectionTimeout(value);

    let newConfig: SpecificScreenConfig = {
      wifiProvisioningConnectionTimeout: value
    }

    updateConfigurations(newConfig);

  };

  const handleToggleView = () => {
    toggleView();
    navigation.closeDrawer(); // Close the drawer
  };

  function navigateToTestScreen() {
    if (!hasTestOption) {
      return;
    }
    navigation.closeDrawer(); // Close the drawer
    navigation.navigate('IopParameters', { testService: serviceName, peripheralId: periNameId.peripheralId, peripheralName: periNameId.peripheralName });
  }

  function handleSetRepoURL() {
    navigation.closeDrawer(); // Close the drawer
    navigation.navigate('ConfigRepository');
  }

  const renderLabel = (type: 'tempUnits' | 'graphPoints' | 'recordDuration' | 'connectionTimeout') => {

    switch (type) {
      case 'connectionTimeout':
        if (connectionTimeout != undefined || isConnectionTimeoutFocused) {
          return (
            <Text allowFontScaling={false} style={[styles.label, isConnectionTimeoutFocused && { color: Colors.active }]}>
              Temperature Units
            </Text>
          );
        }
        return null;
    }
  };

  return (
    <View style={{ paddingTop: 10 }}>
      <KeyboardAwareScrollView style={{ marginHorizontal: 15 }} >
        {serviceUUID?.toLocaleLowerCase() === TI_Terminal_uuid && charactristicView === 'specific' && (
          <>
            <Separator text="Terminal Settings" textStyles={{ fontWeight: 'bold' }} textProps={{ h4: true }} />
            <View style={[styles.configContainer,]}>
              <Text allowFontScaling adjustsFontSizeToFit style={{ fontSize: 16 / fontScale }}>Show Timestamp</Text>
              <Switch
                value={showTimestamp}
                onValueChange={(value) => {
                  changeTimestampState(value);
                }}
              />
            </View>
            <View style={[styles.configContainer,]}>
              <Text allowFontScaling adjustsFontSizeToFit style={{ fontSize: 16 / fontScale }}>Show Message Length</Text>
              <Switch
                value={showMessageLength}
                onValueChange={(value) => {
                  changeShowLengthState(value);
                }}
              />
            </View>
            <View
              style={[styles.configContainer,]}>
              <Text allowFontScaling adjustsFontSizeToFit style={{ fontSize: 16 / fontScale }}>Disable Local Echo</Text>
              <Switch
                value={disableLocalEcho}
                onValueChange={(value) => {
                  changeDisableLocalEchoState(value);
                }}
              />
            </View>
            <View style={{ height: 30 }} />

          </>

        )}

        {(serviceUUID?.toLocaleLowerCase() === Wifi_Provisioning_UUID || serviceUUID?.toLocaleLowerCase() === Wifi_Provisioning_UUID_linux) && charactristicView === 'specific' && (
          <>
            <Separator text="Connection Timeout" textStyles={{ fontWeight: 'bold' }} textProps={{ h4: true }} />
            <View style={styles.dropdownContainer}>
              {renderLabel('graphPoints')}
              <Dropdown
                style={[styles.dropdown, isConnectionTimeoutFocused && { borderColor: Colors.active }]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                itemTextStyle={styles.item}
                data={CONNECTION_TIMEOUT_OPTIONS}
                placeholder={!isConnectionTimeoutFocused ? 'Select number of point to display on the graph' : '...'}
                value={connectionTimeout}
                onChange={(v: any) => {
                  changeConnectionTimeoutState(v.value)
                }}
                labelField="label"
                valueField="value"
                onFocus={() => setIsConnectionTimeoutFocused(true)}
                onBlur={() => setIsConnectionTimeoutFocused(false)}
              />
            </View>

            <View style={{ height: 30 }} />

          </>

        )}


        {hasSpecificScreen && (
          <>
            <Separator text="View" textStyles={{ fontWeight: 'bold' }} textProps={{ h4: true }} />
            <View
              style={[styles.configContainer,]}>
              <Text allowFontScaling adjustsFontSizeToFit style={{ fontSize: 16 / fontScale }}>Developer Mode</Text>
              <Switch
                value={charactristicView === 'advanced'}
                onValueChange={handleToggleView}
              />
            </View>
          </>
        )}

        {serviceName?.toUpperCase() === 'TI OAD' && charactristicView === 'specific' && (
          <>
            <View style={{ height: 30 }} />
            <TouchableOpacity style={styles.button} onPress={handleSetRepoURL}>
              <Icon name="git-network-outline" size={20} color={Colors.blue} style={styles.icon} />
              <Text style={{
                color: Colors.blue
              }}>Config OAD Repository</Text>
            </TouchableOpacity>
          </>
        )}


        {hasTestOption && (
          <>
            <View style={{ height: 30 }} />
            <TouchableOpacity style={styles.button} onPress={hasTestOption ? navigateToTestScreen : undefined}>
              <Icon name="flask" size={20} color={Colors.blue} style={styles.icon} />
              <Text style={{ color: Colors.blue }}>Enter Stress Test Mode</Text>
            </TouchableOpacity>
          </>
        )}

        {!hasSpecificScreen && !hasTestOption && (
          <View style={{ alignItems: 'center' }}>
            <View style={{ height: 30 }} />

            <Text style={{ alignSelf: 'center' }}> No settings are available</Text>
          </View>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  configContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    alignContent: 'center',
    flexDirection: 'row',
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: Colors.blue,
    height: 40,
  },
  icon: {
    width: 30,
    textAlign: 'center',
  },
  dropdown: {
    paddingHorizontal: 16,
    width: '100%',
    height: 40,
    borderColor: Colors.gray,
    borderWidth: 1,
    borderRadius: 4,
  },
  placeholderStyle: {
    fontSize: 14,
  },
  selectedTextStyle: {
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0.25,
  },
  item: {
    color: 'black',
    fontSize: 14,
  },
  label: {
    color: Colors.gray,
    position: 'absolute',
    backgroundColor: 'white',
    left: 0,
    top: -7,
    zIndex: 999,
    marginHorizontal: 15,
    paddingHorizontal: 3,
    fontSize: 12,
  },
  dropdownContainer: {
    marginTop: 20
  }
});

export default CharacteristicsSettingsDrawer;
