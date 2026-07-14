import type { UserSummary } from "@hackaithon/shared-types";
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Param, Query } from "@nestjs/common";

import { parseActorRole } from "../../common/role-parser.js";
import { parseRequiredUserId } from "../../common/user-id-parser.js";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto.js";
import { UsersService } from "./users.service.js";

@Controller("admin/users")
export class UsersController {
    public constructor(private readonly usersService: UsersService) { }

    @Get()
    public listUsers(@Query("actorRole") actorRoleParam: unknown): Promise<UserSummary[]> {
        const actorRole = parseActorRole(actorRoleParam);

        return this.usersService.listUsers(actorRole);
    }

    @Get("pending")
    public listPendingUsers(@Query("actorRole") actorRoleParam: unknown): Promise<UserSummary[]> {
        const actorRole = parseActorRole(actorRoleParam);

        return this.usersService.listPendingUsers(actorRole);
    }

    @Patch(":id/approve")
    public approveUser(@Param("id") userId: string, @Query("actorRole") actorRoleParam: unknown): Promise<UserSummary> {
        const actorRole = parseActorRole(actorRoleParam);

        return this.usersService.approveUser(userId, actorRole);
    }

    @Patch(":id/reject")
    public rejectUser(@Param("id") userId: string, @Query("actorRole") actorRoleParam: unknown): Promise<UserSummary> {
        const actorRole = parseActorRole(actorRoleParam);

        return this.usersService.rejectUser(userId, actorRole);
    }

    @Patch(":id/role")
    public changeRole(
        @Param("id") userId: string,
        @Query("actorRole") actorRoleParam: unknown,
        @Body() payload: UpdateUserRoleDto
    ): Promise<UserSummary> {
        const actorRole = parseActorRole(actorRoleParam);

        return this.usersService.changeRole(userId, actorRole, payload);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    public deleteUser(
        @Param("id") userId: string,
        @Query("actorRole") actorRoleParam: unknown,
        @Query("actorUserId") actorUserIdParam: unknown
    ): Promise<void> {
        const actorRole = parseActorRole(actorRoleParam);
        const actorUserId = parseRequiredUserId(actorUserIdParam);

        return this.usersService.deleteUser(userId, actorRole, actorUserId);
    }
}
