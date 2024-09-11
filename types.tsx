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

/**
 * Learn more about using TypeScript with React Navigation:
 * https://reactnavigation.org/docs/typescript/
 */

import { BottomTabNavigationProp, BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { DrawerScreenProps } from '@react-navigation/drawer';
import {
  CompositeNavigationProp,
  CompositeScreenProps,
  NavigatorScreenParams,
  RouteProp,
} from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import BleManager from 'react-native-ble-manager';

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList { }
  }
}

export type RootStackParamList = {
  Root: NavigatorScreenParams<RootTabParamList> | undefined;
  Tutorial: undefined;
  IopParameters: { testService: string | null, peripheralId: string | null, peripheralName: string | null };
  IopTest: undefined;
  GattTesting: { testService: string | null, peripheralId: string | null, peripheralName: string | null };
  Characteristics: {
    serviceUuid: string;
    serviceName: string;
    peripheralInfo: BleManager.PeripheralInfo;
    icon: Icon;
  };
  FwUpdateServiceModel: { peripheralId: string };
  EcgServiceModel: { peripheralId: string };
  HealthTermometerServiceModel: { peripheralId: string };
  CgmServiceModel: { peripheralId: string };
  MatterLightServiceModel: { peripheralId: string };
  TerminalServiceModel: { peripheralId: string };
  SensorTagModel: { peripheralId: string, serviceName: string };
  GlucoseServiceModel: { peripheralId: string };
  WifiProvisioning: { peripheralId: string, isLinuxDevice: boolean };
  ModalScreen: { peripheralId: string };
  SettingsModal: undefined;
  TerminalSettingsDrawer: undefined;
  NotFound: undefined;
  FilterSortOptions: undefined;
  ConfigRepository: undefined;
};

export type RootDrawerParamList = {
  DrawerRoot: undefined;
};

export type RootStackScreenProps<Screen extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  Screen
>;

export type RootTabParamList = {
  ScanTab: NavigatorScreenParams<RootDrawerParamList>;
  DeviceTab: {
    peripheralId: string;
    isConnected: boolean;
    isBonded: boolean;
  };
  TerminalServiceModel: {
    peripheralId: string;
  }
};

export type ScanScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'ScanTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type CharacteristicsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Characteristics'
>;

export type TutorialScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Tutorial'
>;

export type DeviceScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'DeviceTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;
export type IopParametersScreenProps = RootScreenprops<'IopParameters'>;
export type GattScreenProps = RootScreenprops<'GattTesting'>;
export type IopTestScreenProps = RootScreenprops<'IopTest'>;
export type FilterSortScreenProps = RootScreenprops<'FilterSortOptions'>;
export type ConfigRepositoryScreenProps = RootScreenprops<'ConfigRepository'>;

export type RootTabScreenProps<Screen extends keyof RootTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, Screen>,
  NativeStackScreenProps<RootStackParamList>
>;

export type RootScreenprops<Screen extends keyof RootStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<RootStackParamList, Screen>,
  DrawerScreenProps<RootDrawerParamList>
>;

export type DeviceScreenRouteProp = RouteProp<RootTabParamList, 'DeviceTab'>;
export type TerminalScreenRouteProp = RouteProp<RootTabParamList, 'TerminalServiceModel'>;

declare module 'react-native-ble-manager' {
  //@ts-ignore
  export interface Peripheral extends Peripheral {
    showAdvertising: boolean;
    isConnected: boolean;
    isBonded: boolean;
    icon?: {
      name: string;
      type?: 'material' | 'font-awesome' | 'brands';
    };
    brand?: string;
    advertiesmentCount: number;
    prevAdvertismentCount: number;
    advertismentActive: number;
    advertismentInActive: boolean;
    filter: boolean;
    serviceUUIDs?: string[];
  }

  export interface AdvertisingData {
    isConnectable?: boolean;
    localName?: string;
    manufacturerData?: ManufacturerData | any;
    serviceData?: any;
    serviceUUIDs?: string[];
    txPowerLevel?: number;
  }
}

export type ManufacturerData = {
  manufacturerId: number;
  category: number;
  services: [string];
  name: string;
  icon?: {
    name: string;
    type?: 'font-awesome' | 'material' | 'brands';
  };
};

export interface IFilterSortState {
  filter: {
    rssi: {
      enabled: boolean;
      value: string;
    };
    app_name: {
      enabled: boolean;
      value: string;
    };
    address: {
      enabled: boolean;
      value: string;
    };
    connectable: boolean;
    removeInactiveOutDevices: boolean;
    profile: {
      enabled: boolean;
      value: string;
    };
  };
  sort: {
    rssi: boolean;
    app_name: boolean;
  };
}

export type Icon = {
  type: string;
  iconName: string;
};

export type TerminalMessageType = 'default' | 'error' | 'info';

export type TerminalMessage = {
  id?: string;
  date?: string;
  text: string;
  type: TerminalMessageType;
};

export type Axies = {
  x: number;
  y: number;
  z: number;
}[];

export interface MovementSensorState {
  gyro: Axies;
  acc: Axies;
  mag: Axies;
}

export interface BrandList {
  [key: string]: Brand;
}

export type Brand = {
  name: string;
  iconName?: BrandIconName;
};

export type BrandIconName =
  | 'lg'
  | 'apple'
  | 'samsung'
  | 'sony'
  | 'hp'
  | 'bose'
  | 'huawei'
  | 'amazon'
  | 'meta'
  | 'google'
  | 'microsoft'
  | 'razer'
  | 'xiaomi'
  | 'toshiba'
  | 'qualcomm'
  | 'disney'
  | 'TI';
