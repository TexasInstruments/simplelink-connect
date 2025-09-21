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

import BleManager from 'react-native-ble-manager';
import { RootStackParamList, RootStackScreenProps } from '../../types';
import Characteristic from '../components/Characteristic';
import { useEffect, useMemo, useState } from 'react';
import { CharacteristicProvider } from '../context/CharacteristicContext';
import { uuidToServiceSpecificScreen } from '../hooks/uuidToName';
import TerminalServiceModel from './ServiceSpecificViews/TerminalServiceModel';
import FWUpdate_Modal from '../components/FWUpdate/FWUpdate_Modal';
import CGM from '../components/ContiniousGlucoseMonitoring';
import HealthThermometer from '../components/HealthThermometer';
import SensorTagServiceModel from './ServiceSpecificViews/SensorTagServiceModel';
import { useCharacteristicViewContext } from '../context/CharactristicViewContext';
import GlucoseProfile from '../components/GlucoseProfile';
import WifiProvisioningOverBLEScreen from '../components/WifiProvisioningOverBle';
import MatterLight from '../components/MatterLight';
import ECG from '../components/ECG';
import BatteryLevelService from '../components/BatteryLevelService';
import BLERangeTestConfig from '../components/BLERangeTestConfig';
import BLERangeStatics from '../components/BLERangeStatics';
import ClassificationModeServiceScreen from '../components/ClassificationModeService';
import DataAcquisitionServiceScreen from '../components/DataAcquisitionService';
import ZephyrDFUModal from '../components/Zephyr/ZephyrDFUModal';

interface Props extends RootStackScreenProps<'Characteristics'> { }

export const SUPPORTED_SPECIFIC_SCREEN = ["sub-1 range test config", "sub-1 range statistics", "battery level", "classification mode", "data acquisition mode", "matter light profile", "light sensor service", "wi-fi provisioning over ble", "ti ecg service", "ecg service", "glucose", "continuous glucose monitoring", "health thermometer", "ti terminal", "ti oad", "temp", "humidity", "barometer", "optical", "movement", "simple keys", "battery", "i/o", "control", "battery service", "ti accelerometer service", , "zephyr mcu manager service"] as const;

const CharacteristicScreen: React.FC<Props> = ({ route }) => {
  let peripheralInfo = route.params.peripheralInfo!;
  let serviceUuid = route.params.serviceUuid!;
  let serviceName = route.params.serviceName!;

  const [screenSpecific, setScreenSpecific] = useState<keyof RootStackParamList | null>(null);
  const { characteristicView, updateService, updatePeripheralInfo } = useCharacteristicViewContext();


  let serviceCharacteristics: BleManager.Characteristic[] = useMemo(() => {
    return peripheralInfo.characteristics!.filter(
      (_data, i) => peripheralInfo.characteristics![i].service === serviceUuid
    );
  }, []);


  useEffect(() => {
    (async () => {
      try {
        let checkForScreenSpecificScreen = await uuidToServiceSpecificScreen({ uuid: serviceUuid, peripheralName: peripheralInfo.name });
        if (!checkForScreenSpecificScreen || !isServiceSupportSensor()) throw Error('Service Specific Screen not implemented!');

        setScreenSpecific(
          checkForScreenSpecificScreen.serviceSpecificScreen as keyof RootStackParamList
        );
      } catch (error) {
        console.log(error)
        setScreenSpecific(null);
      }
    })();

    updateService(serviceName, serviceUuid);
    updatePeripheralInfo(peripheralInfo.name, peripheralInfo.id)

  }, [serviceUuid]);

  let isServiceSupportSensor = () => {
    return SUPPORTED_SPECIFIC_SCREEN.find(sensor => serviceName.toLowerCase().includes(sensor))
  }

  const SpecificScreen = () => {

    switch (screenSpecific) {
      case 'FwUpdateServiceModel':
        return <FWUpdate_Modal peripheralId={peripheralInfo.id} />

      case 'ZephyrDFUServiceModel':
        return <ZephyrDFUModal peripheralId={peripheralInfo.id} />

      case 'TerminalServiceModel':
        return <TerminalServiceModel peripheralId={peripheralInfo.id} />

      case 'CgmServiceModel':
        return <CGM peripheralId={peripheralInfo.id} />

      case 'HealthThermometerServiceModel':
        return <HealthThermometer peripheralId={peripheralInfo.id} />

      case 'SensorTagModel':
        return <SensorTagServiceModel peripheralId={peripheralInfo.id} serviceName={serviceName} />

      case 'GlucoseServiceModel':
        return <GlucoseProfile peripheralId={peripheralInfo.id} />

      case 'WifiProvisioning':
        let isLinuxDevice = false;
        if (serviceUuid.toLocaleLowerCase().includes('180d') && peripheralInfo.name === 'cc33xxble') {
          isLinuxDevice = true;
        }
        return <WifiProvisioningOverBLEScreen peripheralId={peripheralInfo.id} isLinuxDevice={isLinuxDevice} />

      case 'MatterLightServiceModel':
        return <MatterLight peripheralId={peripheralInfo.id} />

      case 'EcgServiceModel':
        return <ECG peripheralId={peripheralInfo.id} />

      case 'BatteryService':
        return <BatteryLevelService peripheralId={peripheralInfo.id} />

      case 'BLERangeTestConfig':
        return <BLERangeTestConfig peripheralId={peripheralInfo.id} />

      case 'BLERangeStatics':
        return <BLERangeStatics peripheralId={peripheralInfo.id} />

      case 'ClassificationServiceModel':
        return <ClassificationModeServiceScreen peripheralId={peripheralInfo.id} />

      case 'DataAcquisitionServiceModel':
        return <DataAcquisitionServiceScreen peripheralId={peripheralInfo.id} />
    }
  }

  return (
    <>
      {(!screenSpecific || characteristicView === 'advanced') && (
        <>
          <CharacteristicProvider>
            <Characteristic
              icon={route.params.icon}
              peripheralId={peripheralInfo.id}
              peripheralName={peripheralInfo.name}
              serviceUuid={serviceUuid}
              serviceName={serviceName}
              serviceCharacteristics={serviceCharacteristics}
            />
          </CharacteristicProvider>
        </>
      )}
      {screenSpecific && characteristicView === 'specific' && (
        SpecificScreen()
      )}
    </>
  );
};

export default CharacteristicScreen;
