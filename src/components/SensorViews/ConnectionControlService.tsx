import { StyleSheet } from 'react-native';
import { Switch, View } from '../Themed';
import SensorPresentation from './SensorPresentation';
import { CONNECTION_CONTROL_SERVICE } from '../../constants/SensorTag';
import { Slider, Text } from '@rneui/themed';
import bleManager from 'react-native-ble-manager';
import { useEffect, useState } from 'react';

interface Props {
  peripheralId: string;
}

const ConnectionControlService: React.FC<Props> = ({ peripheralId }) => {
  const [enable, setEnable] = useState<boolean>(false);

  const [data, setData] = useState<{
    connectionInterval: number;
    slaveLatency: number;
    supervisionTimeout: number;
  }>({
    connectionInterval: 0,
    slaveLatency: 0,
    supervisionTimeout: 0,
  });

  const read = () => {
    bleManager
      .read(
        peripheralId,
        CONNECTION_CONTROL_SERVICE.service,
        CONNECTION_CONTROL_SERVICE.connection_params
      )
      .then((bytes) => {
        let connectionInterval = bytes[0] + (bytes[1] << 8);
        let slaveLatency = bytes[2] + (bytes[3] << 8);
        let supervisionTimeout = bytes[4] + (bytes[5] << 8);

        setData((prev) => ({
          ...prev,
          connectionInterval,
          slaveLatency,
          supervisionTimeout,
        }));
      })
      .catch((error) => {
        console.debug('Connection Control Service read error: ', error);
      });
  };

  const write = (value: number) => {
    // value - number from slider
    /* 
      Max connection interval, 0-1
      min connectioninterval, 2-3
      slave latency, 4-5
      supervision time-out 6-7 
      (2bytes each)
    */

    let writeBytes = Array.from([24, 0, 0, 0, 72, 0, 0, 0]);

    bleManager
      .write(
        peripheralId,
        CONNECTION_CONTROL_SERVICE.service,
        CONNECTION_CONTROL_SERVICE.request_conn_params,
        writeBytes,
        writeBytes.length
      )
      .then(() => {
        console.debug('Connection Control Service data written.');
        read();
      })
      .catch((error) => {
        console.debug('Connection Control Service error:', error);
      });

    setData((prev) => ({
      ...prev,
      connectionInterval: value,
    }));
  };

  useEffect(() => {
    if (enable) {
      bleManager
        .startNotification(
          peripheralId,
          CONNECTION_CONTROL_SERVICE.service,
          CONNECTION_CONTROL_SERVICE.notification
        )
        .then(() => {
          console.debug('Notification started on Connection Control Service');
        })
        .catch((error) => {
          console.debug('Notification error on Connection Control Service ', error);
        });
    } else {
      bleManager
        .stopNotification(
          peripheralId,
          CONNECTION_CONTROL_SERVICE.service,
          CONNECTION_CONTROL_SERVICE.notification
        )
        .then(() => {
          console.debug('Notification stoppepd on Connection Control Service');
        })
        .catch((error) => {
          console.debug('Notification error on Connection Control Service ', error);
        });
    }
  }, [enable]);

  useEffect(() => {
    read();
    return () => {
      bleManager
        .stopNotification(
          peripheralId,
          CONNECTION_CONTROL_SERVICE.service,
          CONNECTION_CONTROL_SERVICE.notification
        )
        .then(() => {
          console.debug('Notification stoppepd(unmount) on Connection Control Service');
        })
        .catch((error) => {
          console.debug('Notification error on Connection Control Service ', error);
        });
    };
  }, []);

  return (
    <View style={styles.container}>
      <SensorPresentation
        name="Connection Control Service"
        uuid={CONNECTION_CONTROL_SERVICE.service}
      />
      <View style={styles.chartContainer}>
        <View style={styles.switchContainer}>
          <Text style={{ paddingRight: 10 }}>Enable</Text>
          <Switch value={enable} onValueChange={setEnable} />
        </View>
        <View style={{ flexDirection: 'column', marginVertical: 15 }}>
          <Text>Slide to change latency</Text>
          <Slider
            value={data.connectionInterval}
            onValueChange={(value) => setData((prev) => ({ ...prev, connectionInterval: value }))}
            minimumValue={20}
            maximumValue={2000}
            onSlidingComplete={write}
            thumbStyle={{ width: 20, height: 20 }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text>{`${data.connectionInterval.toFixed(2)}ms`}</Text>
            <Text>2000.00ms</Text>
          </View>
        </View>
        <View>
          <Text style={{ marginBottom: 5 }}>
            Connection latency: {`${data.connectionInterval.toFixed(2)}ms`}
          </Text>
          <Text style={{ marginBottom: 5 }}>Slave latency: {data.slaveLatency}</Text>
          <Text>Supervision timeout: {`${(data.supervisionTimeout * 10).toFixed(2)}ms`}</Text>
        </View>
      </View>
    </View>
  );
};

export default ConnectionControlService;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  chartContainer: {
    flexDirection: 'column',
    paddingVertical: 15,
    paddingHorizontal: 25,
  },
  switchContainer: { flexDirection: 'row', alignItems: 'center' },
});
