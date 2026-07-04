"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const auth_types_1 = require("./auth.types");
const demo_tenant_snapshot_1 = require("../../scripts/demo-tenant.snapshot");
const sql_db_service_1 = require("../infrastructure/sql-db/sql-db.service");
const plan_modules_1 = require("../infrastructure/sql-db/plan-modules");
const password_service_1 = require("./password.service");
const env_util_1 = require("../common/env.util");
const billing_config_1 = require("../common/billing.config");
let AuthService = class AuthService {
    constructor(jwtService, sqlDbService, passwordService) {
        this.jwtService = jwtService;
        this.sqlDbService = sqlDbService;
        this.passwordService = passwordService;
    }
    async register(dto) {
        const email = dto.email.trim().toLowerCase();
        const existing = await this.sqlDbService.findUserByEmailNormalized(email);
        if (existing) {
            throw new common_1.ConflictException('Ya existe una cuenta con ese correo');
        }
        const business = dto.business.trim();
        const tenantId = `tenant_${Date.now()}`;
        const slug = await this.uniqueTenantSlug(business, tenantId);
        const registrationPlan = dto.selectedPlan ?? 'Básico';
        const billingCycle = (0, billing_config_1.normalizeBillingCycle)(dto.billingCycle);
        await this.sqlDbService.createTenant({
            id: tenantId,
            name: business,
            slug,
            status: 'PAUSED',
            plan: registrationPlan,
            storefrontEnabled: false,
            billingCycle,
            subscriptionStatus: 'pending_payment',
            modules: (0, plan_modules_1.defaultModulesForPlan)(registrationPlan),
        });
        const userId = `usr_${Date.now()}`;
        await this.sqlDbService.createUser({
            id: userId,
            email,
            password: dto.password,
            role: auth_types_1.UserRole.ADMIN,
            tenantId,
            systems: [auth_types_1.AppSystem.TENANT, auth_types_1.AppSystem.PUBLIC_BOOKING],
            status: 'ACTIVE',
        });
        return this.login({ email, password: dto.password });
    }
    async login(dto) {
        const email = dto.email.trim().toLowerCase();
        const user = await this.sqlDbService.findUserByEmailNormalized(email);
        if (!user) {
            throw new common_1.UnauthorizedException('Credenciales invalidas');
        }
        if (!(0, env_util_1.isDemoFeaturesEnabled)()) {
            const isDemoAccount = user.tenantId === demo_tenant_snapshot_1.DEMO_TENANT_ID ||
                user.email === demo_tenant_snapshot_1.DEMO_ADMIN_EMAIL ||
                user.email === demo_tenant_snapshot_1.DEMO_EMPLOYEE_EMAIL;
            if (isDemoAccount) {
                throw new common_1.UnauthorizedException('Credenciales invalidas');
            }
        }
        const valid = await this.passwordService.verify(dto.password, user.password);
        if (!valid) {
            throw new common_1.UnauthorizedException('Credenciales invalidas');
        }
        let authUser = user;
        if (!this.passwordService.isBcryptHash(user.password)) {
            const hash = await this.passwordService.hash(dto.password);
            const updated = await this.sqlDbService.updateUser(user.id, {
                password: hash,
            });
            if (updated) {
                authUser = updated;
            }
        }
        if (authUser.status !== 'ACTIVE') {
            throw new common_1.UnauthorizedException('Usuario no activo');
        }
        const payload = {
            sub: authUser.id,
            email: authUser.email,
            role: authUser.role,
            tenantId: authUser.tenantId,
            systems: authUser.systems,
        };
        return {
            accessToken: this.jwtService.sign(payload),
            tokenType: 'Bearer',
            user: this.toSafeUser(authUser),
        };
    }
    async me(userId) {
        const user = await this.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('Usuario no encontrado');
        }
        return this.toSafeUser(user);
    }
    async startDemoSession(dto = {}) {
        if (!(0, env_util_1.isDemoFeaturesEnabled)()) {
            throw new common_1.ForbiddenException('Demo desactivado en este entorno');
        }
        const role = dto.role ?? 'admin';
        const email = role === 'employee' ? demo_tenant_snapshot_1.DEMO_EMPLOYEE_EMAIL : demo_tenant_snapshot_1.DEMO_ADMIN_EMAIL;
        const user = await this.sqlDbService.findUserByEmailNormalized(email);
        if (!user || user.tenantId !== demo_tenant_snapshot_1.DEMO_TENANT_ID) {
            throw new common_1.UnauthorizedException('Demo no disponible');
        }
        const isDemo = await this.sqlDbService.isDemoTenant(demo_tenant_snapshot_1.DEMO_TENANT_ID);
        if (!isDemo) {
            throw new common_1.UnauthorizedException('Demo no disponible');
        }
        if (user.status !== 'ACTIVE') {
            throw new common_1.UnauthorizedException('Usuario demo no activo');
        }
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            systems: user.systems,
            isDemoShowcase: true,
        };
        return {
            accessToken: this.jwtService.sign(payload),
            tokenType: 'Bearer',
            user: this.toSafeUser(user),
            isDemoShowcase: true,
        };
    }
    async findById(userId) {
        return this.sqlDbService.findUserById(userId);
    }
    toSafeUser(user) {
        const safeUser = { ...user };
        delete safeUser.password;
        return safeUser;
    }
    slugifyName(name) {
        const base = name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 36);
        return base.length ? base : 'negocio';
    }
    async uniqueTenantSlug(businessName, tenantId) {
        const suffix = tenantId.replace(/^tenant_/, '') || tenantId;
        let candidate = `${this.slugifyName(businessName)}-${suffix}`;
        let attempt = 0;
        while (await this.sqlDbService.findTenantBySlug(candidate)) {
            attempt += 1;
            candidate = `${this.slugifyName(businessName)}-${suffix}-${attempt}`;
        }
        return candidate;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        sql_db_service_1.SqlDbService,
        password_service_1.PasswordService])
], AuthService);
//# sourceMappingURL=auth.service.js.map