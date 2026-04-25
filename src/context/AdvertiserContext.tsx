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
import advertiserReducer, { AdvertiserActionType } from '../reducers/AdvertiserReducer';
import { IAdvertiserState } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const initialState: IAdvertiserState = {
  advertisements: [],
  activeAdvertisementIds: [],
  bluetoothSupported: true,
  bluetoothEnabled: true,
};

export const AdvertiserState = createContext<IAdvertiserState>(initialState);
export const AdvertiserDispatch = createContext<null | React.Dispatch<AdvertiserActionType>>(null);

type Props = {
  children: React.ReactNode;
};

const AdvertiserProvider: React.FC<Props> = ({ children }) => {
  const [state, dispatch] = useReducer(advertiserReducer, initialState);

  // Load persisted advertisements on mount
  useEffect(() => {
    const loadPersistedAdvertisements = async () => {
      try {
        const storedAds = await AsyncStorage.getItem('@advertiser/advertisements');
        if (storedAds) {
          const advertisements = JSON.parse(storedAds);
          // Reset all advertisements to inactive state on app launch
          const inactiveAds = advertisements.map((ad: any) => ({ ...ad, isActive: false }));
          dispatch({ type: 'advertiser/advertisements/set', payload: inactiveAds });
        }
      } catch (error) {
        console.error('Error loading advertisements:', error);
      }
    };

    loadPersistedAdvertisements();
  }, []);

  // Persist advertisements whenever they change
  useEffect(() => {
    const persistAdvertisements = async () => {
      try {
        await AsyncStorage.setItem(
          '@advertiser/advertisements',
          JSON.stringify(state.advertisements)
        );
      } catch (error) {
        console.error('Error persisting advertisements:', error);
      }
    };

    if (state.advertisements.length > 0) {
      persistAdvertisements();
    }
  }, [state.advertisements]);

  return (
    <AdvertiserState.Provider value={state}>
      <AdvertiserDispatch.Provider value={dispatch}>
        {children}
      </AdvertiserDispatch.Provider>
    </AdvertiserState.Provider>
  );
};

export default AdvertiserProvider;
