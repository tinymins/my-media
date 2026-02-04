import { z } from "zod";
import { SearchInputSchema, SearchResultSchema } from "@acme/types";
import { Router, Mutation, Ctx, UseMiddlewares } from "../../trpc/decorators";
import { requireUser } from "../../trpc/middlewares";
import type { Context } from "../../trpc/context";
import { searchService } from "./search.service";

@Router({ alias: "search" })
export class SearchRouter {
  /**
   * 聚合搜索
   * 搜索 PT 站点、媒体服务器和 TMDB
   */
  @Mutation({
    input: SearchInputSchema,
    output: SearchResultSchema
  })
  @UseMiddlewares(requireUser)
  async search(input: z.infer<typeof SearchInputSchema>, @Ctx() ctx: Context) {
    return searchService.search(ctx.userId!, input.keyword);
  }
}
