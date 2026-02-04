import { db } from "../../db/client";
import { ptSites, mediaServers } from "../../db/schema";
import { eq } from "drizzle-orm";
import { TmdbClient } from "../../lib/tmdb-client";
import { PtSiteClient } from "../../lib/pt-site-client";
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

    // 并行搜索所有站点
    const allResults: PtTorrent[] = [];

    for (const site of sites) {
      try {
        // 加载站点配置
        const config = PtSiteClient.loadConfigFromFile(site.siteId);

        // 创建客户端
        const client = new PtSiteClient(config, {
          cookies: site.cookies ?? undefined,
          apiKey: site.apiKey ?? undefined
        });

        // 搜索
        const results = await client.search(keyword);

        // 转换为 PtTorrent 格式
        for (const result of results) {
          // 解析折扣信息
          const { downloadVolumeFactor, uploadVolumeFactor } = this.parseDiscount(result.discount);

          allResults.push({
            id: result.id,
            siteId: site.siteId,
            siteName: site.name,
            title: result.title,
            subtitle: result.subtitle,
            size: result.size,
            sizeBytes: result.sizeBytes,
            seeders: result.seeders,
            leechers: result.leechers,
            grabs: result.grabs,
            category: result.category || undefined,
            uploadDate: result.uploadTime || undefined,
            downloadUrl: result.downloadUrl || "",
            detailsUrl: result.detailUrl ? `https://kp.m-team.cc/detail/${result.detailUrl}` : undefined,
            posterUrl: result.posterUrl,
            imdbId: result.imdbUrl ? this.extractImdbId(result.imdbUrl) : undefined,
            imdbRating: result.imdbRating,
            doubanId: result.doubanUrl ? this.extractDoubanId(result.doubanUrl) : undefined,
            doubanRating: result.doubanRating,
            downloadVolumeFactor,
            uploadVolumeFactor,
            discountEndTime: result.discountEndTime,
            videoCodec: this.mapVideoCodec(result.videoCodec),
            audioCodec: this.mapAudioCodec(result.audioCodec),
            resolution: this.mapResolution(result.resolution),
            source: result.source
          });
        }
      } catch (error) {
        // 单个站点搜索失败不影响其他站点
      }
    }

    return allResults;
  }

  /**
   * 解析折扣信息
   */
  private parseDiscount(discount?: string): { downloadVolumeFactor?: number; uploadVolumeFactor?: number } {
    if (!discount) return {};

    switch (discount) {
      case "FREE":
        return { downloadVolumeFactor: 0 };
      case "PERCENT_50":
        return { downloadVolumeFactor: 0.5 };
      case "PERCENT_70":
        return { downloadVolumeFactor: 0.3 };
      case "_2X_FREE":
        return { downloadVolumeFactor: 0, uploadVolumeFactor: 2 };
      case "_2X_PERCENT_50":
        return { downloadVolumeFactor: 0.5, uploadVolumeFactor: 2 };
      case "_2X":
        return { uploadVolumeFactor: 2 };
      default:
        return {};
    }
  }

  /**
   * 从 IMDB URL 提取 ID
   */
  private extractImdbId(url: string): string | undefined {
    const match = url.match(/tt\d+/);
    return match ? match[0] : undefined;
  }

  /**
   * 从豆瓣 URL 提取 ID
   */
  private extractDoubanId(url: string): string | undefined {
    const match = url.match(/subject\/(\d+)/);
    return match ? match[1] : undefined;
  }

  /**
   * M-Team 视频编码映射
   */
  private mapVideoCodec(code?: string): string | undefined {
    if (!code) return undefined;
    const map: Record<string, string> = {
      "1": "H.264",
      "2": "VC-1",
      "3": "MPEG-2",
      "4": "XviD",
      "5": "H.265",
      "6": "AV1"
    };
    return map[code] || code;
  }

  /**
   * M-Team 音频编码映射
   */
  private mapAudioCodec(code?: string): string | undefined {
    if (!code) return undefined;
    const map: Record<string, string> = {
      "1": "DTS",
      "2": "AC3",
      "3": "AAC",
      "4": "LPCM",
      "5": "FLAC",
      "6": "APE",
      "7": "DTS-HD MA",
      "8": "TrueHD",
      "9": "TrueHD Atmos",
      "10": "DTS-X",
      "11": "DTS-HD MA",
      "12": "Other"
    };
    return map[code] || code;
  }

  /**
   * M-Team 分辨率映射
   */
  private mapResolution(code?: string): string | undefined {
    if (!code) return undefined;
    const map: Record<string, string> = {
      "1": "1080p",
      "2": "1080i",
      "3": "720p",
      "4": "SD",
      "5": "4K",
      "6": "2160p"
    };
    return map[code] || code;
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
    } catch {
      return [];
    }
  }
}

export const searchService = new SearchService();
