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
import { IR_TEMPERATURE_SENSOR } from '../../constants/SensorTag';
import { Text } from '@rneui/themed';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart, LineData, xAxis } from 'react-native-charts-wrapper';
import bleManager from 'react-native-ble-manager';
import { getBytes } from '../../hooks/convert';
import Legend from './Legend';
import { useSpecificScreenConfigContext } from '../../context/SpecificScreenOptionsContext';
import Colors from '../../constants/Colors';

interface Props {
  irTemperatureData: { obj: number[]; amb: number[] };
  peripheralId: string;
  icon: any;
}

const IRTemperatureSensor: React.FC<Props> = ({ irTemperatureData, peripheralId, icon }) => {
  const [enable, setEnable] = useState<boolean>(false);
  const { specificScreenConfig } = useSpecificScreenConfigContext();

  const currentTempUnits = useRef<'F' | 'C'>(specificScreenConfig.tempUnits);

  useEffect(() => {
    currentTempUnits.current = specificScreenConfig.tempUnits
  }, [specificScreenConfig.tempUnits]);

  useEffect(() => {
    if (enable) {
      let writeBytes = getBytes('1');
      bleManager.startNotification(
        peripheralId,
        IR_TEMPERATURE_SENSOR.service,
        IR_TEMPERATURE_SENSOR.notification
      );
      console.log('start notification')

      bleManager
        .write(
          peripheralId,
          IR_TEMPERATURE_SENSOR.service,
          IR_TEMPERATURE_SENSOR.configuration,
          writeBytes,
          writeBytes.length
        )
        .then(() => {
          console.debug('IR Temperature sensor enabled');
        });
    } else {
      bleManager.stopNotification(
        peripheralId,
        IR_TEMPERATURE_SENSOR.service,
        IR_TEMPERATURE_SENSOR.notification
      );

      let writeBytes = getBytes('0');
      bleManager
        .write(
          peripheralId,
          IR_TEMPERATURE_SENSOR.service,
          IR_TEMPERATURE_SENSOR.configuration,
          writeBytes,
          writeBytes.length
        )
        .then(() => {
          console.debug('IR Temperature sensor disabled');
        });
    }
  }, [enable]);

  let lastAmbTempValue = useMemo(() => {
    return irTemperatureData.amb[irTemperatureData.amb.length - 1].toFixed(2);
  }, [irTemperatureData.amb]);

  let lastObjTempValue = useMemo(() => {
    return irTemperatureData.obj[irTemperatureData.obj.length - 1].toFixed(2);
  }, [irTemperatureData.obj]);

  useEffect(() => {
    return () => {
      bleManager.stopNotification(
        peripheralId,
        IR_TEMPERATURE_SENSOR.service,
        IR_TEMPERATURE_SENSOR.notification
      );
      let writeBytes = getBytes('0');
      bleManager.write(
        peripheralId,
        IR_TEMPERATURE_SENSOR.service,
        IR_TEMPERATURE_SENSOR.configuration,
        writeBytes,
        writeBytes.length
      );
    };
  }, []);

  function getChartData(data: { obj: number[], amb: number[] }) {
    return {
      dataSets: [{
        values: data.amb,
        label: 'ambience',
        config: {
          color: processColor(Colors.blue),
          drawCircles: false,
          lineWidth: 1,
          drawValues: false
        }
      },
      {
        values: data.obj,
        label: 'object',
        config: {
          color: processColor(Colors.primary),
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
        enabled: true,
        drawLabels: true,
        drawAxisLine: true,
        drawGridLines: true,
        textColor: processColor('#000'),
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

      <SensorPresentation name="IR Temperature" uuid={IR_TEMPERATURE_SENSOR.service} icon={icon} />
      <View style={styles.chartContainer}>
        <View style={styles.switchContainer}>
          <Text style={{ paddingRight: 10 }}>Enable</Text>
          <Switch value={enable} onValueChange={setEnable} />
        </View>
        <LineChart
          style={styles.chart}
          data={getChartData(irTemperatureData)}
          chartDescription={{ text: '' }}
          xAxis={{
            granularityEnabled: true,
            drawLabels: true,
            position: 'BOTTOM',
            textColor: processColor('#000'),
          }}
          yAxis={chartConfig.yAxis}
          legend={chartConfig.legend}
          marker={chartConfig.markerConfig}
          {...chartConfig.config}
        />
        <Legend values={[`Ambience: ${lastAmbTempValue}°${currentTempUnits.current}`, `Object: ${lastObjTempValue}°${currentTempUnits.current}`]} />
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

export default IRTemperatureSensor;
