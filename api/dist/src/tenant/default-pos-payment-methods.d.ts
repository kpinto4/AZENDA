export interface PosPaymentMethodConfig {
    id: string;
    label: string;
    enabled: boolean;
    detail: string;
}
export declare const DEFAULT_POS_PAYMENT_METHODS: PosPaymentMethodConfig[];
export declare function defaultPosPaymentMethodsJson(): string;
export declare function parsePosPaymentMethodsJson(raw: string | null | undefined): PosPaymentMethodConfig[];
