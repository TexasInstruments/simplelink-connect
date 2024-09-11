import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SpecificScreenConfig {
  wifiProvisioningConnectionTimeout: number,
  temperatureSensorScaleLSB: string,
  tempUnits: 'C' | 'F',
  pointsNumberToDisplay: number,
  recordDuration: number | 'no limit',
  medianOn: number,
  medianEvery: number,
  applyRespFilter: boolean
}

interface SpecificScreenConfigContextProps {
  specificScreenConfig: SpecificScreenConfig,
  updateConfigurations: (c: SpecificScreenConfig) => Promise<void>
}

const initialState: SpecificScreenConfig = {
  wifiProvisioningConnectionTimeout: 5000,
  temperatureSensorScaleLSB: '0.03125',
  tempUnits: 'C',
  pointsNumberToDisplay: 1000,
  recordDuration: 'no limit',
  medianOn: 20,
  medianEvery: 20,
  applyRespFilter: true
}

const SpecificScreensConfigContext = createContext<SpecificScreenConfigContextProps | undefined>(undefined);

export const SpecificScreenConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [specificScreenConfig, setSpecificScreenConfig] = useState<SpecificScreenConfig>(initialState);

  useEffect(() => {

    const initiate = async () => {
      // initiate terminal configuration with local storage values if exists.
      let connectionTimeout = await AsyncStorage.getItem('@wifiProvisioningConnectionTimeout');
      if (!connectionTimeout) {
        connectionTimeout = '5000';
      }

      let temperatureSensorScaleLSB = await AsyncStorage.getItem('@temperatureSensorScaleLSB');
      if (!temperatureSensorScaleLSB) {
        temperatureSensorScaleLSB = '0.03125';
      }
      let tempUnits = await AsyncStorage.getItem('@tempUnits');
      if (!tempUnits) {
        tempUnits = 'C';
      }

      let pointsNumberToDisplay = await AsyncStorage.getItem('@pointsNumberToDisplay');
      if (!pointsNumberToDisplay) {
        pointsNumberToDisplay = '1000';
      }
      let recordDuration = await AsyncStorage.getItem('@recordDuration');
      if (!recordDuration) {
        recordDuration = '10';
      }
      let medianOn = await AsyncStorage.getItem('@medianOn');
      if (!medianOn) {
        medianOn = '20';
      }
      let medianEvery = await AsyncStorage.getItem('@medianEvery');
      if (!medianEvery) {
        medianEvery = '20';
      }
      let applyRespFilter = await AsyncStorage.getItem('@applyRespFilter');
      if (!applyRespFilter) {
        applyRespFilter = 'true';
      }

      let updatedConf: SpecificScreenConfig = { wifiProvisioningConnectionTimeout: Number(connectionTimeout), temperatureSensorScaleLSB: temperatureSensorScaleLSB, tempUnits: tempUnits, pointsNumberToDisplay: Number(pointsNumberToDisplay), recordDuration: (recordDuration === 'no limit' ? recordDuration : Number(recordDuration)), medianEvery: Number(medianEvery), medianOn: Number(medianOn), applyRespFilter: applyRespFilter === 'true' }
      setSpecificScreenConfig(updatedConf)
    };

    initiate();

  }, []);

  const updateSpecificScreenConfigurations = async (configurations: SpecificScreenConfig) => {

    setSpecificScreenConfig(configurations);

    await AsyncStorage.setItem('@wifiProvisioningConnectionTimeout', JSON.stringify(configurations.wifiProvisioningConnectionTimeout));
    await AsyncStorage.setItem('@temperatureSensorScaleLSB', configurations.temperatureSensorScaleLSB);
    await AsyncStorage.setItem('@tempUnits', configurations.tempUnits);
    await AsyncStorage.setItem('@pointsNumberToDisplay', JSON.stringify(configurations.pointsNumberToDisplay));
    await AsyncStorage.setItem('@recordDuration', JSON.stringify(configurations.recordDuration));
    await AsyncStorage.setItem('@medianOn', JSON.stringify(configurations.medianOn));
    await AsyncStorage.setItem('@medianEvery', JSON.stringify(configurations.medianEvery));
    await AsyncStorage.setItem('@applyRespFilter', JSON.stringify(configurations.applyRespFilter));

    console.log("screen config updated with", configurations)

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
