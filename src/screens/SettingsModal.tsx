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

import { useCallback, useContext, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Switch, TouchableOpacity, View } from '../components/Themed';
import { Text } from '../components/Themed';
import { FilterSortDispatch, FilterSortState } from '../context/FilterSortContext';
import { TextInput as Input, StyleSheet } from 'react-native';
import Separator from '../components/Separator';
import { EnablerActionTypes, ValueActionTypes } from '../reducers/FilterSortReducer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import Colors from '../constants/Colors';

interface Props extends DrawerContentComponentProps { }

const SettingsModal: React.FC<Props> = () => {
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [RSSIsort, setRSSISort] = useState<boolean>(true);

  useEffect(() => {
    let checkTutorial = async () => {
      try {
        let data = await AsyncStorage.getItem('@tutorial');

        if (!data) throw Error('Tutorial shown!');

        setShowTutorial(true);
      } catch (error) {
        setShowTutorial(false);
      }
    };

    let checkSort = async () => {
      try {
        let data = await AsyncStorage.getItem('@rssi');
        if (!data) throw Error('RSSI Sort did not selected!');
        setRSSISort(true);
        switchDispatch(true, 'sort/rssi/set/enabled');

      } catch (error) {
        setRSSISort(false);
      }
    };
    checkTutorial();
    checkSort();
  }, []);

  let fsContext = useContext(FilterSortState);
  let fsDispatch = useContext(FilterSortDispatch);

  const switchDispatch = useCallback((value: boolean, type: EnablerActionTypes) => {
    console.info(`[Dispatch] Action ${type} with value: ${value}`);
    fsDispatch!({ type: type, payload: value });
  }, []);

  const inputDispatch = useCallback((value: string, type: ValueActionTypes) => {
    console.info(`[Dispatch] Action ${type} with value: ${value}`);
    fsDispatch!({ type: type, payload: value });
  }, []);

  const changeTutorialState = async (value: boolean) => {
    console.log(value);

    if (value) {
      setShowTutorial(value);
      await AsyncStorage.setItem('@tutorial', JSON.stringify(true));
      return;
    } else {
      setShowTutorial(value);
      await AsyncStorage.removeItem('@tutorial');
      return;
    }
  };

  const changeRRSISortState = async (value: boolean) => {
    console.log(value);
    setRSSISort(value);
    if (value) {
      await AsyncStorage.setItem('@rssi', JSON.stringify(true));
      return;
    } else {
      await AsyncStorage.removeItem('@rssi');
      return;
    }
  };

  return (
    <SafeAreaView style={{ height: '100%' }} >
      <KeyboardAwareScrollView scrollIndicatorInsets={{ right: 1 }} >
        <View style={{ marginHorizontal: 20 }}>
          <View style={{ paddingTop: 5 }}>
            <Separator text="Settings" textStyles={{ fontWeight: 'bold' }} textProps={{ h4: true }} />
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: 10,
              }}
            >
              <Text style={{ paddingRight: 10 }}>Skip tutorial at start:</Text>
              <Switch
                style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}
                value={showTutorial}
                onValueChange={(value) => {
                  changeTutorialState(value);
                }}
              />
            </View>
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: 10,
              }}
            >
            </View>
          </View>
          <View style={{ display: 'flex', flexDirection: 'column', paddingTop: 10, paddingBottom: 20 }}>
            <Separator text="Sort" textStyles={{ fontWeight: 'bold' }} textProps={{ h4: true }} />
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: 10,
              }}
            >
              <Text style={{}}>RSSI</Text>
              <Switch
                style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}
                value={RSSIsort}
                onValueChange={(value) => {
                  changeRRSISortState(value)
                  switchDispatch(value, 'sort/rssi/set/enabled');
                  if (value) {
                    switchDispatch(false, 'sort/app_name/set/enabled');
                  }
                }}
              />
            </View>
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: 5,
              }}
            >
              <Text style={{ paddingRight: 10 }}>App name</Text>
              <Switch
                style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}
                value={fsContext.sort.app_name}
                onValueChange={(value) => {
                  changeRRSISortState(!value)
                  switchDispatch(value, 'sort/app_name/set/enabled');
                  if (value) {
                    switchDispatch(false, 'sort/rssi/set/enabled');
                  }
                }}
              />
            </View>
          </View>
          <View style={{ display: 'flex', flexDirection: 'column', paddingTop: 10, paddingBottom: 20 }}>
            <Separator text="Filter" textStyles={{ fontWeight: 'bold' }} textProps={{ h4: true }} />
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: 10,
              }}
            >
              <Text>RSSI</Text>
              <Input
                value={fsContext.filter.rssi.value}
                onChangeText={(e) => inputDispatch(e, 'filter/rssi/set/value')}
                style={[styles.input, { width: '20%' }]}
              />
              <Text>dBm</Text>
              <Switch
                style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}
                value={fsContext.filter.rssi.enabled}
                onValueChange={(value) => switchDispatch(value, 'filter/rssi/set/enabled')}
              />
            </View>
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: 10,
              }}
            >
              <Text>App Name</Text>
              <Input
                keyboardType="numbers-and-punctuation"
                value={fsContext.filter.app_name.value}
                style={[styles.input, { flex: 1 }]}
                onChangeText={(e) => inputDispatch(e, 'filter/app_name/set/value')}
              />
              <Switch
                style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}
                value={fsContext.filter.app_name.enabled}
                onValueChange={(value) => switchDispatch(value, 'filter/app_name/set/enabled')}
              />
            </View>
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
              }}
            >
              <Text style={{ paddingRight: 10 }}>Connectable</Text>
              <Switch
                style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}
                value={fsContext.filter.connectable}
                onValueChange={(value) => switchDispatch(value, 'filter/connectable/set/enabled')}
              />
            </View>
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
              }}
            >
              <Text style={{ paddingRight: 10 }}>Remove inactive devices</Text>
              <Switch
                style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}
                value={fsContext.filter.removeInactiveOutDevices}
                onValueChange={(value) => switchDispatch(value, 'filter/removeInactiveOutDevices/set/enabled')}
              />
            </View>
          </View>
          <View style={{ display: 'flex', flexDirection: 'column', paddingTop: 10, paddingBottom: 20 }}>
            <Separator text="About" textStyles={{ fontWeight: 'bold' }} textProps={{ h4: true }} />
            <Text style={{ textAlign: 'center', paddingTop: 20 }}>
              This application connects your SimpleLink(TM) devices to your smartphone with Bluetooth Low Energy support.
              Support for Over-the-Air upgrades for the CC23xx LaunchPad development kits are included.
            </Text>
            <Text style={{ textAlign: 'center', paddingTop: 10 }}><Text style={{ color: Colors.blue }}>Version: </Text>1.3.4</Text>
            <Text style={{ textAlign: 'center', paddingTop: 10 }}><Text style={{ color: Colors.blue }}>Developed by: </Text>Texas Instruments</Text>
            <Text style={{ textAlign: 'center', paddingTop: 10 }}><Text style={{ color: Colors.blue }}>Credits: </Text>Tony Cave (Bluwbee LTD)</Text>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: 'rgba(230, 230, 230, 0.3)',
    paddingVertical: 5,
    paddingHorizontal: 5,
    marginHorizontal: 10,
    borderRadius: 5,
  },
});

export default SettingsModal;
