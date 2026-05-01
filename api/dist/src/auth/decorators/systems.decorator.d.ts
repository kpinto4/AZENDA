import { AppSystem } from '../auth.types';
export declare const SYSTEMS_KEY = "systems";
export declare const Systems: (...systems: AppSystem[]) => import("@nestjs/common").CustomDecorator<string>;
