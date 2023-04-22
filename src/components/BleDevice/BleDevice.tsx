/*
 * Copyright (c) 2015-2018, Texas Instruments Incorporated
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

import React from 'react';
import {
  NativeModules,
  NativeEventEmitter,
  StyleSheet,
  ColorSchemeName,
  ScrollView,
  Platform,
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import { useColorSchemeHOC } from '../../../hooks/useColorScheme';
import { RootTabScreenProps } from '../../../types';
import DeviceInfo from './DeviceInfo';
import DeviceServices from './DeviceServices';
import DeviceServiceSkeleton from './DeviceServices/DeviceServiceSkeleton';

const BleManagerModule = NativeModules.BleManager;

interface BleDeviceProps extends RootTabScreenProps<'DeviceTab'> {
  peripheralId: string;
  theme: NonNullable<ColorSchemeName>;
  toggleFWDialog: () => void;
}

interface BleDevicePropsState {
  deviceState: string;
  peripheralInfo?: BleManager.PeripheralInfo;
}

const initialState: BleDevicePropsState = {
  deviceState: 'not connected',
};

export class BleDevice extends React.Component<BleDeviceProps, BleDevicePropsState> {
  constructor(props: BleDeviceProps) {
    super(props);
    this.state = initialState;

    this.discover = this.discover.bind(this);
    this.connect = this.connect.bind(this);

    console.log('BleDevice create: ', this.props.peripheralId);
  }


  componentDidMount(): void {
    BleManager.isPeripheralConnected(
      this.props.peripheralId,
      []
    ).then((isConnected) => {
      if (isConnected) {
        console.log("BleDevice: Peripheral is connected!");
      } else {
        console.log("BleDevice: Peripheral is NOT connected!");
        this.connect(this.props.peripheralId);
      }
    });
  }

  componentDidUpdate(prevProps: Readonly<BleDeviceProps>): void {
    console.log('BleDevice componentDidUpdate peripheral id', this.props.peripheralId);

    const BleManagerModule = NativeModules.BleManager;
    const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
    bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral')
    bleManagerEmitter.addListener(
      'BleManagerDisconnectPeripheral',
      (event: any) => {
        this.setState({
          deviceState: 'Disconnected',
        });

        this.connect(this.props.peripheralId);
      }
    );

    if (this.props.peripheralId !== prevProps.peripheralId) {
      this.connect(this.props.peripheralId);
    }
  }

  componentWillUnmount(): void {
    console.log('componentWillUnmount')
  }

  public render() {
    return (
      <ScrollView style={[styles.container]} contentContainerStyle={{ paddingBottom: 20 }}>
        <DeviceInfo
          peripheralInfo={this.state.peripheralInfo}
          deviceState={this.state.deviceState}
          discover={this.discover}
          connect={this.connect}
          peripheralId={this.props.peripheralId}
        />
        <DeviceServices peripheralInfo={this.state.peripheralInfo} />
        {(this.state.deviceState !== 'Connected') && (
          <DeviceServiceSkeleton/>
        )}
      </ScrollView>
    );
  }

  private connect(peripheralId: string): void {
    this.setState({
      deviceState: 'Connecting',
      peripheralInfo: undefined
    });

    console.log('connect: ', peripheralId);
    console.log('expected: ', this.props.peripheralId);

    if(peripheralId === this.props.peripheralId) {
      BleManager.connect(peripheralId)
        .then(() => {
          console.log('Connected');
          this.setState({
            deviceState: 'Connected',
          });

          this.discover(peripheralId);
        })
        .catch((error) => {
          console.log('connect: ', error);
        });
    }
  }

  private async discover(peripheralId: string): Promise<void> {
    console.log('retrieveServices: ', peripheralId);
    this.setState({
      deviceState: 'Discovering',
    });

    await BleManager.retrieveServices(peripheralId)
      .then((peripheralInfo) => {
        // Success code
        let services: any = peripheralInfo.services;

        let parsedServices =
          Platform.OS === 'ios' ? services.map((uuid: string) => ({ uuid })) : services;

        if(peripheralInfo.name == null){
          peripheralInfo.name = 'Unknown';
        }

        this.setState((prev) => ({
          ...prev,
          deviceState: 'Connected',
          peripheralInfo: {
            ...peripheralInfo,
            services: parsedServices,
          },
        }));

        Promise.resolve()
      })
      .catch((error) => {
        console.log('retrieveServices: ', error);
        Promise.resolve()
      });
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  deviceInfo: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    borderRadius: 20,
    borderWidth: 3,
  },
  deviceInfoHeader: { paddingVertical: 10, fontWeight: '600', fontSize: 20 },
  deviceInfoPeripheralId: { paddingTop: 10, paddingBottom: 20, fontSize: 13, fontWeight: '400' },
  deviceInfoIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servicesHeaderWrapper: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    paddingVertical: 10,
  },
  fwContainer: {
    paddingVertical: 15,
    borderTopWidth: 3,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  servicesWrapper: {
    borderTopWidth: 3,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  servicesCountWrapper: {
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderTopWidth: 3,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  services: {
    flex: 1,
    borderWidth: 3,
    borderRadius: 20,
    marginTop: 30,
  },
});

export default useColorSchemeHOC(BleDevice);
