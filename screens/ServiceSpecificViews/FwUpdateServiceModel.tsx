import FWUpdate_Modal from '../../src/components/FWUpdate/FWUpdate_Modal';
import { RootStackScreenProps } from '../../types';

interface Props extends RootStackScreenProps<'FwUpdateServiceModel'> {}

const FwUpdateServiceModel: React.FC<Props> =  ({ route }) => {
  console.log(route.params, 'route params');
  let peripheralId = route.params.peripheralId!;
  console.log('FwUpdateServiceModel: peripheralId', peripheralId)
  return <FWUpdate_Modal peripheralId={peripheralId} />;
};

export default FwUpdateServiceModel;
