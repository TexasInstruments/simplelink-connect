import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { fetchProfileList } from '../services/YamlDataService';

interface ProfileListContextProps {
    profileList: any | null;
    loading: boolean;
}

const ProfileListContext = createContext<ProfileListContextProps | undefined>(undefined);

export const ProfileListProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [profilesList, setProfilesList] = useState<any | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await fetchProfileList();
                setProfilesList(data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching YAML file:', error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <ProfileListContext.Provider value={{ profileList: profilesList, loading }}>
            {children}
        </ProfileListContext.Provider>
    );
};

export const useProfilesContext = () => {
    const context = useContext(ProfileListContext);
    if (!context) {
        throw new Error('useProfilesContext must be used within a ProfileListProvider');
    }
    return context;
};
