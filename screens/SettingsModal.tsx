import { useCallback, useContext, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Switch, TouchableOpacity, View } from '../components/Themed';
import { Text } from '@rneui/themed';
import { FilterSortDispatch, FilterSortState } from '../context/FilterSortContext';
import { TextInput as Input, StyleSheet } from 'react-native';
import Separator from '../src/components/Separator';
import { EnablerActionTypes, ValueActionTypes } from '../reducers/FilterSortReducer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import Colors from '../constants/Colors';

interface Props extends DrawerContentComponentProps {}

const SettingsModal: React.FC<Props> = () => {
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [repository, setRepository] = useState<string>(
    'https://github.com/TexasInstruments/simplelink-connect/raw/master/fw-images'
  );

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

    let checkRepository = async () => {
      try {
        let data = await AsyncStorage.getItem('@repository');

        if (!data) throw Error('No repository!');

        setRepository(data);
      } catch (error) {
        setRepository('https://github.com/TexasInstruments/simplelink-connect/raw/master/fw-images');
      }
    };

    checkRepository();
    checkTutorial();
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

  const saveRepository = async (value: string) => {
    if (!value || value == '' || value.length == 0) {
      AsyncStorage.removeItem('@repository');
      setRepository('https://github.com/TexasInstruments/simplelink-connect/raw/master/fw-images');
      return;
    }
    if (!value || value == '.' || value.length == 1) {
      AsyncStorage.removeItem('@repository');
      setRepository('https://github.com/Bluwbee/ti-simplelink-connect-fw-bins/raw/master/');
      return;
    }
    AsyncStorage.setItem('@repository', value);
    setRepository(value);
  };

  return (
    <SafeAreaView style={{ marginHorizontal: 20, height: '100%' }}>
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
          <Text>FW Update URL</Text>
          <Input
            keyboardType="default"
            value={repository}
            style={[styles.input, { flex: 1 }]}
            onChangeText={(e) => {
              saveRepository(e);
            }}
          />
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
            value={fsContext.sort.rssi}
            onValueChange={(value) => {
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
      </View>
      <View style={{ display: 'flex', flexDirection: 'column', paddingTop: 10, paddingBottom: 20 }}>
        <Separator text="About" textStyles={{ fontWeight: 'bold' }} textProps={{ h4: true }} />
        <Text style={{textAlign:'center', paddingTop: 20}}>
          This application connects your SimpleLink(TM) devices to your smartphone with Bluetooth Low Energy support.
          Support for Over-the-Air upgrades for the CC23xx LaunchPad development kits are included.
        </Text>
        <Text style={{textAlign:'center', paddingTop: 10}}><Text style={{color:Colors.blue}}>Version: </Text>1.1.0</Text>
        <Text style={{textAlign:'center', paddingTop: 10}}><Text style={{color:Colors.blue}}>Developed by: </Text>Texas Instruments</Text>
        <Text style={{textAlign:'center', paddingTop: 10}}><Text style={{color:Colors.blue}}>Credits: </Text>Tony Cave (Bluwbee LTD)</Text>
      </View>
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
