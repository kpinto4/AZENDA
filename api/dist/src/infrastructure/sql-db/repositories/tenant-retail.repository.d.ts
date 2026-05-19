import { PgClientService } from '../pg-client.service';
import { StoreVisitLogEntity, TenantSaleEntity, TenantStockMovementEntity } from '../sql-db.types';
export declare class TenantRetailRepository {
    private readonly pg;
    constructor(pg: PgClientService);
    private round2;
    private mapStoreVisitRow;
    private mapTenantSaleRow;
    ensureSalesTable(): Promise<void>;
    private mapStockMovementRow;
    listStockMovementsByTenantId(tenantId: string, limit?: number): Promise<TenantStockMovementEntity[]>;
    insertStockMovement(data: {
        tenantId: string;
        productId: string;
        productName: string;
        delta: number;
        reason: string;
    }): Promise<TenantStockMovementEntity>;
    listStoreVisitsByTenantId(tenantId: string): Promise<StoreVisitLogEntity[]>;
    createStoreVisitLog(data: {
        tenantId: string;
        customer: string;
        detail: string;
    }): Promise<StoreVisitLogEntity>;
    listTenantSalesByTenantId(tenantId: string): Promise<TenantSaleEntity[]>;
    insertTenantSale(data: {
        tenantId: string;
        saleDate: string;
        total: number;
        method: string;
        linkedAppointmentId: string | null;
        stockNote: string | null;
    }): Promise<TenantSaleEntity>;
}
