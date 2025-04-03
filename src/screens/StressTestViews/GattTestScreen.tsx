import { GattScreenProps } from '../../../types';
import 'react-native-get-random-values';
import React from 'react';
import { StressTestProvider } from '../../context/TestParamsContext';
import GattTestScenario from '../../components/StressTests/GattTestScenario/index';

interface Props extends GattScreenProps { };

const GattTestScreen: React.FC<Props> = ({ route }) => {
    let { testService, peripheralId, peripheralName } = route.params

    return (
        <StressTestProvider>
            <GattTestScenario testService={testService} peripheralId={peripheralId} peripheralName={peripheralName} />
        </StressTestProvider>
    );
};

export default GattTestScreen;