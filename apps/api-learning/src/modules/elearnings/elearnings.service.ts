import {
	estimateElearningDurationMinutes,
	estimateSectionDurationMinutes,
	type AppRole,
	type ElearningSectionView,
	type ElearningSummary,
	type ElearningView,
} from "@hackaithon/shared-types";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { assertCanManageElearnings, canManageElearnings } from "../../common/superuser-policy.js";
import { PrismaService } from "../database/prisma.service.js";
import { UserRepository } from "../users/user.repository.js";

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

type DbSummaryAssignment = Pick<DbAssignment, "assignmentType" | "optionsJson" | "prompt">;

type DbSummarySection = Pick<DbSection, "content" | "id" | "title"> & {
	assignment: DbSummaryAssignment | null;
};

type DbElearning = {
	id: string;
	title: string;
	description: string;
	level: "JUNIOR" | "MEDIOR" | "SENIOR";
	status: "DRAFT" | "PUBLISHED";
	publishedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	createdById: string;
	sections: DbSection[];
};

type DbPublicElearning = {
	id: string;
	title: string;
	description: string;
	level: "JUNIOR" | "MEDIOR" | "SENIOR";
	status: "DRAFT" | "PUBLISHED";
	publishedAt: Date | null;
	sections: DbSummarySection[];
};

const elearningInclude = {
	sections: {
		include: {
			assignment: true,
		},
		orderBy: {
			orderIndex: "asc",
		},
	},
} as const;

const elearningSummaryInclude = {
	sections: {
		orderBy: {
			orderIndex: "asc",
		},
		select: {
			id: true,
			title: true,
			content: true,
			assignment: {
				select: {
					assignmentType: true,
					optionsJson: true,
					prompt: true,
				},
			},
		},
	},
} as const;

@Injectable()
export class ElearningsService {
	public constructor(
		private readonly prisma: PrismaService,
		private readonly userRepository: UserRepository
	) {}

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
				createdById: actorUserId,
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

		return mapDbElearningToView(elearning);
	}

	public async updateElearning(
		elearningId: string,
		payload: UpdateElearningDto,
		actorRole: AppRole,
		actorUserId: string
	): Promise<ElearningView> {
		assertCanManageElearnings(actorRole);
		await this.userRepository.findById(actorUserId);

		const existing = await this.prisma.elearning.findUnique({
			where: { id: elearningId },
			select: { id: true },
		});

		if (!existing) {
			throw new NotFoundException(`E-learning with id ${elearningId} was not found.`);
		}

		await this.prisma.elearning.update({
			where: {
				id: elearningId,
			},
			data: {
				title: payload.title?.trim(),
				description: payload.description?.trim(),
				level: payload.level,
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

		const elearning = await this.prisma.elearning.findUnique({
			where: {
				id: elearningId,
			},
			include: elearningInclude,
		});

		if (!elearning) {
			throw new NotFoundException(`E-learning with id ${elearningId} was not found.`);
		}

		return mapDbElearningToView(elearning);
	}

	public async publishElearning(elearningId: string, actorRole: AppRole, actorUserId: string): Promise<ElearningView> {
		assertCanManageElearnings(actorRole);
		await this.userRepository.findById(actorUserId);

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

			return mapDbElearningToView(elearning);
		} catch {
			throw new NotFoundException(`E-learning with id ${elearningId} was not found.`);
		}
	}

	public async listPublicElearnings(): Promise<ElearningSummary[]> {
		const elearnings: DbPublicElearning[] = await this.prisma.elearning.findMany({
			where: {
				status: "PUBLISHED",
			},
			include: elearningSummaryInclude,
			orderBy: {
				updatedAt: "desc",
			},
		});

		return elearnings.map(mapDbElearningToSummary);
	}

	public async listManagedElearnings(actorRole: AppRole, actorUserId: string): Promise<ElearningSummary[]> {
		assertCanManageElearnings(actorRole);
		await this.userRepository.findById(actorUserId);

		const elearnings: DbPublicElearning[] = await this.prisma.elearning.findMany({
			where: actorRole === "ADMIN" ? undefined : { createdById: actorUserId },
			include: elearningSummaryInclude,
			orderBy: {
				updatedAt: "desc",
			},
		});

		return elearnings.map(mapDbElearningToSummary);
	}

	public async getElearningById(elearningId: string, actorRole: AppRole, actorUserId: string): Promise<ElearningView> {
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

		return mapDbElearningToView(elearning);
	}
}

function mapDbElearningToView(dbElearning: DbElearning): ElearningView {
	const sections = dbElearning.sections.map(section => mapDbSectionToView(section, dbElearning.level));

	return {
		id: dbElearning.id,
		title: dbElearning.title,
		description: dbElearning.description,
		level: dbElearning.level,
		status: dbElearning.status,
		publishedAtIso: dbElearning.publishedAt ? dbElearning.publishedAt.toISOString() : null,
		createdAtIso: dbElearning.createdAt.toISOString(),
		updatedAtIso: dbElearning.updatedAt.toISOString(),
		createdById: dbElearning.createdById,
		estimatedDurationMinutes: estimateElearningDurationMinutes({
			description: dbElearning.description,
			level: dbElearning.level,
			sections,
		}),
		sections,
	};
}

function mapDbSectionToView(section: DbSection, level: DbElearning["level"]): ElearningSectionView {
	return {
		id: section.id,
		title: section.title,
		content: section.content,
		orderIndex: section.orderIndex,
		estimatedDurationMinutes: estimateSectionDurationMinutes(level, section),
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

function mapDbElearningToSummary(elearning: DbPublicElearning): ElearningSummary {
	return {
		id: elearning.id,
		title: elearning.title,
		description: elearning.description,
		level: elearning.level,
		status: elearning.status,
		sectionCount: elearning.sections.length,
		estimatedDurationMinutes: estimateElearningDurationMinutes({
			description: elearning.description,
			level: elearning.level,
			sections: elearning.sections,
		}),
		publishedAtIso: elearning.publishedAt ? elearning.publishedAt.toISOString() : null,
	};
}
