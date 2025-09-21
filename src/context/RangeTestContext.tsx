import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { LatLng } from 'react-native-maps';

interface BleRangeContextProps {
    updateTargetLocation: any;
    targetLocationContext: LatLng | null;
}

const BleRangeContext = createContext<BleRangeContextProps | undefined>(undefined);

export const BleRangeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [targetLocationContext, setTargetLocationContext] = useState<LatLng | null>(null);

    const updateTargetLocation = (latitude: string, longitude: string) => {
        const newLocation = {
            latitude: parseFloat(latitude || "0"),
            longitude: parseFloat(longitude || "0"),
        }
        setTargetLocationContext(newLocation)
        console.log("target location updated to " + newLocation?.latitude + ' ' + newLocation?.longitude)
    }


    return (
        <BleRangeContext.Provider value={{ updateTargetLocation, targetLocationContext }}>
            {children}
        </BleRangeContext.Provider>
    );
};

export const useBleRangeContext = () => {
    const context = useContext(BleRangeContext);
    if (!context) {
        throw new Error('useBleRangeContext must be used within a BleRangeProvider');
    }
    return context;
};
