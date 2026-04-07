"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bcrypt = __importStar(require("bcrypt"));
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("../src/generated/prisma/client");
const enums_1 = require("../src/generated/prisma/enums");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is required to run the seed script.');
}
const prisma = new client_1.PrismaClient({
    adapter: new adapter_pg_1.PrismaPg({ connectionString }),
});
async function seedAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@grad.local';
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@123456';
    const adminName = process.env.ADMIN_NAME ?? 'Department Head';
    const adminDepartment = process.env.ADMIN_DEPARTMENT ?? 'Computer Science';
    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail },
        select: { id: true },
    });
    if (existingAdmin) {
        const admin = await prisma.user.update({
            where: { email: adminEmail },
            data: {
                name: adminName,
                role: enums_1.Role.HEAD,
                department: adminDepartment,
            },
            select: {
                id: true,
                email: true,
                role: true,
            },
        });
        console.log(`[seed] Admin already exists. Updated role/profile for ${admin.email} (${admin.role}).`);
        return;
    }
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.user.create({
        data: {
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            role: enums_1.Role.HEAD,
            department: adminDepartment,
        },
        select: {
            id: true,
            email: true,
            role: true,
        },
    });
    console.log(`[seed] Admin created: ${admin.email} (${admin.role}).`);
}
async function main() {
    await seedAdmin();
}
main()
    .catch((error) => {
    console.error('[seed] Failed to seed admin user:', error);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map