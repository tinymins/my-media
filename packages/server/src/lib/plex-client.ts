/**
 * Plex Media Server API Client
 * 文档: https://www.plexapp.com/api/
 */

import type { MediaItem, MediaLibrary, MediaServerStatus } from "@acme/types";

export interface PlexServerConfig {
  url: string;
  token: string;
}

export interface PlexLibrarySection {
  key: string;
  title: string;
  type: string; // movie, show, artist, photo
  agent: string;
  scanner: string;
  language: string;
  uuid: string;
  updatedAt: number;
  scannedAt: number;
}

export interface PlexMediaItem {
  ratingKey: string;
  key: string;
  guid: string;
  type: string; // movie, show, episode, season
  title: string;
  originalTitle?: string;
  summary?: string;
  year?: number;
  thumb?: string;
  art?: string;
  duration?: number;
  addedAt?: number;
  updatedAt?: number;
  rating?: number;
  audienceRating?: number;
  contentRating?: string;
  Media?: PlexMediaInfo[];
}

export interface PlexMediaInfo {
  id: number;
  duration: number;
  bitrate: number;
  width: number;
  height: number;
  aspectRatio: number;
  audioChannels: number;
  audioCodec: string;
  videoCodec: string;
  videoResolution: string;
  container: string;
  videoFrameRate: string;
  Part?: PlexMediaPart[];
}

export interface PlexMediaPart {
  id: number;
  key: string;
  duration: number;
  file: string;
  size: number;
  container: string;
}

export class PlexClient {
  private baseUrl: string;
  private token: string;

  constructor(config: PlexServerConfig) {
    this.baseUrl = config.url.replace(/\/$/, "");
    this.token = config.token;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = new URL(path, this.baseUrl);
    url.searchParams.set("X-Plex-Token", this.token);

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        Accept: "application/json",
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Plex API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // 测试连接
  async testConnection(): Promise<MediaServerStatus> {
    try {
      const data = await this.request<{ MediaContainer: { machineIdentifier: string; version: string } }>("/");
      return {
        id: "",
        name: "",
        type: "plex",
        isConnected: true,
        version: data.MediaContainer.version
      };
    } catch (error) {
      return {
        id: "",
        name: "",
        type: "plex",
        isConnected: false,
        errorMessage: error instanceof Error ? error.message : "连接失败"
      };
    }
  }

  // 获取媒体库列表
  async getLibraries(): Promise<MediaLibrary[]> {
    const data = await this.request<{
      MediaContainer: { Directory: PlexLibrarySection[] }
    }>("/library/sections");

    return data.MediaContainer.Directory.map((lib) => ({
      id: lib.key,
      name: lib.title,
      type: lib.type
    }));
  }

  // 获取媒体库内容
  async getLibraryItems(libraryKey: string, start = 0, size = 50): Promise<MediaItem[]> {
    const data = await this.request<{
      MediaContainer: { Metadata: PlexMediaItem[] }
    }>(`/library/sections/${libraryKey}/all?X-Plex-Container-Start=${start}&X-Plex-Container-Size=${size}`);

    return (data.MediaContainer.Metadata || []).map((item) => this.transformMediaItem(item, libraryKey));
  }

  // 搜索媒体
  async search(query: string): Promise<MediaItem[]> {
    const data = await this.request<{
      MediaContainer: { Metadata?: PlexMediaItem[] }
    }>(`/search?query=${encodeURIComponent(query)}`);

    return (data.MediaContainer.Metadata || []).map((item) => this.transformMediaItem(item, ""));
  }

  // 刷新媒体库
  async refreshLibrary(libraryKey: string): Promise<void> {
    await this.request(`/library/sections/${libraryKey}/refresh`, { method: "GET" });
  }

  // 刷新单个媒体
  async refreshItem(ratingKey: string): Promise<void> {
    await this.request(`/library/metadata/${ratingKey}/refresh`, { method: "PUT" });
  }

  // 检查媒体是否存在（通过 IMDB ID 或 TMDB ID）
  async findByExternalId(imdbId?: string, tmdbId?: string): Promise<MediaItem | null> {
    if (!imdbId && !tmdbId) return null;

    // Plex 使用 GUID 格式: com.plexapp.agents.imdb://tt0111161
    // 或 plex://movie/5d776835880197001ec9038e
    const searchQueries = [];
    if (imdbId) searchQueries.push(`imdb://${imdbId}`);
    if (tmdbId) searchQueries.push(`tmdb://${tmdbId}`);

    for (const guid of searchQueries) {
      try {
        const data = await this.request<{
          MediaContainer: { Metadata?: PlexMediaItem[] }
        }>(`/library/all?guid=${encodeURIComponent(guid)}`);

        if (data.MediaContainer.Metadata?.length) {
          return this.transformMediaItem(data.MediaContainer.Metadata[0], "");
        }
      } catch {
        // 继续尝试下一个
      }
    }

    return null;
  }

  // 获取媒体详情
  async getItemDetails(ratingKey: string): Promise<MediaItem | null> {
    try {
      const data = await this.request<{
        MediaContainer: { Metadata: PlexMediaItem[] }
      }>(`/library/metadata/${ratingKey}`);

      if (data.MediaContainer.Metadata?.length) {
        return this.transformMediaItem(data.MediaContainer.Metadata[0], "");
      }
    } catch {
      return null;
    }
    return null;
  }

  // 转换 Plex 媒体项目为统一格式
  private transformMediaItem(item: PlexMediaItem, libraryKey: string): MediaItem {
    const media = item.Media?.[0];

    return {
      id: item.ratingKey,
      serverId: "",
      serverName: "",
      title: item.title,
      originalTitle: item.originalTitle,
      year: item.year,
      type: item.type as "movie" | "show" | "episode" | "season",
      posterUrl: item.thumb ? `${this.baseUrl}${item.thumb}?X-Plex-Token=${this.token}` : undefined,
      backdropUrl: item.art ? `${this.baseUrl}${item.art}?X-Plex-Token=${this.token}` : undefined,
      summary: item.summary,
      rating: item.rating,
      duration: item.duration,
      resolution: media ? `${media.width}x${media.height}` : undefined,
      videoCodec: media?.videoCodec,
      audioCodec: media?.audioCodec,
      container: media?.container,
      addedAt: item.addedAt ? new Date(item.addedAt * 1000).toISOString() : undefined
    };
  }
}

// 工厂函数
export const createPlexClient = (config: PlexServerConfig) => new PlexClient(config);
