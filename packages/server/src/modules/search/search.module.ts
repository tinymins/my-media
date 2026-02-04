import { Module } from "@nestjs/common";
import { SearchRouter } from "./search.router";
import { SearchService } from "./search.service";

@Module({
  providers: [SearchService, SearchRouter],
  exports: [SearchService, SearchRouter]
})
export class SearchModule {}
