import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TestParams, PHY_OPTIONS, data_stream, TEST_CASE, TestData } from '../components/StressTests/testsUtils';


interface StressTestContextProps {
    testParametersContext: TestParams | null,
    updateTestParams: (c: TestParams) => Promise<void>,
    updateTestLogs: (c: any[]) => Promise<void>,
    updateTestResults: (c: TestData) => Promise<void>,
    testLogs: any[],
    testResults: TestData | undefined
}

const initialState: TestParams = {
    devices_name_list: [],
    pair_and_bond: false,
    connection_phy: PHY_OPTIONS.phy_le_1m.value,
    gatt_data_testing: true,
    mtu_size: 100,
    supported_service: data_stream,
    test_case: TEST_CASE.WRITE_NOTIFY,
    num_loops_gatt_test: 3,
    delay_between_gatt_tests: 3000,
    write_data_size: 5,
    expected_notifications_size: 5,
    main_loop_number: 3,
    connection_duration: 3000,
    delay_between_main_loops: 1500
}

const StressTestContext = createContext<StressTestContextProps | undefined>(undefined);

export const StressTestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [testParametersContext, setTestParameters] = useState<TestParams | null>(null);
    const [testLogs, setTestLog] = useState<any[]>([]);
    const [testResults, setTestResults] = useState<TestData>();

    useEffect(() => {

        const initiate = async () => {
            // initate terminal configuration with local storage values if exists.
            let params = await AsyncStorage.getItem('@testParams');
            console.log('got params from storage:', params)

            if (!params) {
                params = JSON.stringify(initialState);
            }
            setTestParameters(JSON.parse(params));

            let logs = await AsyncStorage.getItem("@testLogs");
            if (!logs) {
                logs = JSON.stringify([]);
            }
            setTestLog(JSON.parse(logs));

            let results = await AsyncStorage.getItem("@testResults");
            if (!results) {
                results = JSON.stringify([]);
            }
            console.log('got results from storage:', results)
            setTestResults(JSON.parse(results));
        };

        initiate();

    }, []);

    const updateTestParams = async (params: TestParams) => {
        setTestParameters(params);
        await AsyncStorage.setItem('@testParams', JSON.stringify(params));
    }

    const updateTestLogs = async (newLogs: any[]) => {
        setTestLog(newLogs);
        await AsyncStorage.setItem('@testLogs', JSON.stringify(newLogs));
    }

    const updateTestResults = async (newResults: TestData) => {
        setTestResults(newResults);
        await AsyncStorage.setItem('@testResults', JSON.stringify(newResults));
    }

    if (!testParametersContext) {
        return null
    }

    return (
        <StressTestContext.Provider value={{ testParametersContext, updateTestParams, testLogs, updateTestLogs, updateTestResults, testResults }}>
            {children}
        </StressTestContext.Provider>
    );
};

export const useStressTestContext = () => {
    const context = useContext(StressTestContext);
    if (!context) {
        throw new Error('StressTestContext must be used within a StressTestProvider');
    }
    return context;
};
