import type { AppRole, UserSummary } from "@hackaithon/shared-types";
import { BadRequestException, Injectable } from "@nestjs/common";

import { assertSuperuser } from "../../common/superuser-policy.js";
import { isSystemUserEmail } from "../../common/system-users.js";
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

    public async listUsers(actorRole: AppRole): Promise<UserSummary[]> {
        assertSuperuser(actorRole);

        const users = await this.userRepository.listAll();

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

    public async deleteUser(userId: string, actorRole: AppRole, actorUserId: string): Promise<void> {
        assertSuperuser(actorRole);

        if (userId === actorUserId) {
            throw new BadRequestException("Je kunt je eigen beheerdersaccount niet verwijderen.");
        }

        const [actor, target] = await Promise.all([
            this.userRepository.findById(actorUserId),
            this.userRepository.findById(userId),
        ]);
        assertSuperuser(actor.role);

        if (isSystemUserEmail(target.email)) {
            throw new BadRequestException("Een standaardaccount kan niet worden verwijderd.");
        }

        await this.userRepository.deleteUser(userId, actorUserId);
    }
}
