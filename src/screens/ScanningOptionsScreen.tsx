import { KeyboardAvoidingView, View, TextInput as Input, Platform } from 'react-native';
import { Text } from '../components/Themed';
import { StyleSheet } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { useContext } from 'react';
import { Divider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScanningOptionsScreenProps } from '../../types';
import Colors from '../constants/Colors';
import { ScanOptionsState, ScanOptionsDispatch } from '../context/ScanOptionsContext';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView } from 'react-native-gesture-handler';
import { Switch } from 'react-native-paper';

interface Props extends ScanningOptionsScreenProps { }

const PHY_OPTIONS = [
  { label: 'No Preference', value: 0 },
  { label: '1M', value: 1 },
  { label: '2M', value: 2 },
  { label: 'LE Coded', value: 3 },
];

const ScanningOptionsScreen: React.FC<Props> = () => {
  const scanOptions = useContext(ScanOptionsState);
  const scanOptionsDispatch = useContext(ScanOptionsDispatch);

  const handleScanDurationChange = async (value: string) => {
    const numValue = parseInt(value, 10) || 10;
    scanOptionsDispatch!({ type: 'scanOptions/scanDuration/set', payload: numValue });
    await AsyncStorage.setItem('@scanOptions/scanDuration', String(numValue));
  };

  const handleLegacyModeChange = async (value: boolean) => {
    scanOptionsDispatch!({ type: 'scanOptions/legacyMode/set', payload: value });
    await AsyncStorage.setItem('@scanOptions/legacyMode', String(value));
  };

  const handleScanPhyChange = async (value: number) => {
    scanOptionsDispatch!({ type: 'scanOptions/scanPhy/set', payload: value });
    await AsyncStorage.setItem('@scanOptions/scanPhy', String(value));
  };

  const handleConnectionTimeoutChange = async (value: string) => {
    const numValue = parseInt(value, 10) || 15;
    scanOptionsDispatch!({ type: 'scanOptions/connectionTimeout/set', payload: numValue });
    await AsyncStorage.setItem('@scanOptions/connectionTimeout', String(numValue));
  };

  const handleConnectionPhyChange = async (value: number) => {
    scanOptionsDispatch!({ type: 'scanOptions/connectionPhy/set', payload: value });
    await AsyncStorage.setItem('@scanOptions/connectionPhy', String(value));
  };

  return (
    <KeyboardAvoidingView style={[styles.container]}>
      <ScrollView style={{ flex: 1 }}>
        {/* Scan Options */}
        <View style={styles.sectionHeader}>
          <MaterialIcons name="bluetooth-searching" size={24} style={styles.icon} />
          <Text style={styles.sectionTitle}>Scan Options</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Configure BLE scanning parameters
        </Text>
        <View style={styles.optionsBox}>
          <View style={styles.item}>
            <Text style={[styles.title]}>Scan Duration</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', height: "100%" }}>
              <Input
                value={String(scanOptions.scanDuration)}
                onChangeText={handleScanDurationChange}
                keyboardType="numeric"
                style={[styles.input, { width: 60, marginRight: 10, textAlign: 'center' }]}
              />
              <Text>sec</Text>
            </View>
          </View>
          {Platform.OS === 'android' && (
            <>
              <Divider />
              <View style={styles.item}>
                <Text style={[styles.title]}>Legacy Mode</Text>
                <Switch
                  style={{ alignSelf: 'center' }}
                  color={Colors.active}
                  value={scanOptions.legacyMode}
                  onValueChange={handleLegacyModeChange}
                />
              </View>
              <Divider />
              <View style={styles.item}>
                <Text style={styles.title}>Scan PHY</Text>
                <Dropdown
                  style={[styles.dropdown]}
                  selectedTextStyle={styles.selectedTextStyle}
                  placeholderStyle={styles.placeholderStyle}
                  itemTextStyle={styles.dropItem}
                  containerStyle={styles.dropdownContainer}
                  data={PHY_OPTIONS}
                  value={scanOptions.scanPhy}
                  onChange={(v: any) => handleScanPhyChange(v.value)}
                  labelField="label"
                  valueField="value"
                  placeholder='Select PHY'
                  maxHeight={200}
                  dropdownPosition='auto'
                />
              </View>
            </>
          )}
        </View>

        {/* Connection Options */}
        <View style={[styles.sectionHeader, { marginTop: 20 }]}>
          <MaterialIcons name="bluetooth-connected" size={24} style={styles.icon} />
          <Text style={styles.sectionTitle}>Connection Options</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Configure BLE connection parameters
        </Text>
        <View style={styles.optionsBox}>
          <View style={styles.item}>
            <Text style={[styles.title]}>Connection Timeout</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', height: "100%" }}>
              <Input
                value={String(scanOptions.connectionTimeout)}
                onChangeText={handleConnectionTimeoutChange}
                keyboardType="numeric"
                style={[styles.input, { width: 60, marginRight: 10, textAlign: 'center' }]}
              />
              <Text>sec</Text>
            </View>
          </View>
          {Platform.OS === 'android' && (
            <>
              <Divider />
              <View style={styles.item}>
                <Text style={styles.title}>Connection PHY</Text>
                <Dropdown
                  style={[styles.dropdown]}
                  selectedTextStyle={styles.selectedTextStyle}
                  placeholderStyle={styles.placeholderStyle}
                  itemTextStyle={styles.dropItem}
                  containerStyle={styles.dropdownContainer}
                  data={PHY_OPTIONS}
                  value={scanOptions.connectionPhy}
                  onChange={(v: any) => handleConnectionPhyChange(v.value)}
                  labelField="label"
                  valueField="value"
                  placeholder='Select PHY'
                  maxHeight={200}
                  dropdownPosition='auto'
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  icon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 5,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 10,
    color: Colors.gray,
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignContent: 'center',
    height: '100%',
    backgroundColor: Colors.lightGray
  },
  item: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignContent: 'center',
    paddingHorizontal: 15,
    height: 50,
  },
  optionsBox: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 15,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'rgba(230, 230, 230, 0.3)',
    borderRadius: 5,
    height: "70%"
  },
  dropdown: {
    paddingHorizontal: 16,
    flex: 1,
    height: 35,
    borderColor: Colors.gray,
    borderWidth: 1,
    alignSelf: 'center',
    marginLeft: 10,
    borderRadius: 4,
    maxWidth: "60%"
  },
  selectedTextStyle: {
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0.25,
  },
  placeholderStyle: {
    fontSize: 14,
  },
  dropItem: {
    fontSize: 14,
  },
  dropdownContainer: {
    borderRadius: 8,
  }
});

export default ScanningOptionsScreen;
