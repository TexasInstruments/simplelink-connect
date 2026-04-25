import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, NativeEventEmitter, NativeModules, Platform, TouchableOpacity, processColor, Animated } from 'react-native';
import { LineChart } from 'react-native-charts-wrapper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { downloadDataToLocalStorage } from '../../services/DownloadFileUtils';
import { useSpecificScreenConfigContext } from '../../context/SpecificScreenOptionsContext';

// Message for unsupported platforms
const getUnsupportedReason = (): string => {
    if (Platform.OS === 'ios') {
        return 'Channel Sounding is not supported on iOS devices.';
    }
    return 'Channel Sounding requires Android 16 QPR2 or later.';
};


export function callCsModuleFunction(functionName: string, ...args: any[]) {
    return new Promise((resolve, reject) => {
        if (Platform.OS === 'ios') {
            // Use callback pattern for iOS
            NativeModules.CSModule[functionName](...args, (error: any, result: unknown) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        } else {
            // Use promise pattern for Android
            NativeModules.CSModule[functionName](...args)
                .then(resolve)
                .catch(reject);
        }
    })
}


interface RangingDataPoint {
    distanceMeters: number;
    confidence: number;
    timestamp: number;
    index: number;
    // Optional fields that may not be available on all devices/firmware
    rssi?: number;
    azimuthDegrees?: number;
    azimuthConfidence?: number;
    elevationDegrees?: number;
    elevationConfidence?: number;
}

// Connection states for better UX
type ConnectionState = 'idle' | 'connecting' | 'connected' | 'bonding' | 'ready' | 'error';

// Convert ranging stop/close reason codes to human-readable strings
const getStopReasonString = (reason: number): string => {
    switch (reason) {
        case 0:
            return 'Unknown Reason';
        case 1:
            return 'Stopped by user';
        case 2:
            return 'Remote Request';
        case 3:
            return 'Reason unsupported';
        case 4:
            return 'System error';
        case 5:
            return 'No Peers found';
        default:
            return `Unknown reason (${reason})`;
    }
};

// Convert confidence level to human-readable string
// 0 = Low, 1 = Medium, 2 = High
const getConfidenceString = (confidence: number): string => {
    switch (confidence) {
        case 0:
            return 'Low';
        case 1:
            return 'Medium';
        case 2:
            return 'High';
        default:
            return `Unknown (${confidence})`;
    }
};

// Format timestamp (YYYY-MM-DD_HH-MM-SS)
const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
};

// Get color for confidence level
const getConfidenceColor = (confidence: number): string => {
    switch (confidence) {
        case 0:
            return Colors.primary; // Red for low
        case 1:
            return '#f0ad4e'; // Orange/yellow for medium
        case 2:
            return Colors.buttonSliderOn; // Green for high
        default:
            return Colors.gray;
    }
};

interface Props {
    peripheralId: string;
    peripheralName: string;
}

const ChannelSoundingRangingScreen: React.FC<Props> = ({ peripheralId, peripheralName }) => {
    // Get configuration from context
    const { specificScreenConfig } = useSpecificScreenConfigContext();

    // Check device support for channel sounding
    const [isSupported, setIsSupported] = useState<boolean | null>(null);

    // Data state
    const [distanceData, setDistanceData] = useState<RangingDataPoint[]>([]);
    const [currentDistance, setCurrentDistance] = useState<number | null>(null);

    // Connection and ranging state - device is already connected when entering this screen
    const [connectionState, setConnectionState] = useState<ConnectionState>('connected');
    const [isRanging, setIsRanging] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Device connected. Press Start to begin ranging');
    const [statusValue, setStatusValue] = useState<'Active' | 'Idle' | 'Stopped'>('Idle');

    const bleCsEmitter = useRef(new NativeEventEmitter(NativeModules.CSModule)).current;
    const maxDataPoints = 150; // Keep last 100 points

    // Track previous update rate to detect changes
    const prevUpdateRateRef = useRef(specificScreenConfig.csRangingUpdateRate);

    // Blinking animation for status icon when ranging
    const blinkAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isRanging) {
            const blink = Animated.loop(
                Animated.sequence([
                    Animated.timing(blinkAnim, {
                        toValue: 0.2,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(blinkAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            );
            blink.start();
            return () => blink.stop();
        } else {
            blinkAnim.setValue(1);
        }
    }, [isRanging]);

    // Watch for update rate changes and restart ranging session if active
    useEffect(() => {
        const currentRate = specificScreenConfig.csRangingUpdateRate;
        const previousRate = prevUpdateRateRef.current;

        // If the rate changed and we're currently ranging, restart the session
        if (currentRate !== previousRate && isRanging) {
            console.log(`Update rate changed from ${previousRate} to ${currentRate}, restarting session...`);

            // Stop the current session
            callCsModuleFunction('stopChannelSounding')
        }

        // Update the ref for next comparison
        prevUpdateRateRef.current = currentRate;
    }, [specificScreenConfig.csRangingUpdateRate, isRanging, peripheralId]);

    useEffect(() => {
        // ============================================
        // Check device support for channel sounding
        // ============================================
        if (Platform.OS === 'ios') {
            setIsSupported(false);
        } else {
            // Check Android support via native module
            NativeModules.CSModuleBase.isChannelSoundingSupported()
                .then((supported: boolean) => {
                    setIsSupported(supported as boolean);
                })
                .catch(() => {
                    setIsSupported(false);
                });
        }

        // ============================================
        // Connection & Service Discovery Events
        // ============================================

        // CS Service found on device
        const csServiceFoundSub = bleCsEmitter.addListener('onCsServiceFound', () => {
            console.log('Channel Sounding service found');
            setConnectionState('connected');
            setStatusMessage('Service found. Bonding...');
        });

        // Device bonded successfully
        const deviceBondedSub = bleCsEmitter.addListener('onDeviceBonded', () => {
            console.log('Device bonded');
            setConnectionState('bonding');
            setStatusMessage('Bonded. Starting session...');
        });

        // Ranging session opened
        const sessionOpenedSub = bleCsEmitter.addListener('onOpened', () => {
            console.log('Ranging session opened');
            setConnectionState('ready');
            setStatusMessage('Session ready. Waiting for data...');
        });

        // Session failed to open
        const openFailedSub = bleCsEmitter.addListener('onOpenFailed', (event: any) => {
            console.error('Session open failed:', event.reason);
            setConnectionState('error');
            setStatusMessage(`Failed to open session (reason: ${event.reason})`);
            setIsStarting(false);
        });

        // ============================================
        // Ranging Data Events
        // ============================================

        // Ranging data received
        const rangingDataSub = bleCsEmitter.addListener('onRangingData', (event: any) => {
            console.log('Ranging data received:', event);

            setDistanceData((prev) => {
                const newIndex = prev.length > 0 ? prev[prev.length - 1].index + 1 : 0;
                const newDataPoint: RangingDataPoint = {
                    index: newIndex,
                    distanceMeters: event.distanceMeters,
                    confidence: event.distanceConfidence,
                    timestamp: event.timestampMillis || Date.now(),
                    // Optional fields - only include if present in event
                    ...(event.rssi !== undefined && { rssi: event.rssi }),
                    ...(event.azimuthDegrees !== undefined && { azimuthDegrees: event.azimuthDegrees }),
                    ...(event.azimuthConfidence !== undefined && { azimuthConfidence: event.azimuthConfidence }),
                    ...(event.elevationDegrees !== undefined && { elevationDegrees: event.elevationDegrees }),
                    ...(event.elevationConfidence !== undefined && { elevationConfidence: event.elevationConfidence }),
                };
                return [...prev, newDataPoint];
            });

            // Track last valid (non-low confidence) distance for display
            if (event.distanceConfidence > 0) {
                setCurrentDistance(event.distanceMeters);
            }

        });

        // Ranging started
        const rangingStartedSub = bleCsEmitter.addListener('onRangingStarted', () => {
            console.log('Ranging started');
            setIsRanging(true);
            setStatusValue("Active")
            setIsStarting(false);
            setConnectionState('ready');
            setStatusMessage('Ranging active - receiving data');
        });

        // Ranging stopped
        const rangingStoppedSub = bleCsEmitter.addListener('onRangingStopped', (event: any) => {
            const reasonStr = getStopReasonString(event.reason);
            console.log('Ranging stopped, reason:', reasonStr);
            setIsRanging(false);
            setConnectionState('connected');
            setStatusValue("Stopped")
            setStatusMessage(`Ranging stopped: ${reasonStr}`);
        });

        // Ranging session closed
        const rangingClosedSub = bleCsEmitter.addListener('onRangingClosed', (event: any) => {
            const reasonStr = getStopReasonString(event.reason);
            console.log('Ranging session closed, reason:', reasonStr);
            setIsRanging(false);
            setStatusValue("Stopped")
            setConnectionState('connected');
            setStatusMessage(`Session closed: ${reasonStr}`);
        });

        // ============================================
        // Error Events
        // ============================================

        const scanErrorSub = bleCsEmitter.addListener('onScanError', (event: any) => {
            console.error('Error:', event);
            setConnectionState('error');
            setStatusMessage(`Error: ${event.type}`);
            setIsStarting(false);
        });

        // Cleanup on unmount
        return () => {
            // Stop ranging if active when leaving screen
            callCsModuleFunction('stopChannelSounding').catch(() => { });

            // Remove all listeners
            bleCsEmitter.removeAllListeners('onCsServiceFound');
            bleCsEmitter.removeAllListeners('onDeviceBonded');
            bleCsEmitter.removeAllListeners('onOpened');
            bleCsEmitter.removeAllListeners('onOpenFailed');
            bleCsEmitter.removeAllListeners('onRangingData');
            bleCsEmitter.removeAllListeners('onRangingStarted');
            bleCsEmitter.removeAllListeners('onRangingStopped');
            bleCsEmitter.removeAllListeners('onRangingClosed');
            bleCsEmitter.removeAllListeners('onScanError');
        };
    }, []);
    const handleStartRanging = async () => {
        try {
            setIsStarting(true);
            setStatusMessage('Starting channel sounding...');
            console.log('Starting ranging for device:', peripheralId, 'with update rate:', specificScreenConfig.csRangingUpdateRate);
            callCsModuleFunction('startChannelSounding', peripheralId, specificScreenConfig.csRangingUpdateRate);
        } catch (error) {
            console.error('Error starting ranging:', error);
            setIsStarting(false);
            setConnectionState('error');
            setStatusMessage('Failed to start ranging. Please try again.');
        }
    };

    const handleStopRanging = async () => {
        try {
            console.log('Stopping ranging');
            await callCsModuleFunction('stopChannelSounding');
            setIsRanging(false);
            setIsStarting(false);
            setStatusValue("Stopped")
            setConnectionState('connected');
            setStatusMessage('Ranging stopped. Press Start to begin again.');
        } catch (error) {
            console.error('Error stopping ranging:', error);
        }
    };

    const handleClearData = () => {
        setDistanceData([]);
        setCurrentDistance(null);
    };

    const handleExportCsv = () => {
        if (distanceData.length === 0) return;

        // Build CSV header with all available fields
        const csvHeader = 'Timestamp,Distance (m),Confidence,RSSI (dBm),Azimuth (deg),Azimuth Confidence,Elevation (deg),Elevation Confidence\n';

        const csvRows = distanceData.map(point => {
            // Format each field, using 'N/A' for missing optional fields
            const timestamp = formatTimestamp(point.timestamp);
            const distance = point.distanceMeters.toFixed(4);
            const confidence = getConfidenceString(point.confidence);
            const rssi = point.rssi !== undefined ? point.rssi.toFixed(1) : 'N/A';
            const azimuth = point.azimuthDegrees !== undefined ? point.azimuthDegrees.toFixed(2) : 'N/A';
            const azimuthConf = point.azimuthConfidence !== undefined ? point.azimuthConfidence.toFixed(2) : 'N/A';
            const elevation = point.elevationDegrees !== undefined ? point.elevationDegrees.toFixed(2) : 'N/A';
            const elevationConf = point.elevationConfidence !== undefined ? point.elevationConfidence.toFixed(2) : 'N/A';

            return `${timestamp},${distance},${confidence},${rssi},${azimuth},${azimuthConf},${elevation},${elevationConf}`;
        }).join('\n');

        const csvContent = csvHeader + csvRows;
        const fileName = `channel_sounding_${formatTimestamp(Date.now())}.csv`;
        downloadDataToLocalStorage(csvContent, fileName, 'text/csv');
    };



    // Prepare chart data - only show last maxDataPoints, filter out low confidence readings
    const chartData = {
        dataSets: [
            {
                values: distanceData.slice(-maxDataPoints).map((point) => ({
                    x: point.index,
                    y: point.confidence > 0 ? point.distanceMeters : NaN,
                })).filter(point => !isNaN(point.y)),
                label: 'Distance (meters)',
                config: {
                    color: processColor(Colors.active),
                    circleColor: processColor(Colors.active),
                    lineWidth: 2,
                    drawCircles: true,
                    circleRadius: 3,
                    circleHoleColor: processColor('white'),
                    drawCircleHole: true,
                    drawValues: false,
                    mode: 'LINEAR' as const,
                },
            },
        ],
    };

    const xAxis = {
        enabled: true,
        granularity: 1,
        drawGridLines: true,
        position: 'BOTTOM' as const,
        labelCount: 5,
    };

    const yAxis = {
        left: {
            enabled: true,
            drawGridLines: true,
            axisMinimum: 0,
        },
        right: {
            enabled: false,
        },
    };

    // Get status indicator style based on connection state
    const getStatusStyle = () => {
        switch (connectionState) {
            case 'connecting':
            case 'bonding':
                return styles.connecting;
            case 'connected':
            case 'ready':
                return isRanging ? styles.ranging : styles.ready;
            case 'error':
                return styles.error;
            default:
                return styles.idle;
        }
    };

    // Get status icon based on state
    const getStatusIcon = (): { name: keyof typeof MaterialCommunityIcons.glyphMap; color: string } => {
        if (isRanging) return { name: 'broadcast', color: Colors.buttonSliderOn };
        if (connectionState === 'error') return { name: 'alert-circle', color: Colors.primary };
        if (connectionState === 'connecting' || connectionState === 'bonding') return { name: 'bluetooth-connect', color: '#f0ad4e' };
        if (connectionState === 'connected' || connectionState === 'ready') return { name: 'bluetooth-connect', color: Colors.active };
        return { name: 'bluetooth-off', color: Colors.gray };
    };

    const statusIcon = getStatusIcon();

    // Show loading while checking support
    if (isSupported === null) {
        return (
            <View style={styles.container}>
                <View style={styles.unsupportedContainer}>
                    <Text style={styles.unsupportedMessage}>Checking device support...</Text>
                </View>
            </View>
        );
    }

    // Show unsupported message if device doesn't support channel sounding
    if (!isSupported) {
        return (
            <View style={styles.container}>
                <View style={styles.unsupportedContainer}>
                    <MaterialCommunityIcons name="bluetooth-off" size={80} color={Colors.gray} />
                    <Text style={styles.unsupportedTitle}>Channel Sounding Not Available</Text>
                    <Text style={styles.unsupportedMessage}>{getUnsupportedReason()}</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Distance Display - Large centered value (hidden when confidence is low) */}
            <View style={styles.distanceContainer}>
                <Text style={styles.distanceValue}>
                    {currentDistance !== null
                        ? currentDistance.toFixed(2) : '--'
                    }
                </Text>
            </View>

            {/* Stats Row */}
            <View style={styles.statsContainer}>

                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Samples</Text>
                    <Text style={styles.statValue}>{distanceData.length}</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Status</Text>
                    <Text style={[styles.statValue, { color: isRanging ? Colors.buttonSliderOn : Colors.gray }]}>
                        {statusValue}
                    </Text>
                </View>
            </View>

            <View style={styles.chartContainer}>
                <View style={styles.chartHeader}>
                    <Text style={styles.chartTitle}>Distance Over Time</Text>
                    <View style={styles.chartHeaderButtons}>
                        <TouchableOpacity
                            style={styles.chartHeaderButton}
                            onPress={handleClearData}
                        >
                            <MaterialCommunityIcons name="trash-can-outline" size={20} color={"white"} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.chartHeaderButton, distanceData.length === 0 && styles.chartHeaderButtonDisabled]}
                            onPress={handleExportCsv}
                            disabled={distanceData.length === 0}
                        >
                            <MaterialCommunityIcons name="download" size={20} color={distanceData.length === 0 ? Colors.lightGray : "white"} />
                        </TouchableOpacity>
                    </View>
                </View>
                {distanceData.length > 0 ? (
                    <LineChart
                        style={styles.chart}
                        data={chartData}
                        xAxis={xAxis}
                        yAxis={yAxis}
                        chartDescription={{ text: '' }}
                        legend={{ enabled: true }}
                        touchEnabled={true}
                        dragEnabled={true}
                        scaleEnabled={true}
                        scaleXEnabled={true}
                        scaleYEnabled={true}
                        pinchZoom={true}
                        doubleTapToZoomEnabled={true}
                        drawGridBackground={false}
                        autoScaleMinMaxEnabled={true}
                    />
                ) : (
                    <View style={styles.noDataContainer}>
                        <Text style={styles.noDataText}>Waiting for ranging data...</Text>
                    </View>
                )}
            </View>

            <View style={[styles.statusIndicator, getStatusStyle()]}>
                <Animated.View style={{ opacity: isRanging ? blinkAnim : 1 }}>
                    <MaterialCommunityIcons name={statusIcon.name} size={18} color={statusIcon.color} />
                </Animated.View>
                <Text style={styles.statusText}>{statusMessage}</Text>
            </View>

            <View style={styles.primaryButtonsContainer}>
                <TouchableOpacity
                    style={[styles.primaryButton, styles.startButton, isRanging && styles.buttonDisabled]}
                    onPress={handleStartRanging}
                    disabled={isRanging || isStarting}
                >
                    <MaterialCommunityIcons name="play" size={32} color="white" />
                    <Text style={styles.primaryButtonText}>
                        {isStarting ? 'Starting...' : 'Start'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.primaryButton, styles.stopButton, (!isRanging && !isStarting) && styles.buttonDisabled]}
                    onPress={handleStopRanging}
                    disabled={!isRanging && !isStarting}
                >
                    <MaterialCommunityIcons name="stop" size={32} color="white" />
                    <Text style={styles.primaryButtonText}>Stop</Text>
                </TouchableOpacity>
            </View>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.lightGray,
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
        marginTop: 16,
        gap: 8,
    },
    idle: {
        backgroundColor: '#e9ecef',
    },
    connecting: {
        backgroundColor: '#fff3cd',
    },
    ready: {
        backgroundColor: '#e3f2fd',
    },
    ranging: {
        backgroundColor: '#e8f5e9',
    },
    error: {
        backgroundColor: '#ffebee',
    },
    statusText: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.darkGray,
        flex: 1,
    },
    distanceContainer: {
        marginVertical: 16,
        width: "100%",
        height: 100,
        borderRadius: 10,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        // borderWidth: 3,
        // borderColor: Colors.active,
    },
    distanceValue: {
        fontSize: 65,
        fontWeight: 'bold',
        color: Colors.active,
    },
    // Stats Row
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 8,
    },
    statBox: {
        flex: 1,
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.gray,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.darkGray,
    },
    // Chart
    chartContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    chartTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.darkGray,
    },
    chartHeaderButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    chartHeaderButton: {
        padding: 4,
        backgroundColor: Colors.gray,
        borderRadius: 20,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartHeaderButtonDisabled: {
        opacity: 0.4,
    },
    chart: {
        flex: 1,
    },
    noDataContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noDataText: {
        fontSize: 14,
        color: Colors.gray,
    },
    // Primary Buttons (Start/Stop)
    primaryButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        gap: 12,
    },
    primaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 25,
        fontWeight: '700',
    },
    startButton: {
        backgroundColor: Colors.active,
    },
    stopButton: {
        backgroundColor: Colors.primary,
    },
    buttonDisabled: {
        backgroundColor: '#d0d0d0',
        opacity: 0.7,
    },
    // Unsupported state styles
    unsupportedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    unsupportedTitle: {
        fontSize: 22,
        fontWeight: '600',
        color: Colors.darkGray,
        marginTop: 20,
        marginBottom: 12,
        textAlign: 'center',
    },
    unsupportedMessage: {
        fontSize: 16,
        color: Colors.gray,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
});

export default ChannelSoundingRangingScreen;
