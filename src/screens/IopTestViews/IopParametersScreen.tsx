import { IopParametersScreenProps } from '../../../types';
import 'react-native-get-random-values';
import React from 'react';
interface Props extends IopParametersScreenProps { }
import { TestParamsProvider } from '../../context/TestParamsContext';
import TestForm from '../../components/Tests/TestForm/index';

const IopParametersScreen: React.FC<Props> = ({ route }) => {
    let { testService, peripheralId, peripheralName } = route.params
    return (
        <TestParamsProvider>
            <TestForm testService={testService} peripheralId={peripheralId} peripheralName={peripheralName} />
        </TestParamsProvider>
    )
};


export default IopParametersScreen;
