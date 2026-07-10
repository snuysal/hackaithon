import { Module } from "@nestjs/common";

import { UsersModule } from "../users/users.module.js";
import { ElearningsController } from "./elearnings.controller.js";
import { ElearningsService } from "./elearnings.service.js";

@Module({
    imports: [UsersModule],
    controllers: [ElearningsController],
    providers: [ElearningsService],
    exports: [ElearningsService],
})
export class ElearningsModule { }
