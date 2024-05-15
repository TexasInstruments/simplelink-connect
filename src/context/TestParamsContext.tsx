import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TestParams, PHY_OPTIONS, data_stream, TEST_CASE } from '../components/Tests/testsUtils';


interface TestParamsContextProps {
    testParametersContext: TestParams | null,
    updateTestParams: (c: TestParams) => Promise<void>
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

const TestParamsContext = createContext<TestParamsContextProps | undefined>(undefined);

export const TestParamsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [testParametersContext, setTestParameters] = useState<TestParams | null>(null);


    useEffect(() => {

        const initiate = async () => {
            // initate terminal configuration with local storage values if exists.
            let params = await AsyncStorage.getItem('@testParams');
            console.log('got params from storage:', params)

            if (!params) {
                params = JSON.stringify(initialState);
            }
            setTestParameters(JSON.parse(params));
        };

        initiate();

    }, []);

    const updateTestParams = async (params: TestParams) => {

        setTestParameters(params);
        await AsyncStorage.setItem('@testParams', JSON.stringify(params));
        console.log("test parameters updated with", params)

    }
    if (!testParametersContext) {
        return null
    }

    return (
        <TestParamsContext.Provider value={{ testParametersContext, updateTestParams }}>
            {children}
        </TestParamsContext.Provider>
    );
};

export const useTestParamsContext = () => {
    const context = useContext(TestParamsContext);
    if (!context) {
        throw new Error('TestParamsContext must be used within a TestParamsProvider');
    }
    return context;
};
