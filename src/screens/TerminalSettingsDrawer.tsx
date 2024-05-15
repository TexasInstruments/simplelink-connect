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
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Switch, View } from '../components/Themed';
import { Text } from '../components/Themed';
import { TextInput as Input, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import Separator from '../components/Separator';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { TerminalConfig, useTerminalConfigContext } from '../context/TerminalOptionsContext';
import { useFocusEffect } from '@react-navigation/native';

interface Props extends DrawerContentComponentProps { }

const TerminalSettingsDrawer: React.FC<Props> = () => {
  const { config, updateTermninalConfigurations } = useTerminalConfigContext();

  const [showTimestamp, setShowTimestamp] = useState<boolean>(config.timestamp);
  const [showMessageLength, setShowMessageLength] = useState<boolean>(config.messageLength);
  const [disableLocalEcho, setdisableLocalEcho] = useState<boolean>(config.disabledLocalEcho);

  const { fontScale } = useWindowDimensions();

  useFocusEffect(
    useCallback(() => {
      setShowMessageLength(config.messageLength);
      setShowTimestamp(config.timestamp);
      setdisableLocalEcho(config.disabledLocalEcho)
    }, [config])
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

  return (
    <View style={{ paddingTop: 10, marginLeft: Platform.OS == 'android' ? 0 : 25 }}>
      <KeyboardAwareScrollView style={{ marginLeft: 20 }} >
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
  }
});

export default TerminalSettingsDrawer;
