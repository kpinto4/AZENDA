export declare class PatchSiteConfigLandingDto {
    navBrand?: string;
    eyebrow?: string;
    heroTitle?: string;
    heroLead?: string;
    sectionTitle?: string;
    sectionSub?: string;
    demoTitle?: string;
    demoSub?: string;
    plansSectionTitle?: string;
    plansSectionSub?: string;
    ctaTitle?: string;
    ctaLead?: string;
    footerNote?: string;
    demoBannerText?: string;
}
export declare class PatchSiteConfigDto {
    currencyCode?: string;
    currencySymbol?: string;
    planPriceBasic?: number;
    planPricePro?: number;
    planPriceBusiness?: number;
    landing?: PatchSiteConfigLandingDto;
}
