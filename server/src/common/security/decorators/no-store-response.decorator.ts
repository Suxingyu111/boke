import { SetMetadata } from '@nestjs/common';
import { NO_STORE_RESPONSE_METADATA } from '../security.constants';

export const NoStoreResponse = (): MethodDecorator & ClassDecorator =>
  SetMetadata(NO_STORE_RESPONSE_METADATA, true);
