import { AdminPlanCatalogService } from './admin-plan-catalog.service';
import { ReplacePlanCatalogDto } from './dto/replace-plan-catalog.dto';
export declare class AdminPlanCatalogController {
    private readonly planCatalog;
    constructor(planCatalog: AdminPlanCatalogService);
    list(): Promise<import("../infrastructure/sql-db/sql-db.types").PlanCatalogEntry[]>;
    replace(body: ReplacePlanCatalogDto): Promise<import("../infrastructure/sql-db/sql-db.types").PlanCatalogEntry[]>;
}
