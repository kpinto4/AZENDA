"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcrypt");
const SALT_ROUNDS = 10;
let PasswordService = class PasswordService {
    isBcryptHash(stored) {
        return /^\$2[aby]\$\d{2}\$/.test(stored);
    }
    async hash(plain) {
        return bcrypt.hash(plain, SALT_ROUNDS);
    }
    async verify(plain, stored) {
        if (this.isBcryptHash(stored)) {
            return bcrypt.compare(plain, stored);
        }
        return plain === stored;
    }
};
exports.PasswordService = PasswordService;
exports.PasswordService = PasswordService = __decorate([
    (0, common_1.Injectable)()
], PasswordService);
//# sourceMappingURL=password.service.js.map