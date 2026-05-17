import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiTenantCatalogService } from '../../core/services/api-tenant-catalog.service';
import { ApiTenantSalesService } from '../../core/services/api-tenant-sales.service';
import { ApiStoreVisitsService } from '../../core/services/api-store-visits.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';
import { TenantSalesComponent } from './tenant-sales.component';

describe('TenantSalesComponent', () => {
  let fixture: ComponentFixture<TenantSalesComponent>;
  let apiSales: jasmine.SpyObj<ApiTenantSalesService>;
  let mockData: MockDataService;

  beforeEach(async () => {
    apiSales = jasmine.createSpyObj('ApiTenantSalesService', ['list', 'create']);
    apiSales.list.and.returnValue(of([]));
    apiSales.create.and.returnValue(
      of({
        id: 's1',
        tenantId: 't2',
        total: 12,
        method: 'Tarjeta',
        saleDate: '2026-05-16',
        linkedAppointmentId: null,
        stockNote: null,
        createdAt: '2026-05-16T00:00:00.000Z',
      }),
    );

    await TestBed.configureTestingModule({
      imports: [TenantSalesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiTenantSalesService, useValue: apiSales },
        {
          provide: ApiStoreVisitsService,
          useValue: jasmine.createSpyObj('ApiStoreVisitsService', { list: of([]) }),
        },
        {
          provide: ApiTenantCatalogService,
          useValue: jasmine.createSpyObj('ApiTenantCatalogService', {
            getCatalog: of({ products: [], services: [] }),
          }),
        },
      ],
    }).compileComponents();

    mockData = TestBed.inject(MockDataService);
    spyOn(mockData, 'addSale');

    const session = TestBed.inject(MockSessionService);
    session.loginAsTenantAdmin();
    session.accessToken.set('test-jwt');
    (environment as { useLiveAuth: boolean }).useLiveAuth = true;
    fixture = TestBed.createComponent(TenantSalesComponent);
    fixture.detectChanges();
  });

  it('add() usa API en modo live y no MockDataService.addSale', () => {
    const comp = fixture.componentInstance;
    comp.form.patchValue({ total: 25, method: 'Efectivo', linked: '', productId: '', stockQty: 1 });
    comp.add();
    expect(apiSales.create).toHaveBeenCalled();
    expect(mockData.addSale).not.toHaveBeenCalled();
  });
});
