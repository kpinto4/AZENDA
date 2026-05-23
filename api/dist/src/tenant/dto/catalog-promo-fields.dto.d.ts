import type { PromoScheduleType } from '../../common/promo-schedule.util';
export declare class CatalogPromoFieldsDto {
    promoEnabled?: boolean;
    promoPrice?: number | null;
    promoScheduleType?: PromoScheduleType | null;
    promoDays?: number[];
    promoStartDate?: string | null;
    promoEndDate?: string | null;
    promoLabel?: string | null;
}
