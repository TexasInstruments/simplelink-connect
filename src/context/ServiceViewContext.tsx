import React, { useContext, useState, createContext, useEffect, useRef } from 'react';
import { Alert, PermissionsAndroid, Platform, EventSubscription } from 'react-native';
import BleManager, { PeripheralInfo } from 'react-native-ble-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNRestart from 'react-native-restart';
import { getServiceUuid } from '../hooks/uuidToName';

interface ServiceViewContextProps {
    hasOadOption: boolean;
    hasDfuOption: boolean;
    updatePeripheral: (info: PeripheralInfo | undefined) => void;
    peripheralInfo: PeripheralInfo | undefined;
    handleRequestMTU: (mtu: number) => Promise<void>;
    handleCreateBond: () => Promise<void>;
    handleRemoveBond: () => Promise<void>;
    isBonded: boolean;
}

const ServiceViewContext = createContext<ServiceViewContextProps | undefined>(undefined);

export const ServiceViewProvider = ({ children }) => {
    const [hasOadOption, setHasOadOption] = useState<boolean>(false);
    const [hasDfuOption, setHasDfuOption] = useState<boolean>(false);
    const [peripheralInfo, setPeripheralInfo] = useState<PeripheralInfo | undefined>();
    const [isBonded, setIsBonded] = useState<boolean>(false);

    const OadServiceUuid = 'F000FFC0-0451-4000-B000-000000000000';
    const OadResetServiceUuid = 'F000FFD0-0451-4000-B000-000000000000';
    const McuManagerServiceUuid = '8d53dc1d-1db7-4cd3-868b-8a527460aa84'

    const bondSubscription = useRef<EventSubscription | null>(null);

    useEffect(() => {
        const setupBle = async () => {
            await requestAndroidPermissions();

            if (Platform.OS === 'android') {
                bondSubscription.current = BleManager.onPeripheralDidBond(handleNewDeviceBonded);
            }
        };
        setupBle();

        return () => {
            if (Platform.OS === 'android') {
                bondSubscription.current?.remove();
            }
        };
    }, []);

    useEffect(() => {

        const updateOptions = async () => {
            if (peripheralInfo && peripheralInfo.services) {
                let oadserviceUuidList = peripheralInfo.services.filter(
                    service =>
                        getServiceUuid(service).toUpperCase() === OadServiceUuid.toUpperCase() ||
                        getServiceUuid(service).toUpperCase() === OadResetServiceUuid.toUpperCase()
                );
                setHasOadOption(oadserviceUuidList.length > 0);
            }

            if (peripheralInfo?.services) {
                let dfuUUid = peripheralInfo.services.filter(
                    service => getServiceUuid(service).toLowerCase() === McuManagerServiceUuid
                );
                setHasDfuOption(!!dfuUUid?.length);
            }

            if (Platform.OS == "android") {
                const granted = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
                );
                if (granted) {
                    const bondedPeripherals = await BleManager.getBondedPeripherals();
                    const found = bondedPeripherals.find(p => p.id === peripheralInfo?.id);
                    setIsBonded(!!found);
                }
            }

        };

        updateOptions();
    }, [peripheralInfo]);

    async function requestAndroidPermissions(): Promise<void> {
        if (Platform.OS === 'android') {
            try {
                // Android 12 and above
                console.log(Platform.Version)
                if (Platform.Version >= 31) {
                    await PermissionsAndroid.requestMultiple([
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
                    ]);
                }
                // Android 11 and lower 
                else {
                    await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    );

                    // First time asking for permission - need to reload the app
                    const hasAskedPermission = await AsyncStorage.getItem('hasAskedPermission');

                    if (hasAskedPermission !== 'true') {
                        await AsyncStorage.setItem('hasAskedPermission', 'true');
                        RNRestart.Restart();
                    }
                }

                console.log('got permissions')
                Promise.resolve();

            } catch (error) {
                console.error('Android permissions error: ', error);
            }
        }
    }

    const handleNewDeviceBonded = (e: any) => {
        console.log('New device bonded', e)
        setIsBonded(true);
    }

    const updatePeripheral = (info: PeripheralInfo | undefined) => {
        setPeripheralInfo(info)
    }

    const handleRequestMTU = async (mtu: number) => {
        if (peripheralInfo && Platform.OS === 'android') {
            let mtuAfterRequest = await BleManager.requestMTU(peripheralInfo?.id, mtu);
            Alert.alert('MTU Request', `MTU after exchange: ${mtuAfterRequest}`)
        }
    }

    const handleCreateBond = async () => {
        if (peripheralInfo && Platform.OS === 'android') {
            await BleManager.createBond(peripheralInfo?.id);
            console.log('Bond Created');
        }
    }

    const handleRemoveBond = async () => {
        if (peripheralInfo && Platform.OS === 'android') {
            await BleManager.removeBond(peripheralInfo?.id);
            console.log('Bond Removed');
        }
    }

    return (
        <ServiceViewContext.Provider
            value={{
                hasOadOption,
                hasDfuOption,
                updatePeripheral,
                peripheralInfo,
                handleRequestMTU,
                handleCreateBond,
                handleRemoveBond,
                isBonded,
            }}>
            {children}
        </ServiceViewContext.Provider>
    );
};

export const useServiceViewContext = () => {
    const context = useContext(ServiceViewContext);
    if (!context) {
        throw new Error('ServiceViewContext must be used within a ServiceProvider');
    }
    return context;
};
