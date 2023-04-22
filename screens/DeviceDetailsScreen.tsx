import BleDevice from '../src/components/BleDevice/BleDevice';
import { RootTabScreenProps } from '../types';

interface Props extends RootTabScreenProps<'DeviceTab'> {}

const DeviceDetailsScreen: React.FC<Props> = (props) => {
  let {
    route: {
      params: { peripheralId },
    },
    navigation,
  } = props;

  return <BleDevice peripheralId={peripheralId} navigation={navigation} />;
};

export default DeviceDetailsScreen;
