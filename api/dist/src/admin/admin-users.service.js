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
exports.AdminUsersService = void 0;
const common_1 = require("@nestjs/common");
const user_repository_1 = require("../infrastructure/sql-db/repositories/user.repository");
let AdminUsersService = class AdminUsersService {
    constructor(users) {
        this.users = users;
    }
    listUsers() {
        return this.users.listAll();
    }
    findById(userId) {
        return this.users.findById(userId);
    }
    create(data) {
        return this.users.create(data);
    }
    update(userId, patch) {
        return this.users.update(userId, patch);
    }
    delete(userId) {
        return this.users.delete(userId);
    }
};
exports.AdminUsersService = AdminUsersService;
exports.AdminUsersService = AdminUsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_repository_1.UserRepository])
], AdminUsersService);
//# sourceMappingURL=admin-users.service.js.map