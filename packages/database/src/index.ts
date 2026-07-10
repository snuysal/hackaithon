export type DatabasePackageStatus = {
    connected: boolean;
    provider: "postgresql" | "sqlite";
};

export function createDatabasePackageStatus(provider: "postgresql" | "sqlite"): DatabasePackageStatus {
    return {
        connected: false,
        provider,
    };
}

export { DEFAULT_SEED_BADGES, DEFAULT_SEED_USERS } from "./seed-data.js";
export { PrismaClient } from "@prisma/client";
