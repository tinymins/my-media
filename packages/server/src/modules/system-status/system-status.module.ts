import { Module } from "@nestjs/common";
import { SystemStatusRouter } from "./system-status.router";

@Module({
  providers: [SystemStatusRouter],
  exports: [SystemStatusRouter]
})
export class SystemStatusModule {}
