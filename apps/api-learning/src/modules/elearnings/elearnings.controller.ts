import type { ElearningSummary, ElearningView } from "@hackaithon/shared-types";
import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { parseActorRole } from "../../common/role-parser.js";
import { parseRequiredUserId } from "../../common/user-id-parser.js";

import { CreateElearningDto } from "./dto/create-elearning.dto.js";
import { UpdateElearningDto } from "./dto/update-elearning.dto.js";
import { ElearningsService } from "./elearnings.service.js";

@Controller("elearnings")
export class ElearningsController {
	public constructor(private readonly elearningsService: ElearningsService) {}

	@Post()
	public createElearning(
		@Body() payload: CreateElearningDto,
		@Query("actorRole") actorRoleParam: unknown,
		@Query("actorUserId") actorUserIdParam: unknown
	): Promise<ElearningView> {
		const actorRole = parseActorRole(actorRoleParam);
		const actorUserId = parseRequiredUserId(actorUserIdParam);

		return this.elearningsService.createElearning(payload, actorRole, actorUserId);
	}

	@Patch(":id")
	public updateElearning(
		@Param("id") elearningId: string,
		@Body() payload: UpdateElearningDto,
		@Query("actorRole") actorRoleParam: unknown,
		@Query("actorUserId") actorUserIdParam: unknown
	): Promise<ElearningView> {
		const actorRole = parseActorRole(actorRoleParam);
		const actorUserId = parseRequiredUserId(actorUserIdParam);

		return this.elearningsService.updateElearning(elearningId, payload, actorRole, actorUserId);
	}

	@Post(":id/publish")
	public publishElearning(
		@Param("id") elearningId: string,
		@Query("actorRole") actorRoleParam: unknown,
		@Query("actorUserId") actorUserIdParam: unknown
	): Promise<ElearningView> {
		const actorRole = parseActorRole(actorRoleParam);
		const actorUserId = parseRequiredUserId(actorUserIdParam);

		return this.elearningsService.publishElearning(elearningId, actorRole, actorUserId);
	}

	@Get("public")
	public listPublicElearnings(): Promise<ElearningSummary[]> {
		return this.elearningsService.listPublicElearnings();
	}

	@Get("manage")
	public listManagedElearnings(
		@Query("actorRole") actorRoleParam: unknown,
		@Query("actorUserId") actorUserIdParam: unknown
	): Promise<ElearningSummary[]> {
		const actorRole = parseActorRole(actorRoleParam);
		const actorUserId = parseRequiredUserId(actorUserIdParam);

		return this.elearningsService.listManagedElearnings(actorRole, actorUserId);
	}

	@Get(":id")
	public getElearningById(
		@Param("id") elearningId: string,
		@Query("actorRole") actorRoleParam: unknown,
		@Query("actorUserId") actorUserIdParam: unknown
	): Promise<ElearningView> {
		const actorRole = parseActorRole(actorRoleParam);
		const actorUserId = parseRequiredUserId(actorUserIdParam);

		return this.elearningsService.getElearningById(elearningId, actorRole, actorUserId);
	}
}
