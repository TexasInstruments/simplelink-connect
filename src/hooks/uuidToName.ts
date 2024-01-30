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

interface ServiceNameProsps {
  uuid: string;
}

type ServiceSpecificScreenType = {
  serviceName: string;
  serviceUuid: string;
  icon?: {
    type: 'font-awesome' | 'svg' | 'font-awesome-5';
    iconName: string;
  };
  serviceSpecificScreen?: string;
};

export const uuidToServiceName = async ({
  uuid,
}: ServiceNameProsps): Promise<string | undefined> => {
  let data = await import('../assets/services');

  let service = data.default.filter(
    (service) => service.serviceUuid.toLowerCase() === uuid.toLowerCase()
  );

  return service.length > 0 ? service[0].serviceName : undefined;
};

export const uuidToIcon = async ({
  uuid,
}: ServiceNameProsps): Promise<
  { type: 'font-awesome' | 'svg' | 'font-awesome-5'; iconName: string } | undefined
> => {
  let data = await import('../assets/services');

  let service = data.default.filter(
    (service) => service.serviceUuid.toLowerCase() === uuid.toLowerCase()
  );

  return service.length > 0 ? service[0].icon : undefined;
};

export const serviceNameToIcon = async (
  name: string,
): Promise<
  { type: 'font-awesome' | 'svg' | 'font-awesome-5'; iconName: string } | undefined
> => {
  let data = await import('../assets/services');

  let service = data.default.filter(
    (service) => service.serviceName.toLowerCase() === name.toLowerCase()
  );

  return service.length > 0 ? service[0].icon : undefined;
};

export const uuidToServiceSpecificScreen = async ({
  uuid,
}: ServiceNameProsps): Promise<ServiceSpecificScreenType | undefined> => {
  let data = await import('../assets/services');

  let service = data.default.filter(
    (service) =>
      service.serviceUuid.toLowerCase() === uuid.toLowerCase() && service.serviceSpecificScreen
  );

  return service.length > 0 ? service[0] : undefined;
};

export const uuidToCharacteristicName =
  (uuid: string, knownUuids: any) => {
    let characteristic = knownUuids.filter(
      (characteristic: any) => {
        return characteristic.uuid.toLowerCase() === uuid.toLowerCase()
      }
    );
    return characteristic.length > 0 ? characteristic[0].name : undefined;
  };
