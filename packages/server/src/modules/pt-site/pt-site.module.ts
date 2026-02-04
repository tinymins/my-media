import { Module } from "@nestjs/common";
import { PtSiteRouter } from "./pt-site.router";
import { PtSiteService } from "./pt-site.service";

@Module({
  providers: [PtSiteService, PtSiteRouter],
  exports: [PtSiteService, PtSiteRouter]
})
export class PtSiteModule {}
