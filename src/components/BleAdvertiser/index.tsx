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

import React, { useEffect, useContext, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  NativeModules,
  NativeEventEmitter,
  EmitterSubscription,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { FontAwesome, FontAwesome6, Fontisto, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Colors from '../../constants/Colors';
import { AdvertiserState, AdvertiserDispatch } from '../../context/AdvertiserContext';
import { IAdvertisement, ScanScreenNavigationProp } from '../../../types';
import AdvertisementCard from './AdvertisementCard';
import Separator from '../Separator';
import BleManager from 'react-native-ble-manager';
import uuid from 'react-native-uuid';
import { SafeAreaView } from 'react-native-safe-area-context';

const { BleAdvertiserModule } = NativeModules;
const advertiserEmitter = new NativeEventEmitter(BleAdvertiserModule);

interface ConnectedCentral {
  deviceId: string;
  deviceName: string;
  deviceAddress: string;
  services?: any[];
}

const BleAdvertiser: React.FC = () => {
  const advertiserState = useContext(AdvertiserState);
  const dispatch = useContext(AdvertiserDispatch);
  const navigation = useNavigation<ScanScreenNavigationProp>();

  // State for connected centrals
  const [connectedCentrals, setConnectedCentrals] = useState<ConnectedCentral[]>([]);

  // Event subscriptions
  const stateSubscription = useRef<EmitterSubscription | null>(null);
  const errorSubscription = useRef<EmitterSubscription | null>(null);
  const centralConnectedSubscription = useRef<EmitterSubscription | null>(null);
  const centralDisconnectedSubscription = useRef<EmitterSubscription | null>(null);

  useEffect(() => {
    // Subscribe to native events
    stateSubscription.current = advertiserEmitter.addListener(
      'BleAdvertiserStateChanged',
      (event: { advertisementId: string; isActive: boolean }) => {
        console.log('BleAdvertiserStateChanged:', event);
        if (dispatch) {
          dispatch({
            type: 'advertiser/advertisement/toggle',
            payload: { id: event.advertisementId, isActive: event.isActive },
          });
        }
      }
    );

    errorSubscription.current = advertiserEmitter.addListener(
      'BleAdvertiserError',
      (event: { advertisementId: string; error: string }) => {
        console.error('BleAdvertiserError:', event);
        Alert.alert('Advertising Error', event.error);

        if (dispatch) {
          dispatch({
            type: 'advertiser/advertisement/toggle',
            payload: { id: event.advertisementId, isActive: false },
          });
        }
      }
    );

    // Subscribe to central connection events
    centralConnectedSubscription.current = advertiserEmitter.addListener(
      'BleAdvertiserCentralConnected',
      async (event: { deviceId: string; deviceName: string; deviceAddress: string }) => {
        console.log('Central connected:', event);

        // Add to connected centrals list
        const newCentral: ConnectedCentral = {
          deviceId: event.deviceId,
          deviceName: event.deviceName,
          deviceAddress: event.deviceAddress,
        };

        setConnectedCentrals(prev => [...prev, newCentral]);
      }

    );

    centralDisconnectedSubscription.current = advertiserEmitter.addListener(
      'BleAdvertiserCentralDisconnected',
      async (event: { deviceId: string; deviceAddress: string }) => {
        console.log('Central disconnected:', event);

        // Remove from connected centrals list
        setConnectedCentrals(prev => prev.filter(central => central.deviceId !== event.deviceId));

        // Disconnect from the device if we're connected as central
        try {
          // Check if we're actually connected to this device first
          const connectedPeripherals = await BleManager.getConnectedPeripherals([]);
          const isConnected = connectedPeripherals.some(p => p.id === event.deviceId);

          if (isConnected) {
            await BleManager.disconnect(event.deviceId);
          }
        } catch (error) {
          console.error('Error handling central disconnection:', error);
        }
      }
    );

    return () => {
      stateSubscription.current?.remove();
      errorSubscription.current?.remove();
      centralConnectedSubscription.current?.remove();
      centralDisconnectedSubscription.current?.remove();
    };
  }, []);

  const handleCreateNew = () => {
    navigation.navigate('AdvertisementEditor', {});
  };

  const handleEdit = (advertisement: IAdvertisement) => {
    navigation.navigate('AdvertisementEditor', { advertisementId: advertisement.id });
  };

  const handleDelete = (advertisementId: string) => {
    const advertisement = advertiserState.advertisements.find(ad => ad.id === advertisementId);

    Alert.alert(
      'Delete Advertisement',
      `Are you sure you want to delete "${advertisement?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Stop if active
            if (advertisement?.isActive) {
              await stopAdvertisingNative(advertisementId);
            }

            // Remove from state
            if (dispatch) {
              dispatch({
                type: 'advertiser/advertisement/delete',
                payload: advertisementId,
              });
            }
          },
        },
      ]
    );
  };

  const handleClone = (advertisementId: string) => {
    const advertisement = advertiserState.advertisements.find(ad => ad.id === advertisementId);

    if (!advertisement || !dispatch) return;

    const clonedAdvertisement: IAdvertisement = {
      ...advertisement,
      id: uuid.v4() as string,
      name: `${advertisement.name} (Copy)`,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dispatch({
      type: 'advertiser/advertisement/add',
      payload: clonedAdvertisement,
    });

    Alert.alert('Success', 'Advertisement cloned successfully');
  };

  const handleToggle = async (advertisementId: string) => {
    const advertisement = advertiserState.advertisements.find(ad => ad.id === advertisementId);

    if (!advertisement) return;

    if (!advertisement.isActive) {
      // Check for iOS limitation: only one active advertisement at a time
      if (Platform.OS === 'ios') {
        const otherActiveAds = advertiserState.advertisements.filter(
          ad => ad.isActive && ad.id !== advertisementId
        );

        if (otherActiveAds.length > 0) {
          // Show warning and ask user to confirm
          Alert.alert(
            'iOS Limitation',
            `Only one advertisement can be active at a time on iOS.\n\n` +
            `"${otherActiveAds[0].name}" is currently active.\n\n` +
            `Starting "${advertisement.name}" will automatically stop the current advertisement.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Replace',
                style: 'default',
                onPress: async () => {
                  // Stop other active ads first
                  for (const ad of otherActiveAds) {
                    try {
                      await stopAdvertisingNative(ad.id);
                      console.log(`Auto-stopped advertising (iOS): ${ad.name}`);
                    } catch (error) {
                      console.error('Failed to stop previous ad:', error);
                    }
                  }
                  // Start the new one
                  try {
                    await startAdvertisingNative(advertisementId, advertisement);
                    console.log(`Started advertising: ${advertisement.name}`);
                  } catch (error: any) {
                    console.error('Failed to start advertising:', error);
                    Alert.alert('Error', `Failed to start advertising: ${error.message || 'Unknown error'}`);
                  }
                }
              }
            ]
          );
          return;
        }
      }

      // Start advertising (no conflicts or on Android)
      try {
        await startAdvertisingNative(advertisementId, advertisement);
        console.log(`Started advertising: ${advertisement.name}`);
      } catch (error: any) {
        console.error('Failed to start advertising:', error);
        Alert.alert('Error', `Failed to start advertising: ${error.message || 'Unknown error'}`);
      }
    } else {
      // Stop advertising
      try {
        await stopAdvertisingNative(advertisementId);
        console.log(`Stopped advertising: ${advertisement.name}`);
      } catch (error: any) {
        console.error('Failed to stop advertising:', error);
        Alert.alert('Error', `Failed to stop advertising: ${error.message || 'Unknown error'}`);
      }
    }
  };


  const startAdvertisingNative = (advertisementId: string, config: IAdvertisement): Promise<void> => {
    return new Promise((resolve, reject) => {
      BleAdvertiserModule.startAdvertising(
        advertisementId,
        {
          localName: config.localName || config.name,
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

  const renderAdvertisementItem = ({ item }: { item: IAdvertisement }) => (
    <AdvertisementCard
      advertisement={item}
      onToggle={handleToggle}
      onEdit={handleEdit}
      onClone={handleClone}
      onDelete={handleDelete}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome6
        name="tower-broadcast" size={80} color={Colors.gray} />
      <Text style={styles.emptyText}>No advertisements yet</Text>
      <Text style={styles.emptySubtext}>Tap the + button to create your first advertisement</Text>
    </View>
  );

  const handleExploreDevice = (deviceId: string, deviceName: string) => {
    // Show popup asking if user wants to explore the device
    Alert.alert(
      'Discover Services',
      `Discover services requires connecting to the central as GATT client. Do you want to continue?`,
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Discover',
          onPress: async () => {
            try {
              await BleManager.connect(deviceId);

              // Navigate to Scanner's DeviceTab (nested navigation)
              navigation.navigate('Scanner', {
                screen: 'DeviceTab',
                params: {
                  peripheralId: deviceId,
                  isBonded: false,
                  isConnected: true,
                },
              });
            } catch (e) {
              alert(`Failed to connect ${deviceName}: ${e}`);

            }
          },
        },
      ]
    );



  };

  const renderConnectedCentrals = () => {
    if (connectedCentrals.length === 0) return null;

    return (
      <View style={styles.centralsSection}>
        <Text style={styles.centralsSectionTitle}>
          Connected Devices ({connectedCentrals.length})
        </Text>
        {connectedCentrals.map((central) => (
          <View key={central.deviceId} style={styles.centralCard}>
            <View style={styles.centralHeader}>
              <MaterialIcons name="devices" size={30} />
              <View style={styles.centralInfo}>
                <Text style={styles.centralName}>{central.deviceName}</Text>
                <Text style={styles.centralAddress}>{central.deviceAddress}</Text>
              </View>
            </View>

            {/* Explore button */}
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => handleExploreDevice(central.deviceId, central.deviceName)}
            >
              <Fontisto name="search" size={18} color={Colors.blue} />
            </TouchableOpacity>
          </View>

        ))}

      </View >
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={Platform.OS == "ios" ? ['left', 'right', 'bottom'] : ['left', 'right']}>
      {/* Connected Centrals Section */}
      {renderConnectedCentrals()}

      {/* Advertisement List */}
      {advertiserState.advertisements.length === 0 ? (
        renderEmpty()
      ) : (
        <>
          <View style={styles.advertisementsHeader}>
            <Text style={styles.advertisementsSectionTitle}>
              Advertisements ({advertiserState.advertisements.length})
            </Text>
          </View>
          <FlashList
            data={advertiserState.advertisements}
            renderItem={renderAdvertisementItem}
            ItemSeparatorComponent={Separator}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        </>
      )}

      {/* Floating Action Button - Create New */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateNew}>
        <FontAwesome name="plus" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    padding: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.darkGray,
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 60,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.blue,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  centralsSection: {
    backgroundColor: Colors.lightGray,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray,
    paddingBottom: 15

  },
  centralsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkGray,
    marginBottom: 10,
  },
  advertisementsHeader: {
    paddingVertical: 15,
    backgroundColor: Colors.lightGray,
    borderBottomColor: Colors.gray,
  },
  advertisementsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkGray,
  },
  centralCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    justifyContent: 'space-between',
    flexDirection: 'row'
  },
  centralHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  centralInfo: {
    marginLeft: 12,
    flex: 1,
  },
  centralName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkGray,
  },
  centralAddress: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  centralDiscovering: {
    fontSize: 14,
    color: Colors.gray,
    fontStyle: 'italic',
  },
  centralNoServices: {
    fontSize: 14,
    color: Colors.gray,
    fontStyle: 'italic',
  },
  servicesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  servicesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkGray,
    marginBottom: 5,
  },
  serviceUuid: {
    fontSize: 13,
    color: Colors.gray,
    fontFamily: 'monospace',
    marginLeft: 10,
    marginTop: 3,
  },
  exploreButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "white",
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  exploreButtonText: {
    fontSize: 14,
    color: Colors.blue,
    fontWeight: '600',
  },
});

export default BleAdvertiser;
