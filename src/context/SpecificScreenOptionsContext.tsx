import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SpecificScreenConfig {
  wifiProvisioningConnectionTimeout: number,
}

interface SpecificScreenConfigContextProps {
  specificScreenConfig: SpecificScreenConfig,
  updateConfigurations: (c: SpecificScreenConfig) => Promise<void>
}

const initialState: SpecificScreenConfig = {
  wifiProvisioningConnectionTimeout: 5000,
}

const SpecificScreensConfigContext = createContext<SpecificScreenConfigContextProps | undefined>(undefined);

export const SpecificScreenConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [specificScreenConfig, setSpecificScreenConfig] = useState<SpecificScreenConfig>(initialState);


  useEffect(() => {

    const initiate = async () => {
      // initate terminal configuration with local storage values if exists.
      let connectionTimeout = await AsyncStorage.getItem('@wifiProvisioningConnectionTimeout');
      if (!connectionTimeout) {
        connectionTimeout = '5000';
      }
      console.log({ wifiProvisioningConnectionTimeout: connectionTimeout })
      setSpecificScreenConfig({ wifiProvisioningConnectionTimeout: Number(connectionTimeout) })
    };

    initiate();

  }, []);

  const updateSpecificScreenConfigurations = async (configurations: SpecificScreenConfig) => {

    setSpecificScreenConfig(configurations);

    await AsyncStorage.setItem('@wifiProvisioningConnectionTimeout', JSON.stringify(configurations.wifiProvisioningConnectionTimeout));

    console.log("terminal config updated with", configurations)

  }

  return (
    <SpecificScreensConfigContext.Provider value={{ specificScreenConfig: specificScreenConfig, updateConfigurations: updateSpecificScreenConfigurations }}>
      {children}
    </SpecificScreensConfigContext.Provider>
  );
};

export const useSpecificScreenConfigContext = () => {
  const context = useContext(SpecificScreensConfigContext);
  if (!context) {
    throw new Error('SpecificScreensConfigContext must be used within a SpecificScreenConfigProvider');
  }
  return context;
};
