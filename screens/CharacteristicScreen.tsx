import BleManager from 'react-native-ble-manager';
import { RootStackScreenProps } from '../types';
import Characteristic from '../src/components/Characteristic';
import { useMemo } from 'react';

interface Props extends RootStackScreenProps<'Characteristics'> {}

const CharacteristicScreen: React.FC<Props> = ({ route }) => {
  console.log(route.params, 'route params');
  let peripheralInfo = route.params.peripheralInfo!;
  let serviceUuid = route.params.serviceUuid!;
  let serviceName = route.params.serviceName!;
  console.log('peripheralInfo: ', peripheralInfo.id);
  console.log('serviceUuid: ', serviceUuid);

  let serviceCharacteristics: BleManager.Characteristic[] = useMemo(() => {
    return peripheralInfo.characteristics!.filter(
      (_data, i) => peripheralInfo.characteristics![i].service === serviceUuid
    );
  }, []);

  console.log('serviceCharacteristics: ', serviceCharacteristics);

  return (
    <Characteristic
      icon={route.params.icon}
      peripheralId={peripheralInfo.id}
      serviceUuid={serviceUuid}
      serviceName={serviceName}
      serviceCharacteristics={serviceCharacteristics}
    />
  );
};

export default CharacteristicScreen;
