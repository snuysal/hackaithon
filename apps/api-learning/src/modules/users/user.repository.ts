import { DEFAULT_SEED_BADGES, DEFAULT_SEED_USERS, DEFAULT_TEAM_NAMES } from "@hackaithon/database";
import { TEAM_OPTIONS, type ApprovalStatus, type AppRole, type TeamName } from "@hackaithon/shared-types";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../database/prisma.service.js";

import type { UserRecord } from "./user-record.js";

const userWithPrimaryTeamInclude = {
    teamMemberships: {
        include: {
            team: true,
        },
        orderBy: {
            joinedAt: "asc",
        },
        take: 1,
    },
} as const;

type DbUserWithPrimaryTeam = {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    birthDate: Date;
    role: AppRole;
    approvalStatus: ApprovalStatus;
    createdAt: Date;
    teamMemberships: Array<{
        team: {
            name: string;
        };
    }>;
};

export type CreateParticipantInput = {
    name: string;
    email: string;
    teamName: TeamName;
    password: string;
    birthDateIso: string;
};

@Injectable()
export class UserRepository {
    private hasSeeded = false;
    private seedPromise: Promise<void> | null = null;

    public constructor(private readonly prisma: PrismaService) { }

    public async createParticipant(input: CreateParticipantInput): Promise<UserRecord> {
        await this.ensureSeeded();

        const normalizedTeamName = normalizeTeamName(input.teamName);

        try {
            const team = await this.prisma.team.upsert({
                where: { name: normalizedTeamName },
                create: { name: normalizedTeamName },
                update: {},
            });

            const createdUser = await this.prisma.user.create({
                data: {
                    name: input.name.trim(),
                    email: normalizeEmail(input.email),
                    passwordHash: input.password,
                    birthDate: new Date(input.birthDateIso),
                    role: "PARTICIPANT",
                    approvalStatus: "PENDING",
                },
            });

            await this.prisma.userTeamMembership.create({
                data: {
                    userId: createdUser.id,
                    teamId: team.id,
                },
            });

            const user = await this.prisma.user.findUniqueOrThrow({
                where: { id: createdUser.id },
                include: userWithPrimaryTeamInclude,
            });

            return mapDbUserToUserRecord(user);
        } catch (error: unknown) {
            if (isDuplicateEmailError(error)) {
                throw new ConflictException("A user with this e-mail address already exists.");
            }

            throw error;
        }
    }

    public async findByEmail(email: string): Promise<UserRecord | undefined> {
        await this.ensureSeeded();

        const user = await this.prisma.user.findUnique({
            where: {
                email: normalizeEmail(email),
            },
            include: userWithPrimaryTeamInclude,
        });

        if (!user) {
            return undefined;
        }

        return mapDbUserToUserRecord(user);
    }

    public async findById(id: string): Promise<UserRecord> {
        await this.ensureSeeded();

        const user = await this.prisma.user.findUnique({
            where: {
                id,
            },
            include: userWithPrimaryTeamInclude,
        });

        if (!user) {
            throw new NotFoundException(`User with id ${id} was not found.`);
        }

        return mapDbUserToUserRecord(user);
    }

    public async listByApprovalStatus(status: ApprovalStatus): Promise<UserRecord[]> {
        await this.ensureSeeded();

        const users = await this.prisma.user.findMany({
            where: {
                approvalStatus: status,
            },
            include: userWithPrimaryTeamInclude,
            orderBy: {
                createdAt: "asc",
            },
        });

        return users.map(mapDbUserToUserRecord);
    }

    public async updateApprovalStatus(userId: string, status: ApprovalStatus): Promise<UserRecord> {
        await this.ensureSeeded();

        try {
            const user = await this.prisma.user.update({
                where: {
                    id: userId,
                },
                data: {
                    approvalStatus: status,
                    approvedAt: status === "APPROVED" ? new Date() : null,
                },
                include: userWithPrimaryTeamInclude,
            });

            return mapDbUserToUserRecord(user);
        } catch (error: unknown) {
            if (isRecordNotFoundError(error)) {
                throw new NotFoundException(`User with id ${userId} was not found.`);
            }

            throw error;
        }
    }

    public async updateRole(userId: string, role: AppRole): Promise<UserRecord> {
        await this.ensureSeeded();

        try {
            const user = await this.prisma.user.update({
                where: {
                    id: userId,
                },
                data: {
                    role,
                },
                include: userWithPrimaryTeamInclude,
            });

            return mapDbUserToUserRecord(user);
        } catch (error: unknown) {
            if (isRecordNotFoundError(error)) {
                throw new NotFoundException(`User with id ${userId} was not found.`);
            }

            throw error;
        }
    }

    private async ensureSeeded(): Promise<void> {
        if (this.hasSeeded) {
            return;
        }

        this.seedPromise ??= this.seedDefaults();

        try {
            await this.seedPromise;
            this.hasSeeded = true;
        } catch (error: unknown) {
            this.seedPromise = null;
            throw error;
        }
    }

    private async seedDefaults(): Promise<void> {
        for (const teamName of DEFAULT_TEAM_NAMES) {
            await this.prisma.team.upsert({
                where: {
                    name: teamName,
                },
                create: {
                    name: teamName,
                },
                update: {},
            });
        }

        for (const seedUser of DEFAULT_SEED_USERS) {
            const team = await this.prisma.team.upsert({
                where: {
                    name: seedUser.teamName,
                },
                create: {
                    name: seedUser.teamName,
                },
                update: {},
            });

            const user = await this.prisma.user.upsert({
                where: {
                    email: normalizeEmail(seedUser.email),
                },
                create: {
                    name: seedUser.name,
                    email: normalizeEmail(seedUser.email),
                    passwordHash: seedUser.password,
                    birthDate: new Date(seedUser.birthDateIso),
                    role: seedUser.role,
                    approvalStatus: seedUser.approvalStatus,
                    approvedAt: seedUser.approvalStatus === "APPROVED" ? new Date() : null,
                },
                update: {
                    name: seedUser.name,
                    passwordHash: seedUser.password,
                    role: seedUser.role,
                    approvalStatus: seedUser.approvalStatus,
                    approvedAt: seedUser.approvalStatus === "APPROVED" ? new Date() : null,
                },
            });

            await this.prisma.userTeamMembership.upsert({
                where: {
                    userId_teamId: {
                        userId: user.id,
                        teamId: team.id,
                    },
                },
                create: {
                    userId: user.id,
                    teamId: team.id,
                },
                update: {},
            });
        }

        for (const badge of DEFAULT_SEED_BADGES) {
            await this.prisma.badgeDefinition.upsert({
                where: {
                    code: badge.code,
                },
                create: {
                    code: badge.code,
                    title: badge.title,
                    description: badge.description,
                    ruleJson: badge.ruleJson,
                },
                update: {
                    title: badge.title,
                    description: badge.description,
                    ruleJson: badge.ruleJson,
                },
            });
        }
    }
}

function normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
}

function normalizeTeamName(value: string): TeamName {
    const normalizedValue = value.trim().toUpperCase();

    if (!TEAM_OPTIONS.includes(normalizedValue as TeamName)) {
        throw new BadRequestException(`teamName must be one of: ${TEAM_OPTIONS.join(", ")}.`);
    }

    return normalizedValue as TeamName;
}

function mapDbUserToUserRecord(user: DbUserWithPrimaryTeam): UserRecord {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        teamName: user.teamMemberships[0]?.team.name ?? "Unassigned",
        passwordHash: user.passwordHash,
        birthDateIso: user.birthDate.toISOString().split("T")[0],
        role: user.role,
        approvalStatus: user.approvalStatus,
        createdAtIso: user.createdAt.toISOString(),
    };
}

function isRecordNotFoundError(error: unknown): boolean {
    if (typeof error !== "object" || error === null || !("code" in error)) {
        return false;
    }

    return error.code === "P2025";
}

function isDuplicateEmailError(error: unknown): boolean {
    if (typeof error !== "object" || error === null || !("code" in error)) {
        return false;
    }

    return error.code === "P2002";
}
