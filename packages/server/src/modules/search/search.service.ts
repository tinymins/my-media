import { db } from "../../db/client";
import { ptSites, mediaServers } from "../../db/schema";
import { eq } from "drizzle-orm";
import { TmdbClient } from "../../lib/tmdb-client";
import type { PtTorrent, MediaItem, TmdbMedia, SearchResult } from "@acme/types";

/**
 * 搜索服务
 * 聚合搜索 PT 站点、媒体服务器和 TMDB
 */
export class SearchService {
  /**
   * 聚合搜索
   */
  async search(userId: string, keyword: string): Promise<SearchResult> {
    const startTime = Date.now();

    // 并行搜索所有来源
    const [ptResults, mediaResults, tmdbResults] = await Promise.all([
      this.searchPtSites(userId, keyword),
      this.searchMediaServers(userId, keyword),
      this.searchTmdb(keyword)
    ]);

    const timeTaken = Date.now() - startTime;

    return {
      keyword,
      ptResults,
      mediaResults,
      tmdbResults,
      timeTaken
    };
  }

  /**
   * 搜索 PT 站点
   */
  async searchPtSites(userId: string, keyword: string): Promise<PtTorrent[]> {
    // 获取启用的 PT 站点
    const sites = await db
      .select()
      .from(ptSites)
      .where(eq(ptSites.isEnabled, true));

    if (sites.length === 0) {
      return [];
    }

    // TODO: 实现实际的 PT 站点搜索逻辑
    // 需要根据各站点的 YAML 描述文件解析搜索接口
    // 这里返回空数组作为占位
    return [];
  }

  /**
   * 搜索媒体服务器
   */
  async searchMediaServers(userId: string, keyword: string): Promise<MediaItem[]> {
    // 获取启用的媒体服务器
    const servers = await db
      .select()
      .from(mediaServers)
      .where(eq(mediaServers.isEnabled, true));

    if (servers.length === 0) {
      return [];
    }

    // TODO: 实现实际的媒体服务器搜索逻辑
    // 需要调用 Plex/Emby/Jellyfin API
    // 这里返回空数组作为占位
    return [];
  }

  /**
   * 搜索 TMDB
   */
  async searchTmdb(keyword: string): Promise<TmdbMedia[]> {
    // 检查是否配置了 TMDB API Key
    const tmdbApiKey = process.env.TMDB_API_KEY;
    if (!tmdbApiKey) {
      return [];
    }

    try {
      const client = new TmdbClient({ apiKey: tmdbApiKey, language: "zh-CN" });
      const results = await client.searchMulti(keyword);
      return results;
    } catch (error) {
      console.error("TMDB search error:", error);
      return [];
    }
  }
}

export const searchService = new SearchService();
