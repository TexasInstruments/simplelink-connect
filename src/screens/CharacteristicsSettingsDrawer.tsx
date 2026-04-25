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

import { useCallback, useState } from 'react';
import { Switch, View } from '../components/Themed';
import { Text } from '../components/Themed';
import { TextInput as Input, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, useWindowDimensions } from 'react-native';
import Separator from '../components/Separator';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { TerminalConfig, useTerminalConfigContext } from '../context/TerminalOptionsContext';
import { useFocusEffect } from '@react-navigation/native';
import { useCharacteristicViewContext } from '../context/CharactristicViewContext';
import Colors from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { SpecificScreenConfig, useSpecificScreenConfigContext } from '../context/SpecificScreenOptionsContext';
import { Dropdown } from 'react-native-element-dropdown';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export const CS_UPDATE_RATE_OPTIONS = [
  { value: 3, label: 'Frequent (100 milliseconds)' },
  { value: 1, label: 'Normal (200 milliseconds)' },
  { value: 2, label: 'Infrequent (5 seconds)' },
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
  const [continuousNotifications, setContinuousNotifications] = useState<boolean>(terminalConfig.continuousNotifications);

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

  // HT + CGM Test
  const [disconnectInInterval, setDisconnectInInterval] = useState<boolean>(false);

  // CGM Test
  const [showCgmData, setShowCgmData] = useState<boolean>(specificScreenConfig.showCgmData);

  // Channel Sounding
  const [csRangingUpdateRate, setCsRangingUpdateRate] = useState<number>(specificScreenConfig.csRangingUpdateRate);
  const [isCsUpdateRateFocus, setIsCsUpdateRateFocus] = useState<boolean>(false);

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

  const EcgUUID = 'f000bb00-0451-4000-b000-000000000000';
  const TemperatureServiceUUID = 'aa00';
  const HTServiceUUID = '1809';
  const CgmTestServiceUUID = '1100';
  const ChannelSoundingServiceUUID = '185b';

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
      setDisconnectInInterval(specificScreenConfig.disconnectInInterval);
      setCsRangingUpdateRate(specificScreenConfig.csRangingUpdateRate);
    }, [specificScreenConfig])

  );
  // Terminal configuration
  const changeTimestampState = async (value: boolean) => {

    setShowTimestamp(value);

    let newConfig: TerminalConfig = {
      timestamp: value,
      messageLength: showMessageLength,
      disabledLocalEcho: disableLocalEcho,
      continuousNotifications: continuousNotifications
    }

    updateTermninalConfigurations(newConfig);

  };

  const changeDisableLocalEchoState = async (value: boolean) => {
    setdisableLocalEcho(value);

    let newConfig: TerminalConfig = {
      timestamp: showTimestamp,
      messageLength: showMessageLength,
      continuousNotifications: continuousNotifications,
      disabledLocalEcho: value
    }
    updateTermninalConfigurations(newConfig);
  };

  const changeContinuousNotificationsState = async (value: boolean) => {
    setContinuousNotifications(value);

    let newConfig: TerminalConfig = {
      timestamp: showTimestamp,
      messageLength: showMessageLength,
      continuousNotifications: value,
      disabledLocalEcho: disableLocalEcho
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

  const onChangeDisconnectOnInterval = async (value: any) => {
    setDisconnectInInterval(value);
    updateConfig({ disconnectInInterval: value })
  };

  const onChangeShowCgmData = async (value: any) => {
    setShowCgmData(value);
    updateConfig({ showCgmData: value })
  };

  const onChangeCsRangingUpdateRate = async (value: number) => {
    setIsCsUpdateRateFocus(false);
    setCsRangingUpdateRate(value);
    updateConfig({ csRangingUpdateRate: value })
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
      disconnectInInterval: disconnectInInterval,
      medianEvery: medianEvery,
      medianOn: medianOn,
      showCgmData: showCgmData,
      csRangingUpdateRate: csRangingUpdateRate,
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
    navigation.navigate('TestParameters', { testService: serviceName, peripheralId: periNameId.peripheralId, peripheralName: periNameId.peripheralName }, { pop: true });
  }

  // OAD configuration
  function handleSetRepoURL() {
    navigation.closeDrawer(); // Close the drawer
    navigation.navigate('ConfigRepository', { pop: true });
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
    <SafeAreaView
      style={{ height: '100%' }}
    // behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, marginHorizontal: 15 }}>
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
            <View
              style={[styles.configContainer,]}>
              <Text allowFontScaling adjustsFontSizeToFit style={{ fontSize: 16 / fontScale }}>Continuous Notifications</Text>
              <Switch
                value={continuousNotifications}
                onValueChange={(value) => {
                  changeContinuousNotificationsState(value);
                }}
              />
            </View>
            <View style={{ height: 30 }} />
          </>

        )}

        {(serviceUUID?.toLocaleLowerCase() === Wifi_Provisioning_UUID || serviceUUID?.toLocaleLowerCase() === Wifi_Provisioning_UUID_linux) && characteristicView === 'specific' && (
          <>
            <Separator text="Connection Timeout" textStyles={{ fontWeight: 'bold' }} textProps={{ h4: true }} />
            <View style={[styles.dropdownContainer, { marginBottom: 20 }]}>
              <Dropdown
                style={[styles.dropdown, isConnectionTimeoutFocused && { borderColor: Colors.active }]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                itemTextStyle={styles.item}
                data={CONNECTION_TIMEOUT_OPTIONS}
                placeholder={!isConnectionTimeoutFocused ? 'Select Timeout' : '...'}
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

        {serviceUUID?.toLocaleLowerCase() === EcgUUID && characteristicView === 'specific' && (
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

        {serviceUUID?.toLocaleLowerCase().includes(TemperatureServiceUUID) && characteristicView === 'specific' && (
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
                keyboardType='number-pad'
                returnKeyType="done"
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

        {serviceUUID?.toLocaleLowerCase().includes(HTServiceUUID) && characteristicView === 'specific' && (
          <>
            <Separator text="Health Thermometer Settings" textStyles={{ fontWeight: 'bold' }} textProps={{ h4: true }} />
            <View style={[styles.configContainer]}>
              <Text style={{ fontSize: 16 / fontScale, flex: 1 }}>Disconnect and reconnect each interval</Text>
              <Switch
                value={disconnectInInterval}
                onValueChange={(value) => {
                  onChangeDisconnectOnInterval(value);
                }}
              />
            </View>
          </>

        )}

        {serviceUUID?.toLocaleLowerCase().includes(CgmTestServiceUUID) && characteristicView === 'specific' && (
          <>
            <Separator text="CGM Settings" textStyles={{ fontWeight: 'bold' }} textProps={{ h4: true }} />
            <View style={[styles.configContainer,]}>
              <Text style={{ fontSize: 16 / fontScale, flex: 1 }}>Display Glucose</Text>
              <Switch
                value={showCgmData}
                onValueChange={(value) => {
                  onChangeShowCgmData(value);
                }}
              />
            </View>
            <View style={[styles.configContainer, { marginBottom: 20 }]}>
              <Text style={{ fontSize: 16 / fontScale, flex: 1 }}>Disconnect and reconnect each interval</Text>
              <Switch
                value={disconnectInInterval}
                onValueChange={(value) => {
                  onChangeDisconnectOnInterval(value);
                }}
              />
            </View>
          </>

        )}

        {serviceUUID?.toLocaleLowerCase().includes(ChannelSoundingServiceUUID) && characteristicView === 'specific' && (
          <>
            <Separator text="Channel Sounding Settings" textStyles={{ fontWeight: 'bold' }} textProps={{ h4: true }} />
            <View style={[styles.dropdownContainer, { marginBottom: 20 }]}>
              <Text allowFontScaling={false} style={[styles.label, isCsUpdateRateFocus && { color: Colors.active }]}>
                Ranging Interval
              </Text>
              <Dropdown
                style={[styles.dropdown, isCsUpdateRateFocus && { borderColor: Colors.active }]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                itemTextStyle={styles.item}
                data={CS_UPDATE_RATE_OPTIONS}
                placeholder={!isCsUpdateRateFocus ? 'Select Update Rate' : '...'}
                value={csRangingUpdateRate}
                onChange={(v: any) => {
                  onChangeCsRangingUpdateRate(v.value)
                }}
                labelField="label"
                valueField="value"
                onFocus={() => setIsCsUpdateRateFocus(true)}
                onBlur={() => setIsCsUpdateRateFocus(false)}
              />
            </View>
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
              <Ionicons name="git-network-outline" size={20} color={Colors.blue} style={styles.icon} />
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
              <Ionicons name="flask" size={20} color={Colors.blue} style={styles.icon} />
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
      </ScrollView >
    </SafeAreaView>
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
