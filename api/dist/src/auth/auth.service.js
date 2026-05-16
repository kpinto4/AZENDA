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
const sql_db_service_1 = require("../infrastructure/sql-db/sql-db.service");
const password_service_1 = require("./password.service");
let AuthService = class AuthService {
    constructor(jwtService, sqlDbService, passwordService) {
        this.jwtService = jwtService;
        this.sqlDbService = sqlDbService;
        this.passwordService = passwordService;
    }
    async login(dto) {
        const email = dto.email.trim().toLowerCase();
        const user = await this.sqlDbService.findUserByEmailNormalized(email);
        if (!user) {
            throw new common_1.UnauthorizedException('Credenciales invalidas');
        }
        const valid = await this.passwordService.verify(dto.password, user.password);
        if (!valid) {
            throw new common_1.UnauthorizedException('Credenciales invalidas');
        }
        let authUser = user;
        if (!this.passwordService.isBcryptHash(user.password)) {
            const hash = await this.passwordService.hash(dto.password);
            const updated = await this.sqlDbService.updateUser(user.id, { password: hash });
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
    async findById(userId) {
        return this.sqlDbService.findUserById(userId);
    }
    toSafeUser(user) {
        const safeUser = { ...user };
        delete safeUser.password;
        return safeUser;
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