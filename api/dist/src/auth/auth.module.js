"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const password_module_1 = require("./password.module");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            password_module_1.PasswordModule,
            passport_1.PassportModule,
            jwt_1.JwtModule.registerAsync({
                useFactory: () => {
                    const isProd = (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';
                    const secret = (process.env.JWT_SECRET ?? '').trim();
                    if (isProd) {
                        if (!secret) {
                            throw new Error('JWT_SECRET es obligatorio cuando NODE_ENV es production');
                        }
                        if (secret === 'dev-only-secret-change-me') {
                            throw new Error('JWT_SECRET no puede ser el valor de desarrollo en production');
                        }
                    }
                    return {
                        secret: secret || 'dev-only-secret-change-me',
                        signOptions: {
                            expiresIn: Number(process.env.JWT_EXPIRES_IN_SEC) || 60 * 60 * 12,
                        },
                    };
                },
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, jwt_strategy_1.JwtStrategy],
        exports: [auth_service_1.AuthService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map