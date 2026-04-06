"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSystem = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["EMPLEADO"] = "EMPLEADO";
    UserRole["CLIENTE_FINAL"] = "CLIENTE_FINAL";
})(UserRole || (exports.UserRole = UserRole = {}));
var AppSystem;
(function (AppSystem) {
    AppSystem["SUPER_ADMIN"] = "SUPER_ADMIN";
    AppSystem["TENANT"] = "TENANT";
    AppSystem["PUBLIC_BOOKING"] = "PUBLIC_BOOKING";
})(AppSystem || (exports.AppSystem = AppSystem = {}));
//# sourceMappingURL=auth.types.js.map