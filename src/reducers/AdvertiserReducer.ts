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

import { IAdvertiserState, IAdvertisement } from '../../types';

export type AdvertiserActionType =
  | { type: 'advertiser/advertisements/set'; payload: IAdvertisement[] }
  | { type: 'advertiser/advertisement/add'; payload: IAdvertisement }
  | { type: 'advertiser/advertisement/update'; payload: { id: string; updates: Partial<IAdvertisement> } }
  | { type: 'advertiser/advertisement/delete'; payload: string }
  | { type: 'advertiser/advertisement/toggle'; payload: { id: string; isActive: boolean } }
  | { type: 'advertiser/activeIds/set'; payload: string[] }
  | { type: 'advertiser/bluetooth/setState'; payload: { supported: boolean; enabled: boolean } };

function advertiserReducer(state: IAdvertiserState, action: AdvertiserActionType): IAdvertiserState {
  const { type, payload } = action;

  switch (type) {
    case 'advertiser/advertisements/set': {
      return {
        ...state,
        advertisements: payload as IAdvertisement[],
      };
    }

    case 'advertiser/advertisement/add': {
      return {
        ...state,
        advertisements: [...state.advertisements, payload as IAdvertisement],
      };
    }

    case 'advertiser/advertisement/update': {
      const { id, updates } = payload as { id: string; updates: Partial<IAdvertisement> };
      return {
        ...state,
        advertisements: state.advertisements.map(ad =>
          ad.id === id ? { ...ad, ...updates, updatedAt: new Date().toISOString() } : ad
        ),
      };
    }

    case 'advertiser/advertisement/delete': {
      const idToDelete = payload as string;
      return {
        ...state,
        advertisements: state.advertisements.filter(ad => ad.id !== idToDelete),
        activeAdvertisementIds: state.activeAdvertisementIds.filter(id => id !== idToDelete),
      };
    }

    case 'advertiser/advertisement/toggle': {
      const { id, isActive } = payload as { id: string; isActive: boolean };
      return {
        ...state,
        advertisements: state.advertisements.map(ad =>
          ad.id === id ? { ...ad, isActive } : ad
        ),
        activeAdvertisementIds: isActive
          ? [...state.activeAdvertisementIds, id]
          : state.activeAdvertisementIds.filter(aid => aid !== id),
      };
    }

    case 'advertiser/activeIds/set': {
      return {
        ...state,
        activeAdvertisementIds: payload as string[],
      };
    }

    case 'advertiser/bluetooth/setState': {
      const { supported, enabled } = payload as { supported: boolean; enabled: boolean };
      return {
        ...state,
        bluetoothSupported: supported,
        bluetoothEnabled: enabled,
      };
    }

    default:
      return state;
  }
}

export default advertiserReducer;
