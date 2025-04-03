import { TestResultsProps } from '../../../types';
import 'react-native-get-random-values';
import React from 'react';
import { StressTestProvider } from '../../context/TestParamsContext';
import TestResults from '../../components/StressTests/TestResults';

interface Props extends TestResultsProps { };

const TestResultsScreen: React.FC<Props> = ({ route }) => {
    let { isGattTestingOnly } = route.params
    return (
        <StressTestProvider>
            <TestResults isGattTestingOnly={isGattTestingOnly} />
        </StressTestProvider>
    )
};


export default TestResultsScreen;
