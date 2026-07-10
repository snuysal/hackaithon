import type {
    AppRole,
    ElearningAuditLogView,
    ElearningOwnerView,
    ElearningSectionView,
    ElearningSummary,
    ElearningView,
    ManagedElearningView,
} from "@hackaithon/shared-types";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { assertCanManageElearnings, canManageElearnings, isSuperuser } from "../../common/superuser-policy.js";
import { UserRepository } from "../users/user.repository.js";
import { PrismaService } from "../database/prisma.service.js";
import type { AddElearningOwnerDto } from "./dto/add-elearning-owner.dto.js";
import type { CreateElearningDto } from "./dto/create-elearning.dto.js";
import type { UpdateElearningDto } from "./dto/update-elearning.dto.js";

type DbAssignment = {
    id: string;
    assignmentType: "QUIZ" | "OPEN_TEXT";
    prompt: string;
    optionsJson: string | null;
    correctAnswerJson: string | null;
    points: number;
    configJson: string | null;
};

type DbSection = {
    id: string;
    title: string;
    content: string;
    orderIndex: number;
    assignment: DbAssignment | null;
};

type DbElearning = {
    id: string;
    title: string;
    description: string;
    level: "JUNIOR" | "MEDIOR" | "SENIOR";
    status: "DRAFT" | "PUBLISHED";
    visibility: "PUBLIC" | "INTERNAL";
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    createdById: string;
    owners: DbOwner[];
    auditLogs: DbAuditLog[];
    sections: DbSection[];
};

type DbOwner = {
    addedAt: Date;
    user: {
        id: string;
        name: string;
        email: string;
        role: AppRole;
    };
};

type DbAuditLog = {
    id: string;
    action: string;
    summary: string;
    createdAt: Date;
    actorUser: {
        id: string;
        name: string;
    };
};

type DbPublicElearning = {
    id: string;
    title: string;
    description: string;
    level: "JUNIOR" | "MEDIOR" | "SENIOR";
    status: "DRAFT" | "PUBLISHED";
    visibility: "PUBLIC" | "INTERNAL";
    publishedAt: Date | null;
    sections: Array<{ id: string }>;
};

const elearningInclude = {
    owners: {
        include: {
            user: true,
        },
        orderBy: {
            addedAt: "asc",
        },
    },
    auditLogs: {
        include: {
            actorUser: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    },
    sections: {
        include: {
            assignment: true,
        },
        orderBy: {
            orderIndex: "asc",
        },
    },
} as const;

@Injectable()
export class ElearningsService {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly userRepository: UserRepository
    ) { }

    public async createElearning(
        payload: CreateElearningDto,
        actorRole: AppRole,
        actorUserId: string
    ): Promise<ElearningView> {
        assertCanManageElearnings(actorRole);
        await this.userRepository.findById(actorUserId);

        const elearning = await this.prisma.elearning.create({
            data: {
                title: payload.title.trim(),
                description: payload.description.trim(),
                level: payload.level,
                visibility: payload.visibility,
                createdById: actorUserId,
                owners: {
                    create: {
                        userId: actorUserId,
                    },
                },
                sections: {
                    create: payload.sections.map((section, index) => ({
                        title: section.title.trim(),
                        content: section.content,
                        orderIndex: index,
                        assignment: section.assignment
                            ? {
                                create: {
                                    assignmentType: section.assignment.assignmentType,
                                    prompt: section.assignment.prompt,
                                    optionsJson: section.assignment.optionsJson ?? null,
                                    correctAnswerJson: section.assignment.correctAnswerJson ?? null,
                                    points: section.assignment.points ?? 0,
                                    configJson: section.assignment.configJson ?? null,
                                },
                            }
                            : undefined,
                    })),
                },
            },
            include: elearningInclude,
        });

        await this.createAuditLog(elearning.id, actorUserId, "ELEARNING_CREATED", `Created training ${elearning.title}.`);

        const managedElearning = await this.getManagedElearningRecord(elearning.id);

        return mapManagedElearningToView(managedElearning);
    }

    public async updateElearning(
        elearningId: string,
        payload: UpdateElearningDto,
        actorRole: AppRole,
        actorUserId: string
    ): Promise<ElearningView> {
        await this.assertElearningWriteAccess(elearningId, actorRole, actorUserId);

        await this.prisma.elearning.update({
            where: {
                id: elearningId,
            },
            data: {
                title: payload.title?.trim(),
                description: payload.description?.trim(),
                level: payload.level,
                visibility: payload.visibility,
            },
        });

        if (payload.sections) {
            await this.prisma.elearningSection.deleteMany({
                where: {
                    elearningId,
                },
            });

            for (const [index, section] of payload.sections.entries()) {
                await this.prisma.elearningSection.create({
                    data: {
                        elearningId,
                        title: section.title.trim(),
                        content: section.content,
                        orderIndex: index,
                        assignment: section.assignment
                            ? {
                                create: {
                                    assignmentType: section.assignment.assignmentType,
                                    prompt: section.assignment.prompt,
                                    optionsJson: section.assignment.optionsJson ?? null,
                                    correctAnswerJson: section.assignment.correctAnswerJson ?? null,
                                    points: section.assignment.points ?? 0,
                                    configJson: section.assignment.configJson ?? null,
                                },
                            }
                            : undefined,
                    },
                });
            }
        }

        await this.createAuditLog(elearningId, actorUserId, "ELEARNING_UPDATED", `Updated training ${elearningId}.`);

        const elearning = await this.getManagedElearningRecord(elearningId);

        return mapManagedElearningToView(elearning);
    }

    public async publishElearning(elearningId: string, actorRole: AppRole, actorUserId: string): Promise<ElearningView> {
        await this.assertElearningWriteAccess(elearningId, actorRole, actorUserId);

        try {
            const elearning = await this.prisma.elearning.update({
                where: {
                    id: elearningId,
                },
                data: {
                    status: "PUBLISHED",
                    publishedAt: new Date(),
                },
                include: elearningInclude,
            });

            await this.createAuditLog(elearningId, actorUserId, "ELEARNING_PUBLISHED", `Published training ${elearning.title}.`);

            return mapManagedElearningToView(elearning);
        } catch {
            throw new NotFoundException(`E-learning with id ${elearningId} was not found.`);
        }
    }

    public async listManageableElearnings(actorRole: AppRole, actorUserId: string): Promise<ManagedElearningView[]> {
        assertCanManageElearnings(actorRole);
        await this.userRepository.findById(actorUserId);

        const elearnings = await this.prisma.elearning.findMany({
            where: isSuperuser(actorRole)
                ? undefined
                : {
                    OR: [{ createdById: actorUserId }, { owners: { some: { userId: actorUserId } } }],
                },
            include: elearningInclude,
            orderBy: {
                updatedAt: "desc",
            },
        });

        return elearnings.map(mapManagedElearningToView);
    }

    public async listPublicElearnings(): Promise<ElearningSummary[]> {
        const elearnings: DbPublicElearning[] = await this.prisma.elearning.findMany({
            where: {
                status: "PUBLISHED",
                visibility: "PUBLIC",
            },
            include: {
                sections: {
                    select: {
                        id: true,
                    },
                },
            },
            orderBy: {
                updatedAt: "desc",
            },
        });

        return elearnings.map(elearning => ({
            id: elearning.id,
            title: elearning.title,
            description: elearning.description,
            level: elearning.level,
            status: elearning.status,
            visibility: elearning.visibility,
            sectionCount: elearning.sections.length,
            publishedAtIso: elearning.publishedAt ? elearning.publishedAt.toISOString() : null,
        }));
    }

    public async getElearningById(
        elearningId: string,
        actorRole: AppRole,
        actorUserId: string
    ): Promise<ElearningView> {
        await this.userRepository.findById(actorUserId);

        const elearning = await this.prisma.elearning.findUnique({
            where: {
                id: elearningId,
            },
            include: elearningInclude,
        });

        if (!elearning) {
            throw new NotFoundException(`E-learning with id ${elearningId} was not found.`);
        }

        if (elearning.status === "DRAFT" && !canManageElearnings(actorRole)) {
            throw new ForbiddenException("Draft e-learnings can only be viewed by ADMIN or TRAINER.");
        }

        return mapManagedElearningToView(elearning);
    }

    public async deleteElearning(elearningId: string, actorRole: AppRole, actorUserId: string): Promise<{ deleted: true }> {
        const elearning = await this.assertElearningWriteAccess(elearningId, actorRole, actorUserId);
        await this.createAuditLog(elearningId, actorUserId, "ELEARNING_DELETED", `Deleted training ${elearning.title}.`);
        await this.prisma.elearning.delete({
            where: {
                id: elearningId,
            },
        });
        return { deleted: true };
    }

    public async addOwner(
        elearningId: string,
        payload: AddElearningOwnerDto,
        actorRole: AppRole,
        actorUserId: string
    ): Promise<ManagedElearningView> {
        const elearning = await this.assertElearningWriteAccess(elearningId, actorRole, actorUserId);
        const ownerUser = await this.userRepository.findByEmail(payload.ownerEmail.trim().toLowerCase());

        if (!ownerUser) {
            throw new NotFoundException(`User with e-mail ${payload.ownerEmail} was not found.`);
        }

        if (ownerUser.role !== "TRAINER" && ownerUser.role !== "ADMIN") {
            throw new ForbiddenException("Only TRAINER or ADMIN users can be added as training owners.");
        }

        await this.prisma.elearningOwner.upsert({
            where: {
                elearningId_userId: {
                    elearningId,
                    userId: ownerUser.id,
                },
            },
            create: {
                elearningId,
                userId: ownerUser.id,
            },
            update: {},
        });

        await this.createAuditLog(
            elearningId,
            actorUserId,
            "ELEARNING_OWNER_ADDED",
            `Added ${ownerUser.email} as co-owner for training ${elearning.title}.`
        );

        const managedElearning = await this.getManagedElearningRecord(elearningId);
        return mapManagedElearningToView(managedElearning);
    }

    public async getElearningLogs(
        elearningId: string,
        actorRole: AppRole,
        actorUserId: string
    ): Promise<ElearningAuditLogView[]> {
        const elearning = await this.assertElearningWriteAccess(elearningId, actorRole, actorUserId);
        return elearning.auditLogs.map(mapAuditLogToView);
    }

    private async assertElearningWriteAccess(elearningId: string, actorRole: AppRole, actorUserId: string): Promise<DbElearning> {
        assertCanManageElearnings(actorRole);
        await this.userRepository.findById(actorUserId);

        const elearning = await this.prisma.elearning.findUnique({
            where: {
                id: elearningId,
            },
            include: elearningInclude,
        });

        if (!elearning) {
            throw new NotFoundException(`E-learning with id ${elearningId} was not found.`);
        }

        if (isSuperuser(actorRole)) {
            return elearning;
        }

        const isOwner = elearning.createdById === actorUserId || elearning.owners.some(owner => owner.user.id === actorUserId);

        if (!isOwner) {
            throw new ForbiddenException("Only training owners or ADMIN can modify this training.");
        }

        return elearning;
    }

    private async getManagedElearningRecord(elearningId: string): Promise<DbElearning> {
        const elearning = await this.prisma.elearning.findUnique({
            where: {
                id: elearningId,
            },
            include: elearningInclude,
        });

        if (!elearning) {
            throw new NotFoundException(`E-learning with id ${elearningId} was not found.`);
        }

        return elearning;
    }

    private async createAuditLog(elearningId: string, actorUserId: string, action: string, summary: string): Promise<void> {
        await this.prisma.elearningAuditLog.create({
            data: {
                elearningId,
                actorUserId,
                action,
                summary,
            },
        });
    }
}

function mapDbElearningToView(dbElearning: DbElearning): ElearningView {
    return {
        id: dbElearning.id,
        title: dbElearning.title,
        description: dbElearning.description,
        level: dbElearning.level,
        status: dbElearning.status,
        visibility: dbElearning.visibility,
        publishedAtIso: dbElearning.publishedAt ? dbElearning.publishedAt.toISOString() : null,
        createdAtIso: dbElearning.createdAt.toISOString(),
        updatedAtIso: dbElearning.updatedAt.toISOString(),
        createdById: dbElearning.createdById,
        sections: dbElearning.sections.map(mapDbSectionToView),
    };
}

function mapManagedElearningToView(dbElearning: DbElearning): ManagedElearningView {
    return {
        ...mapDbElearningToView(dbElearning),
        owners: dbElearning.owners.map(mapOwnerToView),
        logs: dbElearning.auditLogs.map(mapAuditLogToView),
    };
}

function mapOwnerToView(owner: DbOwner): ElearningOwnerView {
    return {
        userId: owner.user.id,
        name: owner.user.name,
        email: owner.user.email,
        role: owner.user.role,
        addedAtIso: owner.addedAt.toISOString(),
    };
}

function mapAuditLogToView(log: DbAuditLog): ElearningAuditLogView {
    return {
        id: log.id,
        actorUserId: log.actorUser.id,
        actorName: log.actorUser.name,
        action: log.action,
        summary: log.summary,
        createdAtIso: log.createdAt.toISOString(),
    };
}

function mapDbSectionToView(section: DbSection): ElearningSectionView {
    return {
        id: section.id,
        title: section.title,
        content: section.content,
        orderIndex: section.orderIndex,
        assignment: section.assignment
            ? {
                id: section.assignment.id,
                assignmentType: section.assignment.assignmentType,
                prompt: section.assignment.prompt,
                optionsJson: section.assignment.optionsJson,
                correctAnswerJson: section.assignment.correctAnswerJson,
                points: section.assignment.points,
                configJson: section.assignment.configJson,
            }
            : null,
    };
}
