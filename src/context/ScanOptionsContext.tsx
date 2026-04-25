/*
 * Copyright (c) 2023, Texas Instruments Incorporated
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * *  Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *
 * *  Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * *  Neither the name of Texas Instruments Incorporated nor the names of
 *    its contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import { createContext, useReducer, useEffect } from 'react';
import scanOptionsReducer, { ScanOptionsActionType } from '../reducers/ScanOptionsReducer';
import { IScanOptionsState } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const initialState: IScanOptionsState = {
  scanDuration: 10,
  legacyMode: false,
  scanPhy: 0,
  connectionTimeout: 15,
  connectionPhy: 0,
};

export const ScanOptionsState = createContext<IScanOptionsState>(initialState);
export const ScanOptionsDispatch = createContext<null | React.Dispatch<ScanOptionsActionType>>(null);

type Props = {
  children: React.ReactNode;
};

const ScanOptionsProvider: React.FC<Props> = ({ children }) => {
  const [state, dispatch] = useReducer(scanOptionsReducer, initialState);

  // Load persisted scan options on mount
  useEffect(() => {
    const loadPersistedSettings = async () => {
      try {
        const scanDuration = await AsyncStorage.getItem('@scanOptions/scanDuration');
        if (scanDuration) {
          dispatch({ type: 'scanOptions/scanDuration/set', payload: parseInt(scanDuration, 10) });
        }
        const legacyMode = await AsyncStorage.getItem('@scanOptions/legacyMode');
        if (legacyMode) {
          dispatch({ type: 'scanOptions/legacyMode/set', payload: legacyMode === 'true' });
        }
        const scanPhy = await AsyncStorage.getItem('@scanOptions/scanPhy');
        if (scanPhy) {
          dispatch({ type: 'scanOptions/scanPhy/set', payload: parseInt(scanPhy, 10) });
        }
        const connectionTimeout = await AsyncStorage.getItem('@scanOptions/connectionTimeout');
        if (connectionTimeout) {
          dispatch({ type: 'scanOptions/connectionTimeout/set', payload: parseInt(connectionTimeout, 10) });
        }
        const connectionPhy = await AsyncStorage.getItem('@scanOptions/connectionPhy');
        if (connectionPhy) {
          dispatch({ type: 'scanOptions/connectionPhy/set', payload: parseInt(connectionPhy, 10) });
        }
      } catch (error) {
        console.error('Error loading scan options:', error);
      }
    };

    loadPersistedSettings();
  }, []);

  return (
    <ScanOptionsState.Provider value={state}>
      <ScanOptionsDispatch.Provider value={dispatch}>{children}</ScanOptionsDispatch.Provider>
    </ScanOptionsState.Provider>
  );
};

export default ScanOptionsProvider;
