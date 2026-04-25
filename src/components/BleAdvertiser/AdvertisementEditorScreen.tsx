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

import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  View,
  StyleSheet,
  TextInput as Input,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  NativeModules,
} from 'react-native';
import { Text } from '../../components/Themed';
import { ScrollView } from 'react-native-gesture-handler';
import { Divider, Switch } from 'react-native-paper';
import { MaterialIcons, FontAwesome, FontAwesome6 } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import uuid from 'react-native-uuid';
import Colors from '../../constants/Colors';
import { IAdvertisement, RootStackScreenProps } from '../../../types';
import { AdvertiserDispatch, AdvertiserState } from '../../context/AdvertiserContext';
import { useProfilesContext } from '../../context/ProfileListContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExtendedAdvertising } from '../../hooks/useExtendedAdvertising';

const { BleAdvertiserModule } = NativeModules;

const AdvertisementEditorScreen: React.FC<RootStackScreenProps<'AdvertisementEditor'>> = ({ route, navigation }) => {
  const { advertisementId } = route.params || {};
  const advertiserState = useContext(AdvertiserState);
  const dispatch = useContext(AdvertiserDispatch);
  const { profileList, loading: profilesLoading } = useProfilesContext();

  // Deduplicate profileList by UUID (keep first occurrence, case-insensitive)
  const uniqueProfileList = useMemo(() => {
    if (!profileList) return [];

    const seen = new Set<string>();
    return profileList.filter((profile: any) => {
      const normalizedUuid = profile.uuid.toLowerCase();
      if (seen.has(normalizedUuid)) {
        return false;
      }
      seen.add(normalizedUuid);
      return true;
    });
  }, [profileList]);

  const advertisement = advertisementId
    ? advertiserState.advertisements.find(ad => ad.id === advertisementId)
    : null;

  const insets = useSafeAreaInsets();

  // TX Power levels for Android (maps to ADVERTISE_TX_POWER constants)
  const txPowerOptions = [
    { label: 'High (1 dBm)', value: '1' },
    { label: 'Medium (-10 dBm)', value: '-10' },
    { label: 'Low (-15 dBm)', value: '-15' },
  ];

  const [name, setName] = useState('');
  const [localName, setLocalName] = useState('');
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState(''); // System Bluetooth name (Android only)
  const [connectable, setConnectable] = useState(true);
  const [scannable, setScannable] = useState(false); // For extended advertising - mutually exclusive with connectable
  const [advertisingExtension, setAdvertisingExtension] = useState(false);
  const [txPower, setTxPower] = useState('-10');
  const [serviceUUIDs, setServiceUUIDs] = useState<string[]>([]);
  const [selectedKnownService, setSelectedKnownService] = useState<any>(null);
  const [newServiceUUID, setNewServiceUUID] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [manufacturerData, setManufacturerData] = useState('');
  const [loading, setLoading] = useState(false);

  // Extended Advertising state (BLE 5.0)
  const [primaryPhy, setPrimaryPhy] = useState<'LE_1M' | 'LE_CODED'>('LE_1M');
  const [secondaryPhy, setSecondaryPhy] = useState<'LE_1M' | 'LE_2M' | 'LE_CODED'>('LE_2M');
  const [advertisingInterval, setAdvertisingInterval] = useState('1600'); // 1 second
  const [periodicAdvertising, setPeriodicAdvertising] = useState(false);
  const [periodicInterval, setPeriodicInterval] = useState('80'); // 100ms

  // Use capability hook
  const extendedAdCapabilities = useExtendedAdvertising();

  // Fetch system Bluetooth device name on Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      BleAdvertiserModule.getBluetoothDeviceName((error: any, result: any) => {
        if (!error && result) {
          setBluetoothDeviceName(result.deviceName);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (advertisement) {
      setName(advertisement.name);
      // On iOS, localName is used as both name and localName; fall back to name for backwards compatibility
      setLocalName(advertisement.localName || (Platform.OS === 'ios' ? advertisement.name : ''));
      setServiceUUIDs(advertisement.serviceUUIDs || []);

      // Only load Android-specific settings on Android
      if (Platform.OS === 'android') {
        setConnectable(advertisement.connectable);
        // For existing ads, scannable defaults to false unless connectable is also false
        // This provides a reasonable default while allowing users to change it
        setScannable(!advertisement.connectable);
        setAdvertisingExtension(advertisement.advertisingExtension);
        setTxPower(advertisement.txPower?.toString() || '-10');
        setCompanyId(advertisement.manufacturerData?.companyId?.toString() || '');
        setManufacturerData(
          advertisement.manufacturerData?.data?.map(b => b.toString(16).padStart(2, '0')).join('') || ''
        );

        // Load extended advertising parameters
        if (advertisement.advertisingExtension) {
          setPrimaryPhy(advertisement.primaryPhy || 'LE_1M');
          setSecondaryPhy(advertisement.secondaryPhy || 'LE_2M');
          setAdvertisingInterval(advertisement.advertisingInterval?.toString() || '1600');
          setPeriodicAdvertising(advertisement.periodicAdvertising || false);
          setPeriodicInterval(advertisement.periodicInterval?.toString() || '80');
        }
      }
    }
  }, [advertisement]);

  const validateUUID = (uuid: string): boolean => {
    const uuid16Regex = /^[0-9A-Fa-f]{4}$/;
    const uuid128Regex = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/;
    return uuid16Regex.test(uuid) || uuid128Regex.test(uuid);
  };

  // Handler for connectable toggle with extended advertising constraint
  const handleConnectableChange = (value: boolean) => {
    setConnectable(value);
    // In extended advertising mode, if enabling connectable, must disable scannable
    if (advertisingExtension && extendedAdCapabilities.supported && value) {
      setScannable(false);
    }
  };

  // Handler for scannable toggle with extended advertising constraint
  const handleScannableChange = (value: boolean) => {
    setScannable(value);
    // In extended advertising mode, if enabling scannable, must disable connectable
    if (advertisingExtension && extendedAdCapabilities.supported && value) {
      setConnectable(false);
    }
  };

  const handleAddServiceUUID = () => {
    let uuidToAdd = '';

    // Priority: use selected known service first, then custom input
    if (selectedKnownService) {
      uuidToAdd = selectedKnownService.uuid;
    } else if (newServiceUUID.trim()) {
      if (!validateUUID(newServiceUUID)) {
        Alert.alert('Error', 'Invalid UUID format. Use 16-bit (e.g., "180F") or 128-bit format');
        return;
      }
      uuidToAdd = newServiceUUID;
    } else {
      Alert.alert('Error', 'Please select a service or enter a custom UUID');
      return;
    }

    if (serviceUUIDs.includes(uuidToAdd)) {
      Alert.alert('Error', 'This UUID is already added');
      return;
    }

    setServiceUUIDs([...serviceUUIDs, uuidToAdd]);
    setNewServiceUUID('');
    setSelectedKnownService(null);
  };

  const handleRemoveServiceUUID = (uuid: string) => {
    setServiceUUIDs(serviceUUIDs.filter(u => u !== uuid));
  };

  const startAdvertisingNative = (advertisementId: string, config: IAdvertisement): Promise<void> => {
    return new Promise((resolve, reject) => {
      BleAdvertiserModule.startAdvertising(
        advertisementId,
        {
          // Only send localName on iOS (Android uses system Bluetooth name)
          ...(Platform.OS === 'ios' && { localName: config.localName || config.name }),
          serviceUUIDs: config.serviceUUIDs,
          manufacturerData: config.manufacturerData,
          txPower: config.txPower,
          connectable: config.connectable,
          scannable: config.scannable, // Pass scannable to native module
          advertisingExtension: config.advertisingExtension,
          // Extended advertising parameters (BLE 5.0)
          primaryPhy: config.primaryPhy,
          secondaryPhy: config.secondaryPhy,
          advertisingInterval: config.advertisingInterval,
          periodicAdvertising: config.periodicAdvertising,
          periodicInterval: config.periodicInterval,
        },
        (error: any, result: any) => {
          if (error) {
            reject(new Error(error.error || 'Failed to start advertising'));
          } else {
            resolve();
          }
        }
      );
    });
  };

  const stopAdvertisingNative = (advertisementId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      BleAdvertiserModule.stopAdvertising(advertisementId, (error: any, result: any) => {
        if (error) {
          reject(new Error(error.error || 'Failed to stop advertising'));
        } else {
          resolve();
        }
      });
    });
  };

  const handleSave = async () => {
    if (!dispatch) return;

    // Validate local name on iOS (used for both UI and BLE broadcast)
    if (Platform.OS === 'ios' && !localName.trim()) {
      Alert.alert('Error', 'Please enter a local name for the advertisement');
      return;
    }

    // Auto-generate name for Android based on timestamp, use localName for iOS
    const finalName = Platform.OS === 'android'
      ? bluetoothDeviceName
      : localName.trim();

    // Parse TX power (Android only, values are pre-validated from dropdown)
    let txPowerNum = -10; // Default for iOS
    if (Platform.OS === 'android') {
      txPowerNum = parseFloat(txPower);
    }

    // Validate company ID if manufacturer data is provided (Android only)
    let manufacturerDataObj = undefined;
    if (Platform.OS === 'android' && (companyId || manufacturerData)) {
      const companyIdNum = parseInt(companyId, 10);
      if (isNaN(companyIdNum) || companyIdNum < 0 || companyIdNum > 65535) {
        Alert.alert('Error', 'Company ID must be between 0 and 65535');
        return;
      }

      const cleanedData = manufacturerData.replace(/\s+/g, '');
      if (cleanedData && cleanedData.length % 2 !== 0) {
        Alert.alert('Error', 'Manufacturer data must have an even number of hex digits');
        return;
      }

      const dataBytes: number[] = [];
      for (let i = 0; i < cleanedData.length; i += 2) {
        const byte = parseInt(cleanedData.substring(i, i + 2), 16);
        if (isNaN(byte)) {
          Alert.alert('Error', 'Invalid hex data in manufacturer data');
          return;
        }
        dataBytes.push(byte);
      }

      manufacturerDataObj = {
        companyId: companyIdNum,
        data: dataBytes,
      };
    }
    setLoading(true);

    try {
      if (advertisement) {
        // Edit existing advertisement
        const wasActive = advertisement.isActive;

        // Stop if active
        if (wasActive) {
          await stopAdvertisingNative(advertisement.id);
        }

        // Update advertisement
        const updates: Partial<IAdvertisement> = {
          name: finalName,
          localName: localName.trim() || finalName,
          advertisingExtension: advertisingExtension,
          connectable: connectable,
          scannable: scannable,
          serviceUUIDs,
          manufacturerData: manufacturerDataObj,
          txPower: txPowerNum,

          // Extended advertising params (only if extension is enabled)
          primaryPhy: advertisingExtension ? primaryPhy : undefined,
          secondaryPhy: advertisingExtension ? secondaryPhy : undefined,
          advertisingInterval: advertisingExtension ? parseInt(advertisingInterval) : undefined,
          periodicAdvertising: advertisingExtension ? periodicAdvertising : undefined,
          periodicInterval: advertisingExtension && periodicAdvertising ? parseInt(periodicInterval) : undefined,
        };

        dispatch({
          type: 'advertiser/advertisement/update',
          payload: { id: advertisement.id, updates },
        });

        // Restart if it was active
        if (wasActive) {
          const updatedAd = { ...advertisement, ...updates };
          await startAdvertisingNative(advertisement.id, updatedAd as IAdvertisement);
        }

        navigation.goBack()
      } else {
        // Create new advertisement
        const newAdvertisement: IAdvertisement = {
          id: uuid.v4() as string,
          name: finalName,
          localName: localName.trim() || finalName,
          advertisingExtension: advertisingExtension,
          connectable: connectable,
          scannable: scannable,
          serviceUUIDs,
          manufacturerData: manufacturerDataObj,
          txPower: txPowerNum,

          // Extended advertising params (only if extension is enabled)
          primaryPhy: advertisingExtension ? primaryPhy : undefined,
          secondaryPhy: advertisingExtension ? secondaryPhy : undefined,
          advertisingInterval: advertisingExtension ? parseInt(advertisingInterval) : undefined,
          periodicAdvertising: advertisingExtension ? periodicAdvertising : undefined,
          periodicInterval: advertisingExtension && periodicAdvertising ? parseInt(periodicInterval) : undefined,

          isActive: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        dispatch({
          type: 'advertiser/advertisement/add',
          payload: newAdvertisement,
        });

        Alert.alert('Success', 'Advertisement created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save advertisement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Basic Information Section */}
        <View style={styles.sectionHeader}>
          <MaterialIcons name="info" size={24} style={styles.icon} />
          <Text style={styles.sectionTitle}>Basic Information</Text>
        </View>
        <View style={styles.optionsBox}>
          {/* iOS: Show only Local Name field (used for both UI display and BLE broadcast) */}
          {Platform.OS === 'ios' && (
            <View style={styles.item}>
              <Text style={styles.title}>Local Name *</Text>
              <Input
                value={localName}
                onChangeText={setLocalName}
                placeholder="BLE device name"
                style={[styles.input, { flex: 1, marginLeft: 10 }]}
              />
            </View>
          )}

          {/* Android: Only show read-only Advertised Name (system Bluetooth name) */}
          {Platform.OS === 'android' && (
            <View style={styles.item}>
              <Text style={styles.title}>Advertised Name</Text>
              <Text style={[styles.readOnlyValue, { flex: 1, marginLeft: 10 }]}>
                {bluetoothDeviceName || 'Loading...'}
              </Text>
            </View>
          )}

        </View>
        {/* Info message for Android about system Bluetooth name */}
        {Platform.OS === 'android' && (
          <Text style={styles.infoText}>
            Android uses the system Bluetooth device name. This cannot be changed per-advertisement.
          </Text>
        )}



        {/* Advertisement Settings Section - Android Only */}
        {Platform.OS === 'android' && (
          <>
            <View style={[styles.sectionHeader]}>
              <MaterialIcons name="settings" size={24} style={styles.icon} />
              <Text style={styles.sectionTitle}>Advertisement Settings</Text>
            </View>
            <View style={styles.optionsBox}>
              <View style={styles.item}>
                <Text style={styles.title}>Connectable</Text>
                <Switch
                  style={{ alignSelf: 'center' }}
                  color={Colors.active}
                  value={connectable}
                  onValueChange={handleConnectableChange}
                />
              </View>

              {/* Scannable toggle - only in extended advertising mode */}
              {advertisingExtension && extendedAdCapabilities.supported && (
                <>
                  <Divider />
                  <View style={styles.item}>
                    <Text style={styles.title}>Scannable</Text>
                    <Switch
                      style={{ alignSelf: 'center' }}
                      color={Colors.active}
                      value={scannable}
                      onValueChange={handleScannableChange}
                    />
                  </View>
                </>
              )}

              <Divider />
              <View style={styles.item}>
                <Text style={styles.title}>Advertising Extension</Text>
                <Switch
                  style={{ alignSelf: 'center' }}
                  color={Colors.active}
                  value={advertisingExtension}
                  onValueChange={setAdvertisingExtension}
                />
              </View>
              <Divider />
              <View style={styles.item}>
                <Text style={styles.title}>TX Power</Text>
                <Dropdown
                  style={[styles.dropdown, { flex: 1, marginLeft: 10 }]}
                  selectedTextStyle={styles.selectedTextStyle}
                  placeholderStyle={styles.placeholderStyle}
                  itemTextStyle={styles.dropItem}
                  containerStyle={styles.dropdownContainer}
                  data={txPowerOptions}
                  value={txPower}
                  onChange={(item) => setTxPower(item.value)}
                  labelField="label"
                  valueField="value"
                  placeholder="Select TX Power"
                />
              </View>
            </View>

            {/* Info message about connectable/scannable constraint in extended mode */}
            {advertisingExtension && extendedAdCapabilities.supported && (
              <Text style={styles.infoText}>
                In BLE 5.0 Extended Advertising, connectable and scannable cannot both be enabled. You can disable both or enable only one.
              </Text>
            )}
          </>
        )}

        {/* Service UUIDs Section */}
        <View style={[styles.sectionHeader]}>
          <MaterialIcons name="label" size={24} style={styles.icon} />
          <Text style={styles.sectionTitle}>Service UUIDs</Text>
        </View>

        <View style={[styles.optionsBox, { marginBottom: 5 }]}>
          {/* Known Services Dropdown */}
          <View style={[styles.item, { paddingVertical: 10, alignItems: 'flex-start' }]}>
            <Text style={[styles.title, { marginTop: 8 }]}>Select Service</Text>
            <Dropdown
              style={[styles.dropdown, { flex: 1, marginLeft: 10 }]}
              selectedTextStyle={styles.selectedTextStyle}
              placeholderStyle={styles.placeholderStyle}
              itemTextStyle={styles.dropItem}
              containerStyle={styles.dropdownContainer}
              data={uniqueProfileList}
              value={selectedKnownService}
              onChange={setSelectedKnownService}
              labelField="name"
              valueField="uuid"
              placeholder=""
              search
              searchPlaceholder="Search services..."
              maxHeight={300}
              dropdownPosition="auto"
              disable={profilesLoading}
              renderItem={(item: any) => (
                <View style={styles.dropdownItem}>
                  <Text style={styles.dropdownItemName}>{item.name}</Text>
                  <Text style={styles.dropdownItemUuid}>{item.uuid}</Text>
                </View>
              )}
            />
          </View>
          {/* Custom UUID Input */}
          <View style={[styles.item, { paddingVertical: 10 }]}>
            <Text style={styles.title}>or enter custom UUID</Text>
            <Input
              value={newServiceUUID}
              onChangeText={setNewServiceUUID}
              placeholder="180F or full UUID"
              autoCapitalize="characters"
              style={[styles.input, { flex: 1, marginLeft: 10, }]}
            />
          </View>

        </View>
        {serviceUUIDs.length > 0 && (
          <View style={styles.chipContainer}>
            {serviceUUIDs.map((uuid, index) => (
              <View key={index} style={styles.chipItem}>
                <Text style={styles.uuidText}>{uuid}</Text>
                <TouchableOpacity onPress={() => handleRemoveServiceUUID(uuid)} style={styles.chipRemoveButton}>
                  <MaterialIcons name="highlight-remove" size={18} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {/* Add Button */}
        <TouchableOpacity style={styles.addButtonLarge} onPress={handleAddServiceUUID}>
          <FontAwesome6 name="add" size={16} color={Colors.blue} style={{ marginRight: 8 }} />
          <Text style={styles.addButtonText}>Add UUID</Text>
        </TouchableOpacity>


        {/* Manufacturer Data Section - Android Only */}
        {Platform.OS === 'android' && (
          <>
            <View style={[styles.sectionHeader]}>
              <MaterialIcons name="business" size={24} style={styles.icon} />
              <Text style={styles.sectionTitle}>Manufacturer Data</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Optional manufacturer-specific data in advertisement
            </Text>
            <View style={styles.optionsBox}>
              <View style={styles.item}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.title}>Company ID</Text>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert(
                        'Company ID',
                        'Bluetooth SIG assigned company identifier (0-65535).\n\n' +
                          'The company ID is transmitted in little-endian format (low byte first).\n\n' +
                          'Find your company ID at:\nbluetooth.com/specifications/assigned-numbers\n\n' +
                          'Common examples:\n' +
                          '• Apple: 76 (0x004C)\n' +
                          '• Texas Instruments: 13 (0x000D)\n' +
                          '• Google: 224 (0x00E0)',
                        [{ text: 'OK' }]
                      )
                    }
                    style={{ marginLeft: 4 }}
                  >
                    <MaterialIcons name="help-outline" size={16} color={Colors.gray} />
                  </TouchableOpacity>
                </View>
                <Input
                  value={companyId}
                  onChangeText={setCompanyId}
                  placeholder="0-65535"
                  keyboardType="numeric"
                  style={[styles.input, { width: 100, textAlign: 'center' }]}
                />
              </View>
              <Divider />
              <View
                style={[styles.item, { minHeight: 80, alignItems: 'flex-start', paddingVertical: 10 }]}
              >
                <Text style={[styles.title, { marginTop: 8 }]}>Hex Data</Text>
                <Input
                  value={manufacturerData}
                  onChangeText={setManufacturerData}
                  placeholder="0A1B2C"
                  autoCapitalize="characters"
                  style={[styles.input, { flex: 1, marginLeft: 10, minHeight: 60, textAlignVertical: 'top' }]}
                />
              </View>
            </View>
          </>
        )}

        {/* Extended Advertising Section - Android only with capability check */}
        {Platform.OS === 'android' && extendedAdCapabilities.supported && advertisingExtension && (
          <>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="flash-on" size={24} style={styles.icon} />
              <Text style={styles.sectionTitle}>BLE 5.0 Extended Advertising</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Up to {extendedAdCapabilities.maxDataLength} bytes of data
            </Text>

            <View style={styles.optionsBox}>
              {/* Primary PHY */}
              <View style={styles.item}>
                <Text style={styles.title}>Primary PHY</Text>
                <Dropdown
                  style={[styles.dropdown, { flex: 1, marginLeft: 10 }]}
                  selectedTextStyle={styles.selectedTextStyle}
                  placeholderStyle={styles.placeholderStyle}
                  itemTextStyle={styles.dropItem}
                  containerStyle={styles.dropdownContainer}
                  data={[
                    { label: '1M (Standard)', value: 'LE_1M' },
                    { label: 'Coded (Long Range - 4x)', value: 'LE_CODED' },
                  ]}
                  value={primaryPhy}
                  onChange={(item) => setPrimaryPhy(item.value)}
                  labelField="label"
                  valueField="value"
                />
              </View>

              <Divider />

              {/* Secondary PHY */}
              <View style={styles.item}>
                <Text style={styles.title}>Secondary PHY</Text>
                <Dropdown
                  style={[styles.dropdown, { flex: 1, marginLeft: 10 }]}
                  selectedTextStyle={styles.selectedTextStyle}
                  placeholderStyle={styles.placeholderStyle}
                  itemTextStyle={styles.dropItem}
                  containerStyle={styles.dropdownContainer}
                  data={[
                    { label: '1M (Standard)', value: 'LE_1M' },
                    { label: '2M (High Speed - 2x)', value: 'LE_2M' },
                    { label: 'Coded (Long Range - 4x)', value: 'LE_CODED' },
                  ]}
                  value={secondaryPhy}
                  onChange={(item) => setSecondaryPhy(item.value)}
                  labelField="label"
                  valueField="value"
                />
              </View>

              <Divider />

              {/* Advertising Interval */}
              <View style={styles.item}>
                <Text style={styles.title}>Interval</Text>
                <Dropdown
                  style={[styles.dropdown, { flex: 1, marginLeft: 10 }]}
                  selectedTextStyle={styles.selectedTextStyle}
                  placeholderStyle={styles.placeholderStyle}
                  itemTextStyle={styles.dropItem}
                  containerStyle={styles.dropdownContainer}
                  data={[
                    { label: '100ms (Fast)', value: '160' },
                    { label: '500ms (Medium)', value: '800' },
                    { label: '1000ms (Standard)', value: '1600' },
                    { label: '2000ms (Slow)', value: '3200' },
                  ]}
                  value={advertisingInterval}
                  onChange={(item) => setAdvertisingInterval(item.value)}
                  labelField="label"
                  valueField="value"
                />
              </View>

              <Divider />

              {/* Periodic Advertising */}
              <View style={styles.item}>
                <Text style={styles.title}>Periodic Advertising</Text>
                <Switch
                  style={{ alignSelf: 'center' }}
                  color={Colors.active}
                  value={periodicAdvertising}
                  onValueChange={setPeriodicAdvertising}
                />
              </View>

              {periodicAdvertising && (
                <>
                  <Divider />
                  <View style={styles.item}>
                    <Text style={styles.title}>Periodic Interval</Text>
                    <Dropdown
                      style={[styles.dropdown, { flex: 1, marginLeft: 10 }]}
                      selectedTextStyle={styles.selectedTextStyle}
                      placeholderStyle={styles.placeholderStyle}
                      itemTextStyle={styles.dropItem}
                      containerStyle={styles.dropdownContainer}
                      data={[
                        { label: '100ms', value: '80' },
                        { label: '500ms', value: '400' },
                        { label: '1000ms', value: '800' },
                      ]}
                      value={periodicInterval}
                      onChange={(item) => setPeriodicInterval(item.value)}
                      labelField="label"
                      valueField="value"
                    />
                  </View>
                </>
              )}
            </View>

            <Text style={styles.helpText}>
              <MaterialIcons name="info" size={14} /> Coded PHY provides up to 4x range (~200m+) but slower speed. 2M PHY provides 2x speed but standard range.
            </Text>
          </>
        )}

        {/* Show capability info if extension toggled but not supported */}
        {Platform.OS === 'android' && !extendedAdCapabilities.supported && advertisingExtension && (
          <View style={styles.warningBox}>
            <MaterialIcons name="warning" size={20} color="#FF9800" />
            <Text style={styles.warningText}>
              Extended advertising requires Android 8.0+ and compatible hardware.
              This device {extendedAdCapabilities.apiLevel < 26 ? `runs Android API ${extendedAdCapabilities.apiLevel}` : 'does not support extended advertising'}.
              {'\n'}Falling back to legacy advertising (31 bytes max).
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Save Button */}
      <TouchableOpacity
        style={[styles.fab, loading && styles.fabDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <MaterialIcons name="done-all" size={24} color="white" />
            <Text style={styles.fabText}>Save</Text>
          </>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    marginTop: 20
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
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: Colors.lightGray,
  },
  item: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    minHeight: 50,
    backgroundColor: 'white',
    borderRadius: 15,
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  readOnlyValue: {
    fontSize: 14,
    color: Colors.darkGray,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: 'right',
  },
  dropdown: {
    paddingHorizontal: 16,
    height: 35,
    borderColor: Colors.gray,
    borderWidth: 1,
    alignSelf: 'center',
    borderRadius: 4,
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
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dropdownItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.darkGray,
  },
  dropdownItemUuid: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  addButtonLarge: {
    flexDirection: 'row',
    borderColor: Colors.blue,
    borderWidth: 1,
    backgroundColor: "white",
    paddingVertical: 10,
    width: "100%",
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5
  },
  addButtonText: {
    color: Colors.blue,
    fontWeight: '600'
  },
  uuidText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: Colors.darkGray,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 5
  },
  chipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "white",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.gray,
  },
  chipRemoveButton: {
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 60,
    right: 20,
    backgroundColor: Colors.blue,
    borderRadius: 35,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabDisabled: {
    opacity: 0.6,
  },
  fabText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
  },
  helpText: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 5,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    color: Colors.gray,
    marginBottom: 5,
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
    alignItems: 'flex-start',
  },
  warningText: {
    fontSize: 13,
    color: Colors.darkGray,
    marginLeft: 8,
    flex: 1,
  },
});

export default AdvertisementEditorScreen;
