"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPER_ADMIN_SEED_EMAIL = exports.SUPER_ADMIN_SEED_USER_ID = void 0;
exports.getSuperAdminSeedPassword = getSuperAdminSeedPassword;
exports.SUPER_ADMIN_SEED_USER_ID = 'usr_super_1';
exports.SUPER_ADMIN_SEED_EMAIL = 'super@azenda.dev';
function getSuperAdminSeedPassword() {
    const fromEnv = (process.env.SUPER_ADMIN_SEED_PASSWORD ?? '').trim();
    return fromEnv || '1097092773';
}
//# sourceMappingURL=seed-credentials.js.map