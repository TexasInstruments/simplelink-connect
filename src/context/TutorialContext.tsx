import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TutorialsContextProps {
    scannerTutorial: () => Promise<boolean>;
    meshTutorial: () => Promise<boolean>;
}

const TutorialsContext = createContext<TutorialsContextProps | undefined>(undefined);

export const TutorialsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [showScannerTutorial, setShowScannerTutorial] = useState<boolean>(false);
    const [showMeshTutorial, setShowMeshTutorial] = useState<boolean>(false);

    useEffect(() => {
        async function loadResourcesAndDataAsync() {
            try {

                let checkForScannerTutorialSkip = await AsyncStorage.getItem('@scanner_tutorial');

                if (!checkForScannerTutorialSkip) {
                    setShowScannerTutorial(true);
                } else {
                    setShowScannerTutorial(false);
                }

                let checkForMeshTutorialSkip = await AsyncStorage.getItem('@mesh_tutorial');

                if (!checkForMeshTutorialSkip) {
                    setShowMeshTutorial(true);
                } else {
                    setShowMeshTutorial(false);
                }
            }
            catch (e) {
                // We might want to provide this error information to an error reporting service
                console.warn(e);
                setShowScannerTutorial(false);
                setShowMeshTutorial(false);
            }


        }

        loadResourcesAndDataAsync();
        console.log('showMeshTutorial', showMeshTutorial);
        console.log('showScannerTutorial', showScannerTutorial);
    }, []);

    const meshTutorial = async () => {
        let checkForMeshTutorialSkip = await AsyncStorage.getItem('@mesh_tutorial');
        console.log('checkForMeshTutorialSkip', checkForMeshTutorialSkip);
        if (!checkForMeshTutorialSkip) {
            setShowMeshTutorial(true);
            return true
        } else {
            setShowMeshTutorial(false);
            return false;
        }
    }

    const scannerTutorial = async () => {
        let checkForScannerTutorialSkip = await AsyncStorage.getItem('@scanner_tutorial');
        if (!checkForScannerTutorialSkip) {
            setShowScannerTutorial(true);
            return true
        } else {
            setShowScannerTutorial(false);
            return false;
        }
    }

    return (
        <TutorialsContext.Provider value={{ scannerTutorial, meshTutorial }}>
            {children}
        </TutorialsContext.Provider>
    );
};

export const useTutorialsContext = () => {
    const context = useContext(TutorialsContext);
    if (!context) {
        throw new Error('useTutorialsContext must be used within a useTutorialsContext');
    }
    return context;
};
