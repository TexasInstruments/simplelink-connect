import { StyleSheet } from 'react-native';
import FWUpdate_Modal from '../src/components/FWUpdate/FWUpdate_Modal';
import { RootStackScreenProps } from '../types';

interface Props extends RootStackScreenProps<'FwUpdateServiceModel'> {}

const ModalScreen: React.FC<Props> = (props) => {
  let { route } = props;

  let peripheralId = route.params.peripheralId!;
  console.log('ModalScreen peripheralId: ', peripheralId);

  return <FWUpdate_Modal peripheralId={peripheralId} />;
};

export default ModalScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
});
