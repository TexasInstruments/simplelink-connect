import React from 'react';
import { StyleSheet, View, Image, ScrollView, Linking } from 'react-native';
import { Text } from '../components/Themed';
import Colors from '../constants/Colors';

const AboutScreen: React.FC = () => {
    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Image source={require('../assets/images/ti_main_logo.png')} style={styles.logo} />

                <Text style={styles.paragraph}>
                    This BLE (Bluetooth Low Energy) app includes three main features:
                </Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Scanner</Text>
                    <Text style={styles.sectionText}>
                        Discover and connect to nearby BLE devices, explore device's services, read/write characteristics, and perform GATT operations directly through the interface.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Stress Test</Text>
                    <Text style={styles.sectionText}>
                        Run customizable performance and stability tests on your BLE devices. Define test parameters such as interval,
                        repetitions, and data size, and monitor real-time results to ensure your devices meet reliability and
                        responsiveness standards.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>BLE Mesh</Text>
                    <Text style={styles.sectionText}>
                        Create and manage a BLE Mesh network with support for provisioning new nodes and configuring models.
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Text style={styles.versionText}>Version: 2.1.1</Text>
                <View style={styles.sourceRow}>
                    <Text style={styles.versionText}>Source Code:</Text>
                    <Text
                        style={[styles.versionText, styles.linkText]}
                        onPress={() => Linking.openURL('https://github.com/TexasInstruments/simplelink-connect')}>
                        GitHub
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.lightGray,
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    logo: {
        width: '100%',
        height: 80,
        resizeMode: 'contain',
        marginTop: 10,
    },
    paragraph: {
        fontSize: 16,
        color: Colors.darkGray,
        marginBottom: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.darkGray,
        marginBottom: 6,
    },
    sectionText: {
        fontSize: 15,
        lineHeight: 22,
    },
    footer: {
        paddingVertical: 10,
        backgroundColor: Colors.lightGray,
        alignItems: 'center',
        marginBottom: 20
    },
    versionText: {
        fontSize: 14,
        color: Colors.blue,
    },
    sourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    linkText: {
        textDecorationLine: 'underline',
        marginLeft: 4,
    },
});

export default AboutScreen;
