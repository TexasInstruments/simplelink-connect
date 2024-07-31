import React, { useContext, useState, useCallback, createContext, useEffect } from 'react';
import { uuidToServiceSpecificScreen } from '../hooks/uuidToName';
import { RootStackParamList } from '../../types';
import { checkIfTestingSupported } from '../components/Tests/testsUtils';

type CharactristicView = 'advanced' | 'specific';

interface CharactristicViewContextProps {
    charactristicView: CharactristicView;
    toggleView: () => void;
    serviceUUID: string | undefined;
    updateService: (name: string, uuid: string) => void;
    hasSpecificScreen: boolean;
    serviceName: string | undefined;
    hasTestOption: boolean;
    updatePeripheralInfo: (name: string | undefined, id: string) => void;
    periNameId: { peripheralName: string | undefined, peripheralId: string }
}

const CharactristicViewContext = createContext<CharactristicViewContextProps | undefined>(undefined);

export const CharacteristicViewProvider = ({ children }) => {
    const [charactristicView, setCharactristicView] = useState<CharactristicView>('specific');
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
        setCharactristicView((prev) => prev === 'specific' ? 'advanced' : 'specific')
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
        <CharactristicViewContext.Provider
            value={{
                charactristicView,
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
        </CharactristicViewContext.Provider>
    );
};

export const useCharacteristicViewContext = () => {
    const context = useContext(CharactristicViewContext);
    if (!context) {
        throw new Error('CharactristicViewContext must be used within a CharacteristicProvider');
    }
    return context;
};
