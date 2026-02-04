import { Module } from "@nestjs/common";
import { DownloadClientRouter } from "./download-client.router";
import { DownloadClientService } from "./download-client.service";

@Module({
  providers: [DownloadClientService, DownloadClientRouter],
  exports: [DownloadClientService, DownloadClientRouter]
})
export class DownloadClientModule {}
