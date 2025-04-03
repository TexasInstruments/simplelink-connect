import { TestParametersScreenProps } from '../../../types';
import 'react-native-get-random-values';
import React from 'react';
interface Props extends TestParametersScreenProps { }
import { StressTestProvider } from '../../context/TestParamsContext';
import TestForm from '../../components/StressTests/TestForm/index';

const TestParametersScreen: React.FC<Props> = ({ route }) => {
    let { testService, peripheralId, peripheralName } = route.params
    return (
        <StressTestProvider>
            <TestForm testService={testService} peripheralId={peripheralId} peripheralName={peripheralName} />
        </StressTestProvider>
    )
};


export default TestParametersScreen;
