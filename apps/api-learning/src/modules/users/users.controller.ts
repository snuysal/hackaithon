import type { UserSummary } from "@hackaithon/shared-types";
import { Body, Controller, Get, Patch, Param, Query } from "@nestjs/common";

import { parseActorRole } from "../../common/role-parser.js";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto.js";
import { UsersService } from "./users.service.js";

@Controller("admin/users")
export class UsersController {
    public constructor(private readonly usersService: UsersService) { }

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
}
