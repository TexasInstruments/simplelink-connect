import React, { useContext, useState, createContext, useEffect } from 'react';
import { Alert, NativeEventEmitter, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { PeripheralInfo } from 'react-native-ble-manager';
import BleManager from 'react-native-ble-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNRestart from 'react-native-restart';

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

    const BleManagerModule = NativeModules.BleManager;
    const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);


    useEffect(() => {
        requestAndroidPermissions().then(() => {
            if (Platform.OS == 'android') {
                bleManagerEmitter.addListener('BleManagerPeripheralDidBond', handleNewDeviceBonded);
            }
        });

        return () => {
            if (Platform.OS == 'android') {
                bleManagerEmitter.removeAllListeners('BleManagerPeripheralDidBond')
            }
        }

    }, [])

    useEffect(() => {

        const checkIfPeripheralIsBonded = async (): Promise<boolean> => {
            if (Platform.OS !== 'android') return false;

            try {
                let bondedPeripherals = await BleManager.getBondedPeripherals();
                let found = bondedPeripherals.find((per) => per.id == peripheralInfo?.id);
                return found ? true : false;
            } catch (error) {
                return false;
            }
        };

        let oadserviceUuidList = peripheralInfo?.services?.filter(
            (service) =>
                service.uuid.toUpperCase() === OadServiceUuid ||
                service.uuid.toUpperCase() === OadResetServiceUuid
        );

        //@ts-ignore
        let hasOadserviceUuid: boolean = oadserviceUuidList?.length > 0;
        setHasOadOption(hasOadserviceUuid);

        let dfuUUid = peripheralInfo?.services?.filter(
            (service) =>
                service.uuid.toLocaleLowerCase() === McuManagerServiceUuid);

        let hasDfuServiceUuid: boolean = dfuUUid ? dfuUUid.length > 0 : false;
        setHasDfuOption(hasDfuServiceUuid)

        checkIfPeripheralIsBonded().then((bonded) => {
            if (peripheralInfo?.id) {
                setIsBonded(bonded);
            }
        });

    }, [peripheralInfo])

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
