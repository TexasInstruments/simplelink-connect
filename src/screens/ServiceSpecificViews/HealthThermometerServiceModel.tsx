import HealthThemometer from '../../components/HealthThemometer';
import { RootStackScreenProps } from '../../../types';

interface Props extends RootStackScreenProps<'HealthTermometerServiceModel'> { }


const HealthThermometerServiceModel: React.FC<Props> = ({ route }) => {

    let { peripheralId, serviceUuid } = route.params;

    return (<HealthThemometer peripheralId={peripheralId} serviceUuid={serviceUuid} />

    );
};

export default HealthThermometerServiceModel;
