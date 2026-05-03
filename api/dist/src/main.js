"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const dotenv_1 = require("dotenv");
const node_path_1 = require("node:path");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const express_1 = require("express");
const cwd = process.cwd();
const monoRoot = (0, node_path_1.resolve)(cwd, '..');
if ((0, node_fs_1.existsSync)((0, node_path_1.resolve)(monoRoot, '.env'))) {
    (0, dotenv_1.config)({ path: (0, node_path_1.resolve)(monoRoot, '.env') });
}
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)(cwd, '.env'), override: true });
function isLocalDevOrigin(origin) {
    if (!origin) {
        return true;
    }
    try {
        const h = new URL(origin).hostname.toLowerCase();
        return (h === 'localhost' ||
            h === '127.0.0.1' ||
            h === '[::1]' ||
            h === '::1');
    }
    catch {
        return false;
    }
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const extraOrigins = (process.env.CORS_ORIGINS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    app.enableCors({
        origin: (origin, callback) => {
            if (isLocalDevOrigin(origin)) {
                callback(null, true);
                return;
            }
            if (origin && extraOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    });
    app.use((0, express_1.json)({ limit: '3mb' }));
    app.use((0, express_1.urlencoded)({ extended: true, limit: '3mb' }));
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use((_req, res, next) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        next();
    });
    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
//# sourceMappingURL=main.js.map