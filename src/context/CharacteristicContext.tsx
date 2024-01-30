import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { fetchCharacteristicData } from '../services/CharacteristicService';

interface CharacteristicContextProps {
    characteristicData: any | null;
    loading: boolean;
}

const CharacteristicContext = createContext<CharacteristicContextProps | undefined>(undefined);

export const CharacteristicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [characteristicData, setCharacteristicData] = useState<any | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await fetchCharacteristicData();
                setCharacteristicData(data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching YAML file:', error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <CharacteristicContext.Provider value={{ characteristicData, loading }}>
            {children}
        </CharacteristicContext.Provider>
    );
};

export const useCharacteristicContext = () => {
    const context = useContext(CharacteristicContext);
    if (!context) {
        throw new Error('useCharacteristicContext must be used within a CharacteristicProvider');
    }
    return context;
};
