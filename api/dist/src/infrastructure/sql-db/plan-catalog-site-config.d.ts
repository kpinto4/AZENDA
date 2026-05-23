import { PlanCatalogEntry, PlatformSiteConfig } from './sql-db.types';
export declare function planCatalogPricePatch(entries: PlanCatalogEntry[]): Partial<Pick<PlatformSiteConfig, 'planPriceBasic' | 'planPricePro' | 'planPriceBusiness'>>;
export declare function applyPlanCatalogPricesToSiteConfig(config: PlatformSiteConfig, entries: PlanCatalogEntry[]): PlatformSiteConfig;
