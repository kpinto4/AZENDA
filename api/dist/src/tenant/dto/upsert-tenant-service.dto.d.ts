import { CatalogPromoFieldsDto } from './catalog-promo-fields.dto';
export declare class UpsertTenantServiceDto extends CatalogPromoFieldsDto {
    name: string;
    description?: string;
    price: number;
    durationMinutes?: number;
}
