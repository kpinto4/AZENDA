export type PromoScheduleType = 'always' | 'weekdays' | 'date_range';
export interface CatalogPromoFields {
    promoEnabled: boolean;
    promoPrice: number | null;
    promoScheduleType: PromoScheduleType | null;
    promoDays: number[];
    promoStartDate: string | null;
    promoEndDate: string | null;
    promoLabel: string | null;
}
export declare function ymdFromWhen(when: string): string | null;
export declare function parseLegacyPromoDays(promoLabel: string | null | undefined): number[];
export declare function buildPromoSummaryLabel(fields: CatalogPromoFields): string | null;
export declare function parsePromoDaysJson(raw: string | null | undefined): number[];
export declare function serializePromoDays(days: number[]): string | null;
export declare function isPromoActiveForDate(fields: Pick<CatalogPromoFields, 'promoEnabled' | 'promoPrice' | 'promoScheduleType' | 'promoDays' | 'promoStartDate' | 'promoEndDate' | 'promoLabel'>, when: string): boolean;
export declare function effectiveCatalogPrice(basePrice: number, fields: Pick<CatalogPromoFields, 'promoEnabled' | 'promoPrice' | 'promoScheduleType' | 'promoDays' | 'promoStartDate' | 'promoEndDate' | 'promoLabel'>, when: string): number;
export declare function normalizePromoFields(input: {
    promoEnabled?: boolean;
    promoPrice?: number | null;
    promoScheduleType?: PromoScheduleType | null;
    promoDays?: number[] | null;
    promoStartDate?: string | null;
    promoEndDate?: string | null;
    promoLabel?: string | null;
}): CatalogPromoFields;
export declare function inferPromoFieldsFromLegacy(promoPrice: number | null, promoLabel: string | null): CatalogPromoFields;
