import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TerminalConfig {
  timestamp: boolean,
  messageLength: boolean,
  disabledLocalEcho: boolean,
}

interface TerminalConfigContextProps {
  terminalConfig: TerminalConfig,
  updateTermninalConfigurations: (c: TerminalConfig) => Promise<void>
}

const initialState: TerminalConfig = {
  timestamp: true,
  messageLength: false,
  disabledLocalEcho: false,
}

const TerminalConfigContext = createContext<TerminalConfigContextProps | undefined>(undefined);

export const TerminalConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [terminalConfig, setTerminalConfig] = useState<TerminalConfig>(initialState);


  useEffect(() => {

    const initiate = async () => {
      // initate terminal configuration with local storage values if exists.
      let timestamp = await AsyncStorage.getItem('@showTimestamp');
      if (!timestamp) {
        timestamp = true;
      }
      let messageLength = await AsyncStorage.getItem('@showMessageLength');
      if (!messageLength) {
        messageLength = false;
      }
      let disabledLocalEcho = await AsyncStorage.getItem('@disableLocalEcho');
      if (!disabledLocalEcho) {
        disabledLocalEcho = false;
      }
      console.log({ timestamp: timestamp === 'true', messageLength: messageLength === 'true', disabledLocalEcho: disabledLocalEcho === 'true' })
      setTerminalConfig({ timestamp: timestamp === 'true', messageLength: messageLength === 'true', disabledLocalEcho: disabledLocalEcho === 'true' })
    };

    initiate();

  }, []);

  const updateTermninalConfigurations = async (configurations: TerminalConfig) => {

    setTerminalConfig(configurations);

    await AsyncStorage.setItem('@showTimestamp', JSON.stringify(configurations.timestamp));
    await AsyncStorage.setItem('@showMessageLength', JSON.stringify(configurations.messageLength));
    await AsyncStorage.setItem('@disableLocalEcho', JSON.stringify(configurations.disabledLocalEcho));
    console.log("terminal config updated with", configurations)

  }

  return (
    <TerminalConfigContext.Provider value={{ terminalConfig: terminalConfig, updateTermninalConfigurations }}>
      {children}
    </TerminalConfigContext.Provider>
  );
};

export const useTerminalConfigContext = () => {
  const context = useContext(TerminalConfigContext);
  if (!context) {
    throw new Error('TerminalConfigContext must be used within a TerminalConfigProvider');
  }
  return context;
};
