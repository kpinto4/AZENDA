import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { ReplacePlanCatalogDto } from './dto/replace-plan-catalog.dto';
export declare class AdminPlanCatalogController {
    private readonly sqlDbService;
    constructor(sqlDbService: SqlDbService);
    list(): Promise<import("../infrastructure/sql-db/sql-db.types").PlanCatalogEntry[]>;
    replace(body: ReplacePlanCatalogDto): Promise<import("../infrastructure/sql-db/sql-db.types").PlanCatalogEntry[]>;
}
