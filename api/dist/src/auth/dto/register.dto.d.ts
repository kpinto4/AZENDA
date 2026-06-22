import { BillingCycle } from '../../infrastructure/sql-db/sql-db.types';
export declare class RegisterDto {
    business: string;
    email: string;
    password: string;
    selectedPlan?: string;
    billingCycle?: BillingCycle;
}
