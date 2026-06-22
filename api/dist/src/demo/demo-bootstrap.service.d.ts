import { OnModuleInit } from '@nestjs/common';
import { DemoSeedService } from './demo-seed.service';
export declare class DemoBootstrapService implements OnModuleInit {
    private readonly demoSeed;
    private readonly logger;
    constructor(demoSeed: DemoSeedService);
    onModuleInit(): Promise<void>;
}
