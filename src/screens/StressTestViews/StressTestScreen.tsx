import { StressTestScreenProps } from '../../../types';
import 'react-native-get-random-values';
import React from 'react';
import { StressTestProvider } from '../../context/TestParamsContext';
import StressTestScenario from '../../components/StressTests/StressTestScenario/index';



interface Props extends StressTestScreenProps { };

const StressTestScreen: React.FC<Props> = ({ route }) => {
    return (
        <StressTestProvider>
            <StressTestScenario />
        </StressTestProvider>
    );
};

export default StressTestScreen;