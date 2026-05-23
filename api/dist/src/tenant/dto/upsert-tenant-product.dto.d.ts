import { CatalogPromoFieldsDto } from './catalog-promo-fields.dto';
export declare class UpsertTenantProductDto extends CatalogPromoFieldsDto {
    name: string;
    description?: string;
    price: number;
    sku: string;
    stock: number;
    imageUrl?: string | null;
}
