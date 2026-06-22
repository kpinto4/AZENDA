import { DemoResetService } from '../demo/demo-reset.service';
export declare class AdminDemoController {
    private readonly demoReset;
    constructor(demoReset: DemoResetService);
    resetNow(): Promise<import("../demo/demo-reset.service").DemoResetResult>;
}
