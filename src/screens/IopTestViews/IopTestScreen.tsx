import { IopTestScreenProps } from '../../../types';
import 'react-native-get-random-values';
import React from 'react';
import { TestParamsProvider } from '../../context/TestParamsContext';
import StressTestScenario from '../../components/Tests/StressTestScenario/index';



interface Props extends IopTestScreenProps { };

const IopTestScreen: React.FC<Props> = ({ route }) => {
    return (
        <TestParamsProvider>
            <StressTestScenario />
        </TestParamsProvider>
    );
};

export default IopTestScreen;