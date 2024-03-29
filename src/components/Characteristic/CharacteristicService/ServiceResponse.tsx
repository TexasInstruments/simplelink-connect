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

import { Text, View } from '../../Themed';

type ResponseObject = {
  data: string;
  time: string;
};

interface Props {
  responseArray: ResponseObject[];
}

const ServiceResponse: React.FC<Props> = ({ responseArray }) => {
  return (
    <View>
      {responseArray.map((readData, i) => {
        return (
          <View
            style={{
              flexDirection: 'column',
              paddingVertical: 10,
              marginRight: 20,
              borderTopWidth: i === 0 ? 0 : 2,
              borderColor: 'rgba(211,211,211,0.3)',
              marginBottom: i === responseArray.length - 1 ? -10 : 0,
            }}
            key={`${readData.data}-${i}}`}
          >
            <Text adjustsFontSizeToFit allowFontScaling style={{ fontWeight: 'bold' }}>
              {readData.data}
            </Text>
            <Text style={{ fontWeight: '200', color: 'gray' }}>{readData.time}</Text>
          </View>
        );
      })}
    </View>
  );
};

export default ServiceResponse;
