import { KeyboardAvoidingView, View, TextInput as Input, Platform, } from 'react-native';
import { Text } from '../components/Themed';
import { StyleSheet } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { useCallback, useContext, useEffect, useState } from 'react';
import { Divider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FilterSortScreenProps, } from '../../types';
import Colors from '../constants/Colors';
import { FilterSortState, FilterSortDispatch } from '../context/FilterSortContext';
import { useProfilesContext } from '../context/ProfileListContext';
import { EnablerActionTypes, ValueActionTypes } from '../reducers/FilterSortReducer';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ScrollView } from 'react-native-gesture-handler';
import { Switch } from 'react-native-paper';

interface Props extends FilterSortScreenProps { };

const FilterSortOptionsScreen: React.FC<Props> = () => {
  const [RSSIsort, setRSSISort] = useState<boolean>(true);
  const [AppNameSort, setAppNameSort] = useState<boolean>(true);
  const { profileList, loading } = useProfilesContext();

  useEffect(() => {

    let checkSort = async () => {
      try {
        let rssi = await AsyncStorage.getItem('@rssi');
        let app_name = await AsyncStorage.getItem('@app_name');
        if (!rssi && !app_name) throw Error('RSSI Sort did not selected!');
        console.log(rssi, app_name);
        if (rssi) {
          setRSSISort(true);
          switchDispatch(true, 'sort/rssi/set/enabled');
          setAppNameSort(false);
        }
        else if (app_name) {
          setAppNameSort(true);
          switchDispatch(true, 'sort/app_name/set/enabled');
          setRSSISort(false);

        }

      } catch (error) {
        setRSSISort(false);
        setAppNameSort(false);
      }
    };
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

  const changeRRSISortState = async (value: boolean) => {
    console.log(value);
    setRSSISort(value);
    if (value) {
      changeAppNameSortState(!value)
      await AsyncStorage.setItem('@rssi', JSON.stringify(true));
      return;
    } else {
      await AsyncStorage.removeItem('@rssi');
      return;
    }
  };

  const changeAppNameSortState = async (value: boolean) => {
    setAppNameSort(value);

    if (value) {
      changeRRSISortState(!value)
      await AsyncStorage.setItem('@app_name', JSON.stringify(true));
      return;
    } else {
      await AsyncStorage.removeItem('@app_name');
      return;
    }
  };

  const handleAddressChange = (text) => {
    if (!text) {
      inputDispatch('', 'filter/address/set/value')
      return;
    }
    // Remove all non-hex characters
    let cleaned = text.replace(/[^0-9A-Fa-f]/g, '');
    // Format into address
    let formatted = cleaned.match(/.{1,2}/g)?.join(':') || '';
    // Limit to 12 characters
    if (formatted.length > 17) {
      formatted = formatted.slice(0, 17);
    }

    inputDispatch(formatted, 'filter/address/set/value')
  };

  return (
    <KeyboardAvoidingView style={[styles.container]}>
      <ScrollView style={{ flex: 1, }}>

        {/* Sort */}
        <View style={styles.sectionHeader}>
          <Icon name="sort" size={24} style={styles.icon} />
          <Text style={styles.sectionTitle}>Sort Options</Text>
        </View>
        <Text style={styles.sectionDescription}>Choose how you want to sort the list of devices:</Text>
        <View style={[styles.optionsBox]}>
          <View style={[styles.item]}>
            <Text style={[styles.title]}>RSSI</Text>
            <Switch
              color={Colors.active}
              value={RSSIsort}
              onValueChange={(value) => {
                changeRRSISortState(value);
                switchDispatch(value, 'sort/rssi/set/enabled');
                if (value) {
                  switchDispatch(false, 'sort/app_name/set/enabled');
                }
              }}
            />
          </View>
          <Divider />
          <View style={[styles.item]}>
            <Text style={[styles.title]}>App name</Text>
            <Switch
              color={Colors.active}
              value={AppNameSort}
              onValueChange={(value) => {
                changeAppNameSortState(value)
                switchDispatch(value, 'sort/app_name/set/enabled');
                if (value) {
                  switchDispatch(false, 'sort/rssi/set/enabled');
                }
              }}
            />
          </View>
        </View>

        {/* Filter */}
        <View style={styles.sectionHeader}>
          <Icon name="filter-list" size={24} style={styles.icon} />
          <Text style={styles.sectionTitle}>Filter Options</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Specify criteria to filter the list of devices:
        </Text>
        <View style={styles.optionsBox}>
          <View style={styles.item}>
            <Text style={[styles.title]}>RSSI</Text>
            <Input
              editable={fsContext.filter.rssi.enabled}
              value={fsContext.filter.rssi.value}
              onChangeText={(e) => inputDispatch(e, 'filter/rssi/set/value')}
              style={[styles.input, { marginLeft: 15, width: '20%', opacity: fsContext.filter.rssi.enabled ? 1 : 0.5 }]}
            />
            <Text style={{ opacity: fsContext.filter.rssi.enabled ? 1 : 0.5 }}>dBm</Text>
            <Switch
              style={{ marginLeft: 'auto' }}
              value={fsContext.filter.rssi.enabled}
              color={Colors.active}
              onValueChange={(value) => switchDispatch(value, 'filter/rssi/set/enabled')}
            />
          </View>
          <Divider />
          <View style={styles.item}
          >
            <Text style={[styles.title]}>App Name</Text>
            <Input
              editable={fsContext.filter.app_name.enabled}
              keyboardType="numbers-and-punctuation"
              value={fsContext.filter.app_name.value}
              style={[styles.input, { flex: 1, marginLeft: 5, opacity: fsContext.filter.app_name.enabled ? 1 : 0.5 }]}
              onChangeText={(e) => inputDispatch(e, 'filter/app_name/set/value')}
            />
            <Switch
              color={Colors.active}
              value={fsContext.filter.app_name.enabled}
              onValueChange={(value) => switchDispatch(value, 'filter/app_name/set/enabled')}
            />
          </View>
          {Platform.OS === 'android' && (
            <>
              <Divider />
              <View style={styles.item}
              >
                <Text style={[styles.title]}>Address</Text>
                <Input
                  editable={fsContext.filter.address.enabled}
                  keyboardType="numbers-and-punctuation"
                  value={fsContext.filter.address.value}
                  style={[styles.input, { flex: 1, marginLeft: 5, opacity: fsContext.filter.address.enabled ? 1 : 0.5 }]}
                  onChangeText={handleAddressChange}
                />
                <Switch
                  color={Colors.active}
                  value={fsContext.filter.address.enabled}
                  onValueChange={(value) => switchDispatch(value, 'filter/address/set/enabled')}
                />
              </View>
            </>
          )}
          <Divider />
          <View style={styles.item}>
            <Text style={styles.title}>Profile</Text>
            <Switch
              color={Colors.active}
              value={fsContext.filter.profile.enabled}
              onValueChange={(value) => switchDispatch(value, 'filter/profile/set/enabled')}
            />
          </View>
          {!loading && fsContext.filter.profile.enabled && (
            <Dropdown
              disable={!fsContext.filter.profile.enabled}
              style={[styles.dropdown]}
              selectedTextStyle={styles.selectedTextStyle}
              placeholderStyle={styles.placeholderStyle}
              itemTextStyle={styles.dropItem}
              data={profileList}
              value={fsContext.filter.profile.value}
              onChange={(v: any) => {
                inputDispatch(v.uuid, 'filter/profile/set/value')
              }}
              labelField="name"
              valueField="uuid"
              placeholder='Select Profile'
              maxHeight={300}
              searchPlaceholder="Search..."
              search
              inputSearchStyle={styles.inputSearchStyle}
            />
          )}
          <Divider />
          <View style={styles.item}>
            <Text style={styles.title}>Connectable</Text>
            <Switch
              color={Colors.active}
              value={fsContext.filter.connectable}
              onValueChange={(value) => switchDispatch(value, 'filter/connectable/set/enabled')}
            />
          </View>
          <Divider />
          <View style={styles.item}>
            <Text allowFontScaling adjustsFontSizeToFit style={[styles.title, { flex: 1 }]}>Remove inactive devices</Text>
            <Switch
              color={Colors.active}
              value={fsContext.filter.removeInactiveOutDevices}
              onValueChange={(value) => switchDispatch(value, 'filter/removeInactiveOutDevices/set/enabled')}
            />
          </View>
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
  dataBox: {
    backgroundColor: 'white',
    marginBottom: 15,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderRadius: 10,
    height: 50,
    alignItems: 'center',
  },
  item: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  data: {
    fontSize: 16,
  },
  input: {
    backgroundColor: 'rgba(230, 230, 230, 0.3)',
    borderRadius: 5,
    height: 30,
    marginRight: 10,
  },
  dropdown: {
    marginBottom: 15,
    paddingHorizontal: 16,
    width: '90%',
    height: 35,
    borderColor: Colors.gray,
    borderWidth: 1,
    alignSelf: 'center',
    borderRadius: 4,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 12,
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
    // height: 20
  }
})

export default FilterSortOptionsScreen;
