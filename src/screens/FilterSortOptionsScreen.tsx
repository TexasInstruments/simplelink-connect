import { KeyboardAvoidingView, View, TextInput as Input, Platform, TouchableOpacity, } from 'react-native';
import { Text } from '../components/Themed';
import { StyleSheet } from 'react-native';
import { Dropdown, MultiSelect } from 'react-native-element-dropdown';
import { useCallback, useContext, useEffect, useState, useMemo } from 'react';
import { Divider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FilterSortScreenProps, } from '../../types';
import Colors from '../constants/Colors';
import { FilterSortState, FilterSortDispatch } from '../context/FilterSortContext';
import { useProfilesContext } from '../context/ProfileListContext';
import { EnablerActionTypes, ValueActionTypes } from '../reducers/FilterSortReducer';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import { ScrollView } from 'react-native-gesture-handler';
import { Switch } from 'react-native-paper';
import { brands } from '../assets/manufacturerData';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

interface Props extends FilterSortScreenProps { };

const FilterSortOptionsScreen: React.FC<Props> = () => {
  const [RSSIsort, setRSSISort] = useState<boolean>(true);
  const [AppNameSort, setAppNameSort] = useState<boolean>(true);
  const { profileList, loading } = useProfilesContext();

  const vendorList = useMemo(() => {
    const uniqueNames = new Set<string>();
    const vendors: Array<{ label: string; value: string }> = [];

    Object.entries(brands).forEach(([id, brand]) => {
      if (!uniqueNames.has(brand.name)) {
        uniqueNames.add(brand.name);
        vendors.push({
          label: brand.name,
          value: brand.name,
        });
      }
    });

    // Sort alphabetically, but put numbers at the end
    return vendors.sort((a, b) => {
      const aStartsWithNumber = /^\d/.test(a.label);
      const bStartsWithNumber = /^\d/.test(b.label);

      // If one starts with number and other doesn't, number goes last
      if (aStartsWithNumber && !bStartsWithNumber) return 1;
      if (!aStartsWithNumber && bStartsWithNumber) return -1;

      // Otherwise sort alphabetically
      return a.label.localeCompare(b.label);
    });
  }, []);

  useEffect(() => {

    let checkSort = async () => {
      try {
        let rssi = await AsyncStorage.getItem('@rssi');
        let app_name = await AsyncStorage.getItem('@app_name');
        if (!rssi && !app_name) throw Error('RSSI Sort did not selected!');
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

    let loadFilterSettings = async () => {
      try {
        let removeUnnamed = await AsyncStorage.getItem('@removeUnnamedDevices');
        if (removeUnnamed === 'true') {
          switchDispatch(true, 'filter/removeUnnamedDevices/set/enabled');
        }
      } catch (error) {
        console.error('Error loading filter settings:', error);
      }
    };

    checkSort();
    loadFilterSettings();
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

  const handleRemoveUnnamedDevicesChange = async (value: boolean) => {
    switchDispatch(value, 'filter/removeUnnamedDevices/set/enabled');
    try {
      if (value) {
        await AsyncStorage.setItem('@removeUnnamedDevices', 'true');
      } else {
        await AsyncStorage.removeItem('@removeUnnamedDevices');
      }
    } catch (error) {
      console.error('Error saving removeUnnamedDevices setting:', error);
    }
  };

  const handleRemoveInactiveDevicesChange = async (value: boolean) => {
    switchDispatch(value, 'filter/removeInactiveOutDevices/set/enabled');
    try {
      if (value) {
        await AsyncStorage.removeItem('@removeInactiveOutDevices');
      } else {
        await AsyncStorage.setItem('@removeInactiveOutDevices', 'false');
      }
    } catch (error) {
      console.error('Error saving removeInactiveOutDevices setting:', error);
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
    <KeyboardAvoidingView style={[styles.container]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <KeyboardAwareScrollView style={{ flex: 1, }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps='handled'>

        {/* Sort */}
        <View style={styles.sectionHeader}>
          <MaterialIcons name="sort" size={24} style={styles.icon} />
          <Text style={styles.sectionTitle}>Sort Options</Text>
        </View>
        <Text style={styles.sectionDescription}>Choose how you want to sort the list of devices:</Text>
        <View style={[styles.optionsBox]}>
          <View style={[styles.item]}>
            <Text style={[styles.title]}>RSSI</Text>
            <Switch
              style={{ alignSelf: 'center' }}
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
              style={{ alignSelf: 'center' }}
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
          <MaterialIcons name="filter-list" size={24} style={styles.icon} />
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
              style={{ alignSelf: 'center', marginLeft: 'auto' }}
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
              value={fsContext.filter.app_name.value}
              style={[styles.input, { flex: 1, marginLeft: 5, opacity: fsContext.filter.app_name.enabled ? 1 : 0.5 }]}
              onChangeText={(e) => inputDispatch(e, 'filter/app_name/set/value')}
              testID='filterByAppNameInput'
              accessibilityLabel='filterByAppNameInput'
            />
            <Switch
              style={{ alignSelf: 'center' }}
              color={Colors.active}
              value={fsContext.filter.app_name.enabled}
              onValueChange={(value) => switchDispatch(value, 'filter/app_name/set/enabled')}
              testID='filterByAppNameSwitch'
              accessibilityLabel='filterByAppNameSwitch'
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
                  style={{ alignSelf: 'center' }}
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
              style={{ alignSelf: 'center' }}
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
              containerStyle={styles.dropdownContainer}
              data={profileList}
              value={fsContext.filter.profile.value}
              onChange={(v: any) => {
                inputDispatch(v.uuid, 'filter/profile/set/value')
              }}
              labelField="name"
              valueField="uuid"
              placeholder='Select Profile'
              key="uuid"
              maxHeight={200}
              dropdownPosition='auto'
              searchPlaceholder="Search..."
              search
              inputSearchStyle={styles.inputSearchStyle}
              keyboardAvoiding
            />
          )}

          <Divider />
          <View style={styles.item}>
            <Text style={styles.title}>Connectable</Text>
            <Switch
              style={{ alignSelf: 'center' }}
              color={Colors.active}
              value={fsContext.filter.connectable}
              onValueChange={(value) => switchDispatch(value, 'filter/connectable/set/enabled')}
            />
          </View>
          <Divider />
          <View style={styles.item}>
            <Text allowFontScaling adjustsFontSizeToFit style={[styles.title, { flex: 1 }]}>Remove inactive devices</Text>
            <Switch
              style={{ alignSelf: 'center' }}
              color={Colors.active}
              value={fsContext.filter.removeInactiveOutDevices}
              onValueChange={handleRemoveInactiveDevicesChange}
            />
          </View>
          <Divider />
          <View style={styles.item}>
            <Text allowFontScaling adjustsFontSizeToFit style={[styles.title, { flex: 1 }]}>Remove unnamed devices</Text>
            <Switch
              style={{ alignSelf: 'center' }}
              color={Colors.active}
              value={fsContext.filter.removeUnnamedDevices}
              onValueChange={handleRemoveUnnamedDevicesChange}
            />
          </View>
          <Divider />
          <View style={styles.item}>
            <Text style={styles.title}>Show only TI devices</Text>
            <Switch
              style={{ alignSelf: 'center' }}
              color={Colors.active}
              value={fsContext.filter.showOnlyTI}
              onValueChange={(value) => {
                switchDispatch(value, 'filter/vendor/ti/set/enabled');
              }}
            />
          </View>
          <Divider />
          <View style={styles.item}>
            <Text style={styles.title}>
              Filter by vendors
            </Text>

            <Switch
              style={{ alignSelf: 'center' }}
              color={Colors.active}
              value={fsContext.filter.vendorFilter.enabled}
              onValueChange={(value) => {
                switchDispatch(value, 'filter/vendor/list/set/enabled');
              }}
            />
          </View>

          {/* MultiSelect dropdown */}
          {fsContext.filter.vendorFilter.enabled && (
            <MultiSelect
              disable={!fsContext.filter.vendorFilter.enabled}
              style={[styles.multiSelectDropdown]}
              selectedTextStyle={styles.selectedTextStyle}
              placeholderStyle={styles.placeholderStyle}
              itemTextStyle={styles.dropItem}
              containerStyle={styles.dropdownContainer}
              visibleSelectedItem={false}
              data={vendorList}
              value={fsContext.filter.vendorFilter.value}
              onChange={(selectedItems: string[]) => {
                fsDispatch!({ type: 'filter/vendor/list/set/value', payload: selectedItems });
              }}
              labelField="label"
              valueField="value"
              placeholder='Select vendors to filter'
              maxHeight={250}
              dropdownPosition='top'
              searchPlaceholder="Search vendors..."
              search
              inputSearchStyle={styles.inputSearchStyle}
              keyboardAvoiding
            />
          )}
          {/* Display selected vendors in styled container */}
          {fsContext.filter.vendorFilter.enabled && fsContext.filter.vendorFilter.value.length > 0 && (
            <View style={styles.selectedVendorsContainer}>
              <Text style={styles.selectedVendorsLabel}>
                Selected ({fsContext.filter.vendorFilter.value.length}):
              </Text>
              <ScrollView
                horizontal={false}
                style={styles.selectedVendorsScrollView}
                contentContainerStyle={styles.selectedVendorsChipsContainer}
                nestedScrollEnabled
              >
                {fsContext.filter.vendorFilter.value.map((vendorId) => {
                  const vendor = vendorList.find(v => v.value === vendorId);
                  if (!vendor) return null;
                  return (
                    <View key={vendorId} style={styles.selectedVendorChip}>
                      <Text style={styles.selectedVendorText} numberOfLines={1}>
                        {vendor.label}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          const newValues = fsContext.filter.vendorFilter.value.filter(id => id !== vendorId);
                          fsDispatch!({ type: 'filter/vendor/list/set/value', payload: newValues });
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <AntDesign name="close-circle" size={16} color={Colors.gray} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

      </KeyboardAwareScrollView>
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
  selectedVendorText: {
    fontSize: 13,
    color: Colors.gray,
    marginRight: 6,
  },
  selectedVendorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: Colors.gray,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedVendorsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.gray + '40',
    maxHeight: 400,
  },
  selectedVendorsLabel: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  selectedVendorsScrollView: {
    maxHeight: 300,
  },
  selectedVendorsChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  multiSelectDropdown: {
    marginBottom: 15,
    paddingHorizontal: 16,
    width: '90%',
    flex: 1,
    height: 35,
    borderColor: Colors.gray,
    borderWidth: 1,
    alignSelf: 'center',
    marginLeft: 10,
    borderRadius: 8,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 30,
    alignContent: 'center',
    height: '100%',
    flex: 1,
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
  data: {
    fontSize: 16,
  },
  input: {
    backgroundColor: 'rgba(230, 230, 230, 0.3)',
    borderRadius: 5,
    marginRight: 10,
    height: "90%"
  },
  dropdown: {
    marginBottom: 15,
    paddingHorizontal: 16,
    width: '90%',
    flex: 1,
    height: 35,
    borderColor: Colors.gray,
    borderWidth: 1,
    alignSelf: 'center',
    marginLeft: 10,
    borderRadius: 8,
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
  },
  dropdownContainer: {
    borderRadius: 8,
  },
})

export default FilterSortOptionsScreen;
