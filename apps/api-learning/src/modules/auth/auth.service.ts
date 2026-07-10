import type { AuthUserView, LoginResponse, SignupResponse } from "@hackaithon/shared-types";
import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";

import { mapUserToAuthView } from "../../common/user-mapper.js";
import { UserRepository } from "../users/user.repository.js";
import type { LoginDto } from "./dto/login.dto.js";
import type { SignupDto } from "./dto/signup.dto.js";

@Injectable()
export class AuthService {
    public constructor(private readonly userRepository: UserRepository) { }

    public async signup(payload: SignupDto): Promise<SignupResponse> {
        const normalizedEmail = payload.email.trim().toLowerCase();
        const existingUser = await this.userRepository.findByEmail(normalizedEmail);

        if (existingUser) {
            throw new ConflictException("A user with this e-mail address already exists.");
        }

        const user = await this.userRepository.createParticipant({
            name: payload.name,
            email: normalizedEmail,
            teamName: payload.teamName,
            birthDateIso: payload.birthDateIso,
            password: payload.password,
        });

        return {
            user: mapUserToAuthView(user),
            message: "Account created. Your account must be approved by an admin.",
        };
    }

    public async login(payload: LoginDto): Promise<LoginResponse> {
        const normalizedEmail = payload.email.trim().toLowerCase();
        const user = await this.userRepository.findByEmail(normalizedEmail);

        if (!user || user.passwordHash !== payload.password) {
            throw new UnauthorizedException("Invalid e-mail or password.");
        }

        return {
            sessionToken: buildSessionToken(user.id),
            user: mapUserToAuthView(user),
            nextRoute: user.approvalStatus === "APPROVED" ? "/dashboard" : "/pending-approval",
        };
    }

    public async me(userIdValue: unknown): Promise<AuthUserView> {
        if (typeof userIdValue !== "string" || userIdValue.trim().length === 0) {
            throw new BadRequestException("userId query parameter is required.");
        }

        const user = await this.userRepository.findById(userIdValue);

        return mapUserToAuthView(user);
    }
}

function buildSessionToken(userId: string): string {
    return Buffer.from(`${userId}:${Date.now()}`, "utf-8").toString("base64url");
}
