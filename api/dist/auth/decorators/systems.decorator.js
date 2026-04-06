"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Systems = exports.SYSTEMS_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.SYSTEMS_KEY = 'systems';
const Systems = (...systems) => (0, common_1.SetMetadata)(exports.SYSTEMS_KEY, systems);
exports.Systems = Systems;
//# sourceMappingURL=systems.decorator.js.map