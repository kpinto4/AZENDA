import { SetMetadata } from '@nestjs/common';
import { AppSystem } from '../auth.types';

export const SYSTEMS_KEY = 'systems';
export const Systems = (...systems: AppSystem[]) =>
  SetMetadata(SYSTEMS_KEY, systems);
