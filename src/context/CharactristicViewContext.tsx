import React, { useContext, useState, useCallback, createContext, useEffect } from 'react';
import { uuidToServiceSpecificScreen } from '../hooks/uuidToName';
import { RootStackParamList } from '../../types';
import { checkIfTestingSupported } from '../components/Tests/testsUtils';

type CharacteristicView = 'advanced' | 'specific';

interface CharacteristicViewContextProps {
    characteristicView: CharacteristicView;
    toggleView: () => void;
    serviceUUID: string | undefined;
    updateService: (name: string, uuid: string) => void;
    hasSpecificScreen: boolean;
    serviceName: string | undefined;
    hasTestOption: boolean;
    updatePeripheralInfo: (name: string | undefined, id: string) => void;
    periNameId: { peripheralName: string | undefined, peripheralId: string }
}

const CharacteristicViewContext = createContext<CharacteristicViewContextProps | undefined>(undefined);

export const CharacteristicViewProvider = ({ children }) => {
    const [characteristicView, setCharacteristicView] = useState<CharacteristicView>('specific');
    const [serviceUUID, setServiceUUID] = useState<string | undefined>(undefined);
    const [serviceName, setServiceName] = useState<string | undefined>(undefined);
    const [hasSpecificScreen, setHasSpecificScreen] = useState<boolean>(false);
    const [hasTestOption, setHasTestOption] = useState<boolean>(false);
    const [periNameId, setPeripheralNameId] = useState<{ peripheralName: string | undefined, peripheralId: string }>({ peripheralName: '', peripheralId: '' });

    useEffect(() => {
        (async () => {
            if (serviceUUID) {
                let checkForScreenSpecificScreen = await uuidToServiceSpecificScreen({ uuid: serviceUUID, peripheralName: periNameId.peripheralName });
                setHasSpecificScreen(
                    checkForScreenSpecificScreen?.serviceSpecificScreen as keyof RootStackParamList ? true : false
                );
                setHasTestOption(checkIfTestingSupported(serviceUUID));
            }
        })();
    }, [serviceUUID]);

    const toggleView = useCallback(() => {
        setCharacteristicView((prev) => prev === 'specific' ? 'advanced' : 'specific')
    }, []);

    const updateService = (name: string, uuid: string) => {
        setServiceUUID(uuid);
        setServiceName(name);
    }

    const updatePeripheralInfo = (name: string | undefined, id: string) => {
        setPeripheralNameId({
            peripheralName: name,
            peripheralId: id
        })
    }

    return (
        <CharacteristicViewContext.Provider
            value={{
                characteristicView: characteristicView,
                toggleView,
                serviceUUID,
                updateService,
                hasSpecificScreen,
                serviceName,
                hasTestOption,
                updatePeripheralInfo,
                periNameId
            }}>
            {children}
        </CharacteristicViewContext.Provider>
    );
};

export const useCharacteristicViewContext = () => {
    const context = useContext(CharacteristicViewContext);
    if (!context) {
        throw new Error('CharacteristicViewContext must be used within a CharacteristicProvider');
    }
    return context;
};
