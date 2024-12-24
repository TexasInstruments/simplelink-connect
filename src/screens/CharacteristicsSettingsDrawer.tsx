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
import { TextInput as Input, Platform, StyleSheet, TextInput, TouchableOpacity, useWindowDimensions } from 'react-native';
import Separator from '../components/Separator';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { TerminalConfig, useTerminalConfigContext } from '../context/TerminalOptionsContext';
import { useFocusEffect } from '@react-navigation/native';
import { useCharacteristicViewContext } from '../context/CharactristicViewContext';
import Colors from '../constants/Colors';
import Icon from 'react-native-vector-icons/Ionicons';
import { SpecificScreenConfig, useSpecificScreenConfigContext } from '../context/SpecificScreenOptionsContext';
import { Dropdown } from 'react-native-element-dropdown';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const NUMBER_OF_POINTS_OPTIONS = [
  { value: 1000, label: '1000 points' },
  { value: 2000, label: '2000 points' },
  { value: 3000, label: '3000 points' },
  { value: 4000, label: '4000 points' },
  { value: 5000, label: '5000 points' },
]

export const TEMP_UNITS_OPTIONS = [
  { value: 'C', label: 'Celsius' },
  { value: 'F', label: 'Fahrenheit' },
]

export const RECORD_DURATION_OPTIONS = [
  { value: 'no limit', label: 'no limit' },
  { value: 10, label: '10 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minutes' },
  { value: 300, label: '5 minutes' },
]

export const MEDIAN_ON_OPTIONS = [
  { value: 1, label: '1 point' },
  { value: 10, label: '10 points' },
  { value: 20, label: '20 points' },
  { value: 40, label: '40 points' },
  { value: 60, label: '60 points' },
  { value: 80, label: '80 points' },
  { value: 100, label: '100 points' },
]
export const MEDIAN_EVERY_OPTIONS = [
  { value: 1, label: '1 point' },
  { value: 2, label: '2 points' },
  { value: 5, label: '5 points' },
  { value: 10, label: '10 points' },
  { value: 20, label: '20 points' },
  { value: 40, label: '40 points' },
]

interface Props extends DrawerContentComponentProps { }

const CharacteristicsSettingsDrawer: React.FC<Props> = ({ navigation }) => {
  const { terminalConfig, updateTermninalConfigurations } = useTerminalConfigContext();
  const { specificScreenConfig, updateConfigurations } = useSpecificScreenConfigContext();
  const { characteristicView, toggleView, serviceUUID, hasSpecificScreen, hasTestOption, serviceName, periNameId } = useCharacteristicViewContext();

  // Wifi Provisioning Over BLE
  const [connectionTimeout, setConnectionTimeout] = useState<number>(specificScreenConfig.wifiProvisioningConnectionTimeout);
  const [isConnectionTimeoutFocused, setIsConnectionTimeoutFocused] = useState<boolean>(false);

  // Terminal configurations
  const [showTimestamp, setShowTimestamp] = useState<boolean>(terminalConfig.timestamp);
  const [showMessageLength, setShowMessageLength] = useState<boolean>(terminalConfig.messageLength);
  const [disableLocalEcho, setdisableLocalEcho] = useState<boolean>(terminalConfig.disabledLocalEcho);

  // Ecg Configuration
  const [pointsNumberToDisplay, setPointsNumberToDisplay] = useState<number>(specificScreenConfig.pointsNumberToDisplay);
  const [recordDuration, setRecordDuration] = useState<number | 'no limit'>(specificScreenConfig.recordDuration);
  const [medianOn, setMedianOn] = useState<number>(specificScreenConfig.medianOn);
  const [medianEvery, setMedianEvery] = useState<number>(specificScreenConfig.medianEvery);
  const [applyRespFilter, setApplyRespFilter] = useState<boolean>(true);

  const [isPointsNumberFocus, setIsPointsNumberFocus] = useState<boolean>(false);
  const [isRecordDurationFocus, setRecordDurationFocus] = useState<boolean>(false);
  const [isRespFilterFocus, setRespFilterFocus] = useState<boolean>(false);
  const [isTempUnitsFocus, setTempUnitsFocus] = useState<boolean>(false);

  // Temperature service
  const [tempUnits, setTempUnits] = useState<'C' | 'F'>(specificScreenConfig.tempUnits);
  const [scaleLSB, setScaleLSB] = useState<string>('');

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

  const TI_ECG_uuid = 'f000bb00-0451-4000-b000-000000000000';
  const TemperatureServiceUuid = 'aa00';

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
      setScaleLSB(specificScreenConfig.temperatureSensorScaleLSB);
      setTempUnits(specificScreenConfig.tempUnits);
      setPointsNumberToDisplay(specificScreenConfig.pointsNumberToDisplay);
      setRecordDuration(specificScreenConfig.recordDuration);
      setMedianOn(specificScreenConfig.medianOn);
      setMedianEvery(specificScreenConfig.medianEvery);
      setApplyRespFilter(specificScreenConfig.applyRespFilter);
    }, [specificScreenConfig])
  );

  // Terminal configuration
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
    updateConfig({ wifiProvisioningConnectionTimeout: value })
  };

  // Ecg configuration
  const onChangeNumberOfPoints = async (value: number) => {
    setPointsNumberToDisplay(value);
    setIsPointsNumberFocus(false);
    updateConfig({ pointsNumberToDisplay: value })
  };

  const onChangeRecordDuration = async (value: any) => {
    setRecordDurationFocus(false);
    setRecordDuration(value);
    updateConfig({ recordDuration: value })

  };

  const onChangeMedianOn = async (value: any) => {
    setRespFilterFocus(false);
    setMedianOn(value);
    updateConfig({ medianOn: value })
  };

  const onChangeMedianEvery = async (value: any) => {
    setRespFilterFocus(false);
    setMedianEvery(value);
    updateConfig({ medianEvery: value })
  };

  const onChangeApplyRespirationFilter = async (value: any) => {
    setApplyRespFilter(value);
    updateConfig({ applyRespFilter: value })
  };

  const onChangeTempUnits = async (value: 'C' | 'F') => {

    setTempUnitsFocus(false);
    setTempUnits(value);
    updateConfig({ tempUnits: value })

  };

  const onChangeScaleLsb = async (value: string) => {
    setScaleLSB(value);
    updateConfig({ temperatureSensorScaleLSB: value })
  };

  const handleToggleView = () => {
    toggleView();
    navigation.closeDrawer(); // Close the drawer
  }

  const updateConfig = (overrides: Partial<SpecificScreenConfig>) => {
    const newConfig: SpecificScreenConfig = {
      wifiProvisioningConnectionTimeout: connectionTimeout,
      temperatureSensorScaleLSB: scaleLSB,
      tempUnits: tempUnits,
      pointsNumberToDisplay: pointsNumberToDisplay,
      recordDuration: recordDuration,
      applyRespFilter: applyRespFilter,
      medianEvery: medianEvery,
      medianOn: medianOn,
      ...overrides,
    };
    updateConfigurations(newConfig);
  };

  // Stress Test
  function navigateToTestScreen() {
    if (!hasTestOption) {
      return;
    }
    navigation.closeDrawer(); // Close the drawer
    navigation.navigate('IopParameters', { testService: serviceName, peripheralId: periNameId.peripheralId, peripheralName: periNameId.peripheralName });
  }

  // OAD configuration
  function handleSetRepoURL() {
    navigation.closeDrawer(); // Close the drawer
    navigation.navigate('ConfigRepository');
  }

  const renderLabel = (type: 'tempUnits' | 'graphPoints' | 'recordDuration' | 'connectionTimeout' | 'scaleLsb' | 'medianEvery' | 'medianOn') => {

    switch (type) {
      case 'connectionTimeout':
        if (connectionTimeout != undefined || isConnectionTimeoutFocused) {
          return (
            <Text allowFontScaling={false} style={[styles.label, isConnectionTimeoutFocused && { color: Colors.active }]}>
              Connection Timeout
            </Text>
          )
        }
        return null;
      case 'tempUnits':
        if (tempUnits != undefined || isTempUnitsFocus) {
          return (
            <Text allowFontScaling={false} style={[styles.label, isTempUnitsFocus && { color: Colors.active }]}>
              Temperature units
            </Text>
          );
        }
        return null;
      case 'graphPoints':
        if (pointsNumberToDisplay != undefined || isPointsNumberFocus) {
          return (
            <Text allowFontScaling={false} style={[styles.label, isPointsNumberFocus && { color: Colors.active }]}>
              Number of points displayed
            </Text>
          );
        }
        return null;
      case 'recordDuration':
        if (recordDuration != undefined || isRecordDurationFocus) {
          return (
            <Text allowFontScaling={false} style={[styles.label, isRecordDurationFocus && { color: Colors.active }]}>
              Record duration
            </Text>
          );
        }
        return null;
      case 'scaleLsb':
        return (
          <Text allowFontScaling={false} style={[styles.label]}>
            Scale LSB
          </Text>
        );
      case 'medianEvery':
        return (
          <Text allowFontScaling={false} style={[styles.label]}>
            Apply filter every
          </Text>
        );
      case 'medianOn':
        return (
          <Text allowFontScaling={false} style={[styles.label]}>
            Number of samples for filter
          </Text>
        );
    }
  };

  return (
    <View style={{ paddingTop: 10 }}>
      <KeyboardAwareScrollView style={{ marginHorizontal: 15 }} >
        {serviceUUID?.toLocaleLowerCase() === TI_Terminal_uuid && characteristicView === 'specific' && (
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

        {(serviceUUID?.toLocaleLowerCase() === Wifi_Provisioning_UUID || serviceUUID?.toLocaleLowerCase() === Wifi_Provisioning_UUID_linux) && characteristicView === 'specific' && (
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
          </>
        )}

        {serviceUUID?.toLocaleLowerCase() === TI_ECG_uuid && characteristicView === 'specific' && (
          <>
            <Separator text="Graph Settings" textStyles={{ fontWeight: 'bold' }} textProps={{ h4: true }} />
            <View style={styles.dropdownContainer}>
              {renderLabel('graphPoints')}
              <Dropdown
                style={[styles.dropdown, isPointsNumberFocus && { borderColor: Colors.active }]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                itemTextStyle={styles.item}
                data={NUMBER_OF_POINTS_OPTIONS}
                placeholder={!isPointsNumberFocus ? 'Select number of point to display on the graph' : '...'}
                value={pointsNumberToDisplay}
                onChange={(v: any) => {
                  onChangeNumberOfPoints(v.value)
                }}
                labelField="label"
                valueField="value"
                onFocus={() => setIsPointsNumberFocus(true)}
                onBlur={() => setIsPointsNumberFocus(false)}
              />
            </View>
            <View style={styles.dropdownContainer}>
              {renderLabel('recordDuration')}
              <Dropdown
                style={[styles.dropdown, isRecordDurationFocus && { borderColor: Colors.active }]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                itemTextStyle={styles.item}
                data={RECORD_DURATION_OPTIONS}
                placeholder={!isRecordDurationFocus ? 'Select record duration' : '...'}
                value={recordDuration}
                onChange={(v: any) => {
                  onChangeRecordDuration(v.value);
                }}
                labelField="label"
                valueField="value"
                onFocus={() => setRecordDurationFocus(true)}
                onBlur={() => setRecordDurationFocus(false)}
              />
            </View>

            <View style={[styles.configContainer, { marginTop: 20 }]}>
              <Text allowFontScaling adjustsFontSizeToFit style={{ fontSize: 16 / fontScale }}>Apply Respiration Filter</Text>
              <Switch
                value={applyRespFilter}
                onValueChange={(value) => {
                  onChangeApplyRespirationFilter(value);
                }}
              />
            </View>
            {applyRespFilter && (
              <>
                <View>
                  {renderLabel('medianEvery')}
                  <Dropdown
                    style={[styles.dropdown, isRespFilterFocus && { borderColor: Colors.active }]}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    itemTextStyle={styles.item}
                    data={MEDIAN_EVERY_OPTIONS}
                    placeholder={!isRespFilterFocus ? 'Select respiration filter' : '...'}
                    value={medianEvery}
                    onChange={(v: any) => {
                      onChangeMedianEvery(v.value);
                    }}
                    labelField="label"
                    valueField="value"
                    onFocus={() => setRespFilterFocus(true)}
                    onBlur={() => setRespFilterFocus(false)}
                  />
                </View>
                <View style={styles.dropdownContainer}>
                  {renderLabel('medianOn')}
                  <Dropdown
                    style={[styles.dropdown, isRespFilterFocus && { borderColor: Colors.active }]}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    itemTextStyle={styles.item}
                    data={MEDIAN_ON_OPTIONS}
                    placeholder={!isRespFilterFocus ? 'Select respiration filter' : '...'}
                    value={medianOn}
                    onChange={(v: any) => {
                      onChangeMedianOn(v.value);
                    }}
                    labelField="label"
                    valueField="value"
                    onFocus={() => setRespFilterFocus(true)}
                    onBlur={() => setRespFilterFocus(false)}
                  />
                </View>

              </>
            )}
            <View style={{ height: 30 }} />

          </>

        )}

        {serviceUUID?.toLocaleLowerCase().includes(TemperatureServiceUuid) && characteristicView === 'specific' && (
          <>
            <Separator text="Graph Settings" textStyles={{ fontWeight: 'bold' }} textProps={{ h4: true }} />
            <View style={styles.dropdownContainer}>
              {renderLabel('tempUnits')}
              <Dropdown
                style={[styles.dropdown, isTempUnitsFocus && { borderColor: Colors.active }]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                itemTextStyle={styles.item}
                data={TEMP_UNITS_OPTIONS}
                placeholder={!isTempUnitsFocus ? 'Select temperature units' : '...'}
                value={tempUnits}
                onChange={(v: any) => {
                  onChangeTempUnits(v.value);
                }}
                labelField="label"
                valueField="value"
                onFocus={() => setTempUnitsFocus(true)}
                onBlur={() => setTempUnitsFocus(false)}
              />
            </View>
            <View style={styles.dropdownContainer}>
              {renderLabel('scaleLsb')}
              <TextInput
                keyboardType='numeric'
                value={scaleLSB}
                style={[styles.textInput]}
                onChangeText={(v: any) => {
                  onChangeScaleLsb(v);
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', marginTop: 20, flex: 1 }}>
              <MaterialCommunityIcons name='lightbulb-on-outline' size={20} style={{ alignSelf: 'center' }} />
              <Text style={{ alignSelf: 'center' }}> For ECG Patch use: 0.0078125 </Text>
            </View>
            <View style={{ flexDirection: 'row', flex: 1 }}>
              <MaterialCommunityIcons name='lightbulb-on-outline' size={20} style={{ alignSelf: 'center' }} />
              <Text style={{ alignSelf: 'center' }}> For SensorTag use: 0.03125</Text>
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
                value={characteristicView === 'advanced'}
                onValueChange={handleToggleView}
              />
            </View>
          </>
        )}

        {serviceName?.toUpperCase() === 'TI OAD' && characteristicView === 'specific' && (
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
              <Text allowFontScaling adjustsFontSizeToFit style={{ color: Colors.blue }}>Enter Stress Test Mode</Text>
            </TouchableOpacity>
          </>
        )}

        {!hasSpecificScreen && !hasTestOption && (
          <View style={{ alignItems: 'center' }}>
            <View style={{ height: 30 }} />

            <Text style={{ alignSelf: 'center' }}> No settings are available</Text>
          </View>
        )}
      </KeyboardAwareScrollView >
    </View >
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
  },
  textInput: {
    height: 40,
    borderColor: Colors.gray,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 16,
  }
});

export default CharacteristicsSettingsDrawer;
