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

import { useState, useEffect } from 'react';
import { NativeModules, Platform } from 'react-native';

const { BleAdvertiserModule } = NativeModules;

export interface ExtendedAdvertisingCapabilities {
  supported: boolean;
  maxDataLength: number;
  maxSets: number;
  apiLevel: number;
}

export const useExtendedAdvertising = (): ExtendedAdvertisingCapabilities => {
  const [capabilities, setCapabilities] = useState<ExtendedAdvertisingCapabilities>({
    supported: false,
    maxDataLength: 31,
    maxSets: 0,
    apiLevel: 0,
  });

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    BleAdvertiserModule.isExtendedAdvertisingSupported((error: any, result: any) => {
      if (!error && result) {
        setCapabilities(prev => ({
          ...prev,
          supported: result.supported,
          maxDataLength: result.maxDataLength,
          apiLevel: result.apiLevel,
        }));

        if (result.supported) {
          BleAdvertiserModule.getMaxAdvertisingSets((err: any, res: any) => {
            if (!err && res) {
              setCapabilities(prev => ({
                ...prev,
                maxSets: res.maxSets,
              }));
            }
          });
        }
      }
    });
  }, []);

  return capabilities;
};
