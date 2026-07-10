export const DEFAULT_TEAM_NAMES = ["TAX", "TEAM", "QTA"] as const;

export type SeedUser = {
    name: string;
    email: string;
    teamName: string;
    password: string;
    birthDateIso: string;
    role: "ADMIN" | "TRAINER";
    approvalStatus: "APPROVED";
};

export type SeedBadge = {
    code: string;
    title: string;
    description: string;
    ruleJson: string;
};

export const DEFAULT_SEED_USERS: ReadonlyArray<SeedUser> = [
    {
        name: "System Admin",
        email: "admin@hackaithon.local",
        teamName: "TEAM",
        password: "admin123",
        birthDateIso: "1990-01-01",
        role: "ADMIN",
        approvalStatus: "APPROVED",
    },
    {
        name: "Default Trainer",
        email: "trainer@hackaithon.local",
        teamName: "TAX",
        password: "trainer123",
        birthDateIso: "1993-01-01",
        role: "TRAINER",
        approvalStatus: "APPROVED",
    },
];

export const DEFAULT_SEED_BADGES: ReadonlyArray<SeedBadge> = [
    {
        code: "STARTER",
        title: "Starter",
        description: "Rond je eerste onderdeel af.",
        ruleJson: JSON.stringify({ trigger: "section_completed", minCount: 1 }),
    },
    {
        code: "CONSISTENT",
        title: "Consistent",
        description: "Houd een 3-daagse leerstreak vol.",
        ruleJson: JSON.stringify({ trigger: "streak_days", minDays: 3 }),
    },
    {
        code: "FINISHER",
        title: "Finisher",
        description: "Voltooi je eerste e-learning.",
        ruleJson: JSON.stringify({ trigger: "course_completed", minCount: 1 }),
    },
];
