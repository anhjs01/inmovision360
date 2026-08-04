"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatUser = formatUser;
exports.parsePropArrays = parsePropArrays;
function formatUser(user) {
    const { password, deletedAt, ...safe } = user;
    return safe;
}
function parsePropArrays(prop) {
    if (!prop)
        return prop;
    return {
        ...prop,
        fotos: tryParse(prop.fotos, []),
        comodidades: tryParse(prop.comodidades, []),
    };
}
function tryParse(value, fallback) {
    try {
        return typeof value === 'string' ? JSON.parse(value) : (value ?? fallback);
    }
    catch {
        return fallback;
    }
}
//# sourceMappingURL=formatters.js.map