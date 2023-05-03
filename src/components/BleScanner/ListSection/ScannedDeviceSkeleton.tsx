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

import { Skeleton } from '@rneui/themed';
import { View, } from '../../../../components/Themed';
import LinearGradient from 'react-native-linear-gradient';

const ScannedDeviceSkeleton = () => {
  let h = 40;

  return (
    <View
      style={{
        flexDirection: 'row',
        display: 'flex',
        alignItems: 'center',
        paddingVertical: 20,
      }}
    >
      <Skeleton animation='pulse' style={{ width: '10%', height: h, marginRight: 10, marginTop: 5 }} />
      <Skeleton animation='wave' LinearGradientComponent={LinearGradient} style={{ width: '70%', height: h, marginRight: 10, marginTop: 5  }} />
      <View
        style={{
        flexDirection: 'column',
        display: 'flex',
        alignItems: 'center',
        paddingHorizontal: 0,
        marginLeft: 0,
        width: '10%'
      }}>
        <Skeleton animation='pulse'  style={{ height: h/2.5, marginTop: 5}} />
        <Skeleton animation='pulse'  style={{ height: h/2.5, marginTop: 5 }} />
      </View>
    </View>
  );
};

export default ScannedDeviceSkeleton;
