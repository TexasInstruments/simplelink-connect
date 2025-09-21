import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import 'react-native-get-random-values';
import React, { useEffect, useState } from 'react';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { View, Text } from '../../Themed';
import Colors from '../../../constants/Colors';
import { handleExportLogs, handleExportResults, TEST_CASE, TestData, TestResult } from '../testsUtils';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLinkSlash } from '@fortawesome/free-solid-svg-icons/faLinkSlash';
import { Divider } from 'react-native-paper';
import { FontAwesome5 } from '@expo/vector-icons';
import { useStressTestContext } from '../../../context/TestParamsContext';

const PASS_COLOR = '#367E18';
const FAILURE_COLOR = Colors.primary;

const TestResults: React.FC<{ isGattTestingOnly: boolean }> = ({ isGattTestingOnly }) => {

    const { testLogs, testResults } = useStressTestContext();

    const [showConnectionErrors, setShowConnectionErrors] = useState(false);
    const [showBondsErrors, setShowBondsErrors] = useState(false);
    const [showWriteErrors, setShowWriteErrors] = useState(false);
    const [showNotificationErrors, setShowNotificationErrors] = useState(false);
    const [showReadErrors, setShowReadErrors] = useState(false);
    const [showDisconnectErrors, setShowDisconnectErrors] = useState(false);
    const [currentLogs, setCurrentLogs] = useState(testLogs);
    const [currentResults, setCurrentResults] = useState(testResults);

    useEffect(() => {
        setCurrentLogs(testLogs);
    }, [testLogs])

    useEffect(() => {
        setCurrentResults(testResults);
    }, [testResults]);

    if (!currentResults) {
        return null
    }

    const toggleErrors = (setFunction: React.Dispatch<React.SetStateAction<boolean>>) => {
        setFunction(prev => !prev);
    };

    // Convert execution time to hours, minutes, seconds, and ms
    const formatDuration = (ms: number) => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = Math.floor(ms % 1000);
        //     if (hours === 0 && minutes === 0) {
        //         return `${seconds}s ${milliseconds}ms`; // Only seconds and milliseconds
        //     } else if (hours === 0 && minutes > 0) {
        //         return `${minutes}m ${seconds}s`; // Only minutes and seconds

        //     } else if (hours > 0 && minutes > 0) {
        //         return `${hours}h ${minutes}m `; // Only hours and minutes
        //     }
        //     else {
        //         return `${hours}h ${minutes}m ${seconds}s ${milliseconds}ms`; // Full format
        //     }
        // };


        return `${(minutes + hours * 60).toString().padStart(2, '0')}:` +
            `${seconds.toString().padStart(2, '0')}:` +
            `${milliseconds.toString().padStart(3, '0')}`;
    };

    const results = currentResults!.results

    // Calculate Successes
    const totalPassedWrites = results.filter((r) => (r.write === true)).length;
    const totalPassedReads = results.filter((r) => (r.read === true)).length;
    const totalPassedNotifications = results.filter((r) => r.got_expected_notification === true).length;
    const totalPassedDisconnect = new Set(
        results
            .filter(r => r.disconnected === true && r.connection === true)
            .map((r) => `${r.main_loop_number}-${r.device_name}`)
    ).size
    const totalPassedConnections = new Set(
        results
            .filter(r => r.connection === true)
            .map((r) => `${r.main_loop_number}-${r.device_name}`)
    ).size
    const totalPassedBonds = new Set(
        results
            .filter(r => r.bonded === true)
            .map((r) => `${r.main_loop_number}-${r.device_name}`)
    ).size;


    // Calculate Failures
    const connectionFailures = results.filter((r) => (r.connection === false && r.bonded != false));
    const writeFailures = results.filter((r) => (r.write === false));

    const notificationFailures = results.filter((r) => r.got_expected_notification === false);

    const readFailures = results.filter((r) => r.read === false);

    const bondFailures = results.filter((r) => r.bonded === false);
    const totalBonds = new Set(
        results
            .filter(r => (r.bonded === true || r.bonded === false)) // Keep only successful connections
            .map((r) => `${r.main_loop_number}-${r.device_name}`)
    ).size;

    const disconnectFailures = results.filter((r) => r.disconnected === false);

    // Calculate total of each step
    const totalWrites = results.filter((r) => (r.write === false || r.write === true)).length;
    const totalNotifications = results.filter((r) => (r.got_expected_notification === false || r.got_expected_notification === true) && r.write == true).length;
    const totalReads = results.filter((r) => (r.read === false || r.read === true) && r.write == true).length;
    const totalDisconnections = new Set(
        results
            .filter(r => ((r.disconnected === true || r.disconnected === false) && r.connection == true))
            .map((r) => `${r.main_loop_number}-${r.device_name}`)
    ).size;
    const totalConnections = new Set(
        results
            .filter(r => ((r.connection === true || (r.connection === false && r.bonded != false)))) // Keep only successful connections
            .map((r) => `${r.main_loop_number}-${r.device_name}`)
    ).size;

    // Calculate total tests and success percentage
    const calculateTotalTests = () => {
        // each test connect loop contains connect + bond? + disconnect, gatt loop contains write + receive notification 
        // passed tests should include each step success.
        let totalTests = 0;
        // if only gatt testing, the test is on one device and each gatt loop contains 2 gatt operations 
        if (isGattTestingOnly) {
            totalTests = currentResults!.test_parameters.num_of_gatt_loops * 2;
        }
        // if not gatt testing selected, the tests in only connect + disconnect number of main loops for each device.
        else if (!testResults?.test_parameters.gatt_testing_selected) {
            totalTests = currentResults!.test_parameters.num_of_devices * (currentResults!.test_parameters.num_of_main_loops! * 2)
        }
        // else, the test includes gatt and connect, disconnect.
        else {
            totalTests = currentResults!.test_parameters.num_of_devices * (currentResults!.test_parameters.num_of_main_loops! * (2 + (currentResults!.test_parameters.pair_and_bond ? 1 : 0)) + currentResults!.test_parameters.num_of_main_loops! * currentResults!.test_parameters.num_of_gatt_loops * 2);
        }
        return totalTests;
    }

    let totalTests = calculateTotalTests();

    const calculateSuccessPercentage = (results: TestData) => {
        let passedTests = 0;
        let numOfWriteErrors = results.results.filter(test => (test.write === false)).length;

        // if there is writes error then the notification/read steps are skipped
        totalTests = totalTests - numOfWriteErrors

        if (isGattTestingOnly) {
            passedTests = totalPassedWrites + totalPassedReads + totalPassedNotifications
        }
        else {
            // check if some connection failed so need to reduce the total number of tests that skipped
            let numOfConnectionFailures = results.results.filter(test => (test.connection === false && test.bonded != false)).length;
            totalTests = totalTests - numOfConnectionFailures * (1 + (results.test_parameters.pair_and_bond ? 1 : 0) + results.test_parameters.num_of_gatt_loops * 2)

            let numOfBondsFailures = results.results.filter(test => test.bonded === false).length;
            totalTests = totalTests - numOfBondsFailures * (1 + (results.test_parameters.pair_and_bond ? 1 : 0) + results.test_parameters.num_of_gatt_loops * 2)
            passedTests = totalPassedBonds + totalPassedConnections + totalPassedWrites + totalPassedReads + totalPassedNotifications + totalPassedDisconnect
        }

        const successPercentage = (passedTests / totalTests) * 100;
        return successPercentage.toFixed(2);
    };

    const successPercentage = calculateSuccessPercentage(currentResults!);

    const DisplayGATTErrors: React.FC<{ errors: TestResult[] }> = ({ errors }) => {
        return (
            <>
                {errors.map((error, index) => (
                    <View style={styles.errorsContainer} key={index}>
                        <Divider style={{ marginTop: 10 }} />
                        <>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorTitle}>Device Name</Text>
                                    <Text style={styles.errorDetail}>{error.device_name}</Text>
                                </View>
                                {!isGattTestingOnly && (
                                    <View style={styles.errorContainer}>
                                        <Text style={styles.errorTitle}>Connection Loop</Text>
                                        <Text style={styles.errorDetail}>
                                            {error.main_loop_number} / {currentResults!.test_parameters.num_of_main_loops}
                                        </Text>
                                    </View>
                                )}


                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorTitle}>GATT Loop</Text>
                                    <Text style={styles.errorDetail}>
                                        {error.gatt_test_loop_number} / {currentResults!.test_parameters.num_of_gatt_loops}
                                    </Text>
                                </View>

                                {isGattTestingOnly && (
                                    // Show empty container
                                    <View style={styles.errorContainer} />
                                )}
                            </View>
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorTitle}>Error Message</Text>
                                <Text style={styles.errorMessage}>{error.error_message}</Text>
                            </View>
                        </>
                    </View>
                ))}
            </>
        );
    };

    const DisplayDisconnectErrors: React.FC<{ errors: TestResult[] }> = ({ errors }) => {
        return (
            <>
                {errors.map((error, index) => (
                    <View style={styles.errorsContainer} key={index}>
                        <Divider style={{ marginTop: 10 }} />
                        <>
                            <View style={{ flexDirection: 'row' }}>
                                <View style={[styles.errorContainer, { marginRight: 25 }]}>
                                    <Text style={styles.errorTitle}>Device Name</Text>
                                    <Text style={styles.errorDetail}>{error.device_name}</Text>
                                </View>
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorTitle}>Connection Loop</Text>
                                    <Text style={styles.errorDetail}>
                                        {error.main_loop_number} / {currentResults!.test_parameters.num_of_main_loops}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorTitle}>Error Message</Text>
                                <Text style={styles.errorMessage}>{error.error_message}</Text>
                            </View>
                        </>

                    </View>
                ))}
            </>
        );
    };

    const DisplayConnectionsErrors: React.FC<{ errors: TestResult[] }> = ({ errors }) => {
        return (
            <>
                {errors.map((error, index) => (
                    <View style={styles.errorsContainer} key={index}>
                        <Divider style={{ marginTop: 10 }} />

                        <View style={{ flexDirection: 'row' }}>
                            <View style={[styles.errorContainer, { marginRight: 25 }]}>
                                <Text style={styles.errorTitle}>Device Name</Text>
                                <Text style={styles.errorDetail}>{error.device_name}</Text>
                            </View>
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorTitle}>Connection Loop</Text>
                                <Text style={styles.errorDetail}>{error.main_loop_number} / {currentResults!.test_parameters.num_of_main_loops}</Text>
                            </View>
                        </View>
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorTitle}>Error Message</Text>
                            <Text style={styles.errorMessage}>{error.error_message}</Text>
                        </View>

                    </View>
                ))}
            </>
        );
    };

    return (
        <>
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
                {/* Test Summary */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryBox}>
                        <View style={{ flexDirection: "column" }}>
                            <Text style={styles.summaryText}>{successPercentage}%</Text>
                            <Text style={styles.summaryTitle}>Passed</Text>

                        </View>
                    </View>
                    <View style={styles.summaryBox}>
                        <View style={{ flexDirection: "column" }}>
                            <Text style={styles.summaryText} >{formatDuration(currentResults!.info.total_execution_time_ms)}</Text>
                            <Text style={styles.summaryTitle}>Execution Time</Text>
                        </View>
                    </View>
                </View>

                {/* Test Steps */}
                {!isGattTestingOnly && (
                    <>
                        {/* Pair & Bond */}
                        {currentResults!.test_parameters.pair_and_bond && (
                            <TouchableOpacity onPress={() => toggleErrors(setShowBondsErrors)} activeOpacity={0.9} disabled={bondFailures.length == 0}>
                                <View style={[styles.sectionContainer]}>
                                    <View style={[styles.rowSpaceBetween]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={[styles.iconContainer]}>
                                                <MaterialCommunityIcons name="key" size={25} />
                                            </View>
                                            <Text style={styles.detailText}>Pair & Bond</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={[styles.detailText, { color: totalBonds != 0 ? (totalPassedBonds == totalBonds ? PASS_COLOR : FAILURE_COLOR) : Colors.gray, fontWeight: "800" }]}>{totalPassedBonds}/{totalBonds}</Text>
                                            <MaterialCommunityIcons
                                                name={showBondsErrors ? "chevron-up" : "chevron-down"}
                                                size={25}
                                                style={{ marginLeft: 8, opacity: bondFailures.length == 0 ? 0.3 : 1 }}
                                            />
                                        </View>
                                    </View>
                                    {showBondsErrors && bondFailures.length > 0 && <DisplayConnectionsErrors errors={bondFailures} />}
                                </View>
                            </TouchableOpacity>
                        )}

                        {/* Connection */}
                        <TouchableOpacity onPress={() => toggleErrors(setShowConnectionErrors)} activeOpacity={0.9} disabled={connectionFailures.length == 0} >
                            <View style={[styles.sectionContainer,]}>
                                <View style={[styles.rowSpaceBetween,]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', }}>
                                        <View style={[styles.iconContainer,]}>
                                            <MaterialCommunityIcons name="link" size={25} />
                                        </View>
                                        <Text style={styles.detailText}>Connections</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[styles.detailText, { color: totalConnections != 0 ? (totalPassedConnections == totalConnections ? PASS_COLOR : FAILURE_COLOR) : Colors.gray, fontWeight: "800" }]}>{totalPassedConnections}/{totalConnections}</Text>
                                        <MaterialCommunityIcons
                                            name={showConnectionErrors ? "chevron-up" : "chevron-down"}
                                            size={25}
                                            style={{ marginLeft: 8, opacity: connectionFailures.length == 0 ? 0.3 : 1 }}
                                        />
                                    </View>
                                </View>
                                {showConnectionErrors && connectionFailures.length > 0 && <DisplayConnectionsErrors errors={connectionFailures} />}
                            </View>
                        </TouchableOpacity>

                    </>
                )}

                {/* Write */}
                <TouchableOpacity onPress={() => toggleErrors(setShowWriteErrors)} activeOpacity={0.9} disabled={writeFailures.length == 0}>
                    <View style={[styles.sectionContainer]}>
                        <View style={[styles.rowSpaceBetween]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={[styles.iconContainer]}>
                                    <MaterialIcons name="edit" size={25} />
                                </View>
                                <Text style={styles.detailText}>Write</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={[styles.detailText, { color: totalWrites != 0 ? (totalPassedWrites == totalWrites ? PASS_COLOR : FAILURE_COLOR) : Colors.gray, fontWeight: "800" }]}>{totalPassedWrites}/{totalWrites}</Text>
                                <MaterialCommunityIcons
                                    name={showWriteErrors ? "chevron-up" : "chevron-down"}
                                    disabled={writeFailures.length == 0}
                                    size={25}
                                    style={{ marginLeft: 8, opacity: writeFailures.length == 0 ? 0.3 : 1 }}
                                />
                            </View>
                        </View>
                        {showWriteErrors && writeFailures.length > 0 && <DisplayGATTErrors errors={writeFailures} />}
                    </View>
                </TouchableOpacity>

                {/* Notification */}
                {currentResults!.test_parameters.test_case === TEST_CASE.WRITE_NOTIFY && (
                    <TouchableOpacity onPress={() => toggleErrors(setShowNotificationErrors)} activeOpacity={0.9} disabled={notificationFailures.length == 0}>
                        <View style={[styles.sectionContainer]}>
                            <View style={[styles.rowSpaceBetween]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={[styles.iconContainer]}>
                                        <MaterialIcons name="notifications" size={25} />
                                    </View>
                                    <Text style={styles.detailText}>Notification</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={[styles.detailText, { color: totalNotifications != 0 ? (totalPassedNotifications == totalNotifications ? PASS_COLOR : FAILURE_COLOR) : Colors.gray, fontWeight: "800" }]}>{totalPassedNotifications}/{totalNotifications}</Text>
                                    <MaterialCommunityIcons
                                        name={showNotificationErrors ? "chevron-up" : "chevron-down"}
                                        disabled={notificationFailures.length == 0}
                                        size={25}
                                        style={{ marginLeft: 8, opacity: notificationFailures.length == 0 ? 0.3 : 1 }}
                                    />
                                </View>
                            </View>
                            {showNotificationErrors && notificationFailures.length > 0 && <DisplayGATTErrors errors={notificationFailures} />}
                        </View>
                    </TouchableOpacity>

                )}

                {/* Read */}
                {currentResults!.test_parameters.test_case === TEST_CASE.WRITE_READ && (
                    <TouchableOpacity onPress={() => toggleErrors(setShowReadErrors)} activeOpacity={0.9} disabled={readFailures.length == 0}>
                        <View style={[styles.sectionContainer]}>
                            <View style={[styles.rowSpaceBetween]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={[styles.iconContainer]}>
                                        <FontAwesome5 name="glasses" size={20} style={{ alignSelf: 'center' }} />
                                    </View>
                                    <Text style={styles.detailText}>Read</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={[styles.detailText, { color: totalReads != 0 ? (totalPassedReads == totalReads ? PASS_COLOR : FAILURE_COLOR) : Colors.gray, fontWeight: "800" }]}>{totalPassedReads}/{totalReads}</Text>
                                    <MaterialCommunityIcons
                                        name={showReadErrors ? "chevron-up" : "chevron-down"}
                                        disabled={readFailures.length == 0}
                                        size={25}
                                        style={{ marginLeft: 8, opacity: readFailures.length == 0 ? 0.3 : 1 }}
                                    />
                                </View>
                            </View>
                            {showReadErrors && readFailures.length > 0 && <DisplayGATTErrors errors={readFailures} />}
                        </View>
                    </TouchableOpacity>

                )}

                {/* Disconnect */}
                {!isGattTestingOnly && (
                    <>
                        <TouchableOpacity onPress={() => toggleErrors(setShowDisconnectErrors)} activeOpacity={0.9} disabled={disconnectFailures.length == 0}>
                            <View style={[styles.sectionContainer]}>
                                <View style={[styles.rowSpaceBetween]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={[styles.iconContainer]}>
                                            <FontAwesomeIcon icon={faLinkSlash} size={23} style={{ alignItems: "center" }} />
                                        </View>
                                        <Text style={styles.detailText}>Disconnect</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[styles.detailText, { color: totalDisconnections != 0 ? (totalPassedDisconnect == totalDisconnections ? PASS_COLOR : FAILURE_COLOR) : Colors.gray, fontWeight: "800" }]}>{totalPassedDisconnect}/{totalDisconnections}
                                        </Text>

                                        <MaterialCommunityIcons
                                            name={showDisconnectErrors ? "chevron-up" : "chevron-down"}
                                            disabled={disconnectFailures.length == 0}
                                            size={25}
                                            style={{ marginLeft: 8, opacity: disconnectFailures.length == 0 ? 0.3 : 1 }}
                                        />
                                    </View>
                                </View>
                                {showDisconnectErrors && disconnectFailures.length > 0 && <DisplayDisconnectErrors errors={disconnectFailures} />}
                            </View>
                        </TouchableOpacity>
                    </>
                )}

            </ScrollView>
            <View style={[styles.rowSpaceBetween, { backgroundColor: Colors.lightGray, padding: 20, paddingBottom: 30 }]}>
                <TouchableOpacity
                    onPress={() => handleExportLogs(currentLogs)}
                    style={[{
                        ...styles.button, marginRight: 15
                    }]}>
                    <Text style={[{ ...styles.text }]}>Download Logs</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => handleExportResults(currentResults!)}
                    style={[{
                        ...styles.button,
                    }]}
                    testID='RunTestButton'
                    accessibilityLabel='RunTestButton'
                >
                    <Text style={[{ ...styles.text }]}>Download Results</Text>
                </TouchableOpacity>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    text: {
        fontSize: 18,
        lineHeight: 21,
        color: Colors.blue,
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        borderWidth: 0.5,
        borderColor: Colors.blue,
        height: 40,
        flex: 1,
    },
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: Colors.lightGray,
    },
    summaryContainer: {
        flexDirection: "row",
        marginBottom: 15,
        justifyContent: "space-between",
        alignItems: "center",
        borderRadius: 15,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
        padding: 15
    },
    summaryBox: {
        alignItems: "center", // Centers content
        marginHorizontal: 5,
    },
    summaryTitle: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: "center",
    },
    summaryText: {
        fontSize: 30, // Ensures same size for both texts
        fontWeight: '800',
        textAlign: "center",
        // width: "100%", // Prevents text from wrapping weirdly,
        borderRadius: 15
    },
    sectionContainer: {
        backgroundColor: "white",
        padding: 10,
        borderRadius: 15,
        marginBottom: 15,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
    },
    detailText: {
        fontSize: 16,
        color: "#333",
        alignSelf: "center",
        fontWeight: '600'
    },
    errorContainer: {
        padding: 8,
        flexDirection: "column",
        justifyContent: 'space-between'
    },
    errorsContainer: {

    },
    rowSpaceBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: 'center'
    },
    iconContainer: {
        backgroundColor: Colors.lightGray,
        borderRadius: 50,
        padding: 7,
        marginRight: 10,
        width: 40,
        height: 40,
        justifyContent: "center"
    },
    errorTitle: {
        color: Colors.gray,
        fontSize: 12,

    },
    errorDetail: {
        fontSize: 12,
    },
    errorMessage: {
        color: Colors.primary,
        fontSize: 12,
    }
});

export default TestResults;
