import { Module } from "@nestjs/common";

import { UserRepository } from "./user.repository.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

@Module({
    controllers: [UsersController],
    providers: [UserRepository, UsersService],
    exports: [UserRepository, UsersService],
})
export class UsersModule { }
