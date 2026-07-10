import type { AppRole, UserSummary } from "@hackaithon/shared-types";
import { Injectable } from "@nestjs/common";

import { assertSuperuser } from "../../common/superuser-policy.js";
import { mapUserToSummary } from "../../common/user-mapper.js";
import type { UpdateUserRoleDto } from "./dto/update-user-role.dto.js";
import { UserRepository } from "./user.repository.js";

@Injectable()
export class UsersService {
    public constructor(private readonly userRepository: UserRepository) { }

    public async listPendingUsers(actorRole: AppRole): Promise<UserSummary[]> {
        assertSuperuser(actorRole);

        const users = await this.userRepository.listByApprovalStatus("PENDING");

        return users.map(mapUserToSummary);
    }

    public async approveUser(userId: string, actorRole: AppRole): Promise<UserSummary> {
        assertSuperuser(actorRole);

        const user = await this.userRepository.updateApprovalStatus(userId, "APPROVED");

        return mapUserToSummary(user);
    }

    public async rejectUser(userId: string, actorRole: AppRole): Promise<UserSummary> {
        assertSuperuser(actorRole);

        const user = await this.userRepository.updateApprovalStatus(userId, "REJECTED");

        return mapUserToSummary(user);
    }

    public async changeRole(userId: string, actorRole: AppRole, payload: UpdateUserRoleDto): Promise<UserSummary> {
        assertSuperuser(actorRole);

        const user = await this.userRepository.updateRole(userId, payload.newRole);

        return mapUserToSummary(user);
    }
}
