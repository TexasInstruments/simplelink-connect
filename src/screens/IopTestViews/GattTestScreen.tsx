import { GattScreenProps } from '../../../types';
import 'react-native-get-random-values';
import React from 'react';
import { TestParamsProvider } from '../../context/TestParamsContext';
import GattTestScenario from '../../components/Tests/GattTestScenario/index';



interface Props extends GattScreenProps { };

const GattTestScreen: React.FC<Props> = ({ route }) => {
    let { testService, peripheralId, peripheralName } = route.params

    return (
        <TestParamsProvider>
            <GattTestScenario testService={testService} peripheralId={peripheralId} peripheralName={peripheralName} />
        </TestParamsProvider>
    );
};

export default GattTestScreen;