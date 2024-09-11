/*
 * Copyright (c) 2023, Texas Instruments Incorporated
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * *  Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *
 * *  Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * *  Neither the name of Texas Instruments Incorporated nor the names of
 *    its contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import { Dimensions, StyleSheet, processColor } from 'react-native';
import { Switch, View } from '../Themed';
import SensorPresentation from './SensorPresentation';
import { ACCELEROMETER_SERVICE } from '../../constants/SensorTag';
import { Text } from '@rneui/themed';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart } from 'react-native-charts-wrapper';
import bleManager from 'react-native-ble-manager';
import Legend from './Legend';
import { useSpecificScreenConfigContext } from '../../context/SpecificScreenOptionsContext';
import Colors from '../../constants/Colors';

interface Props {
  accelerometerData: { xaxis: number, yaxis: number, zaxis: number }[];
  peripheralId: string;
  icon: any;
}

const AccelerometerSensor: React.FC<Props> = ({ accelerometerData, peripheralId, icon }) => {
  const [enable, setEnable] = useState<boolean>(false);
  const { specificScreenConfig } = useSpecificScreenConfigContext();

  const currentTempUnits = useRef<'F' | 'C'>(specificScreenConfig.tempUnits);

  useEffect(() => {
    currentTempUnits.current = specificScreenConfig.tempUnits
  }, [specificScreenConfig.tempUnits]);

  useEffect(() => {
    if (enable) {
      bleManager.startNotification(
        peripheralId,
        ACCELEROMETER_SERVICE.service,
        ACCELEROMETER_SERVICE.notification
      );
      console.log('start notification')
    } else {
      bleManager.stopNotification(
        peripheralId,
        ACCELEROMETER_SERVICE.service,
        ACCELEROMETER_SERVICE.notification
      );
      console.log('stop notification')

    }
  }, [enable]);

  let { lastX, lastY, lastZ } = useMemo(() => {
    return {
      lastX: accelerometerData[accelerometerData.length - 1].xaxis,
      lastY: accelerometerData[accelerometerData.length - 1].xaxis,
      lastZ: accelerometerData[accelerometerData.length - 1].xaxis,
    };
  }, [accelerometerData]);

  useEffect(() => {
    return () => {
      bleManager.stopNotification(
        peripheralId,
        ACCELEROMETER_SERVICE.service,
        ACCELEROMETER_SERVICE.notification
      );
    };
  }, []);

  function getChartData(data: { xaxis: number, yaxis: number, zaxis: number }[]) {
    return {
      dataSets: [{
        values: data.map((d => d.xaxis)),
        label: 'Xaxis',
        config: {
          color: processColor(Colors.blue),
          drawCircles: false,
          lineWidth: 1,
          drawValues: false
        }
      },
      {
        values: data.map((d => d.yaxis)),
        label: 'Yaxis',
        config: {
          color: processColor(Colors.primary),
          drawCircles: false,
          lineWidth: 1,
          drawValues: false
        }
      },
      {
        values: data.map((d => d.zaxis)),
        label: 'Zaxis',
        config: {
          color: processColor('green'),
          drawCircles: false,
          lineWidth: 1,
          drawValues: false
        }
      },

      ],
    }
  };

  const chartConfig = {
    yAxis: {
      left: {
        drawGridLines: true,
        drawLabels: true,
      },
      right: {
        enabled: false,
      },
    },
    legend: {
      enabled: true,
    },
    config: {
      touchEnabled: true,
      dragEnabled: true,
      scaleEnabled: true,
      scaleXEnabled: true,
      scaleYEnabled: false,
      pinchZoom: true,
      doubleTapToZoomEnabled: true
    },
    markerConfig: {
      enabled: true,
      markerColor: processColor(Colors.lightGray),
      textColor: processColor('black'),
      digits: 3,
    }
  };

  return (
    <View style={styles.container}>
      <SensorPresentation name="TI Accelerometer" uuid={ACCELEROMETER_SERVICE.service} icon={icon} />
      <View style={styles.chartContainer}>
        <View style={styles.switchContainer}>
          <Text style={{ paddingRight: 10 }}>Enable</Text>
          <Switch value={enable} onValueChange={setEnable} />
        </View>
        {accelerometerData.length > 0 && (
          <LineChart
            style={styles.chart}
            data={getChartData(accelerometerData, 'a')}
            chartDescription={{ text: '' }}
            xAxis={{
              granularityEnabled: true,
              granularity: 1,
              drawLabels: true,
              position: 'BOTTOM',
            }}
            yAxis={chartConfig.yAxis}
            legend={chartConfig.legend}
            marker={chartConfig.markerConfig}
            {...chartConfig.config}
          />
        )}
        {accelerometerData.length > 1 && (
          <Legend values={[`Xaxis: ${lastX.toFixed(2)}`, `Yaxis: ${lastY.toFixed(2)}`, `Zaxis: ${lastZ.toFixed(2)}`]} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
  },
  chartContainer: {
    flexDirection: 'column',
    paddingVertical: 15,
    alignItems: 'center',
  },
  chart: {
    width: '90%',
    flex: 1,
    height: 220,
    marginBottom: 30
  },
  switchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 25,
    alignItems: 'center',
    alignSelf: 'flex-start'
  },
});

export default AccelerometerSensor;
