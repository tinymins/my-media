/**
 * qBittorrent Web API Client
 * 文档: https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)
 */

import type { TorrentInfo, TorrentState, DownloadClientStatus, AddTorrentInput } from "@acme/types";

export interface QBittorrentConfig {
  url: string;
  username?: string;
  password?: string;
}

interface QBTorrentInfo {
  hash: string;
  name: string;
  size: number;
  progress: number;
  dlspeed: number;
  upspeed: number;
  downloaded: number;
  uploaded: number;
  ratio: number;
  state: string;
  category: string;
  tags: string;
  save_path: string;
  added_on: number;
  completion_on: number;
  seeding_time: number;
  eta: number;
  num_seeds: number;
  num_leechs: number;
  tracker: string;
}

interface QBMainData {
  server_state: {
    free_space_on_disk: number;
    dl_info_speed: number;
    up_info_speed: number;
  };
  torrents: Record<string, QBTorrentInfo>;
}

// qBittorrent 状态映射
const stateMapping: Record<string, TorrentState> = {
  allocating: "checkingDL",
  checkingDL: "checkingDL",
  checkingResumeData: "checkingDL",
  checkingUP: "checkingUP",
  downloading: "downloading",
  error: "error",
  forcedDL: "downloading",
  forcedUP: "uploading",
  metaDL: "downloading",
  missingFiles: "missingFiles",
  moving: "downloading",
  pausedDL: "pausedDL",
  pausedUP: "pausedUP",
  queuedDL: "queuedDL",
  queuedUP: "queuedUP",
  stalledDL: "stalledDL",
  stalledUP: "stalledUP",
  uploading: "seeding",
  unknown: "unknown"
};

export class QBittorrentClient {
  private baseUrl: string;
  private username?: string;
  private password?: string;
  private cookie: string | null = null;

  constructor(config: QBittorrentConfig) {
    this.baseUrl = config.url.replace(/\/$/, "");
    this.username = config.username;
    this.password = config.password;
  }

  private async request<T>(
    path: string,
    options?: RequestInit & { form?: Record<string, string | Blob> }
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v2${path}`;

    let body: BodyInit | undefined;
    const headers: Record<string, string> = {};

    if (options?.form) {
      const formData = new FormData();
      for (const [key, value] of Object.entries(options.form)) {
        formData.append(key, value);
      }
      body = formData;
    } else if (options?.body) {
      body = options.body;
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    if (this.cookie) {
      headers["Cookie"] = this.cookie;
    }

    const response = await fetch(url, {
      ...options,
      body,
      headers: {
        ...headers,
        ...options?.headers
      }
    });

    // 保存 cookie
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      this.cookie = setCookie.split(";")[0];
    }

    if (!response.ok) {
      if (response.status === 403) {
        // 重新登录
        this.cookie = null;
        await this.login();
        return this.request(path, options);
      }
      throw new Error(`qBittorrent API error: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return response.json();
    }

    return response.text() as unknown as T;
  }

  // 登录
  async login(): Promise<boolean> {
    if (!this.username || !this.password) {
      return true; // 不需要认证
    }

    const response = await fetch(`${this.baseUrl}/api/v2/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}`
    });

    if (!response.ok) {
      throw new Error("qBittorrent 登录失败");
    }

    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      this.cookie = setCookie.split(";")[0];
    }

    const text = await response.text();
    return text === "Ok.";
  }

  // 测试连接
  async testConnection(): Promise<DownloadClientStatus> {
    try {
      if (this.username && this.password) {
        await this.login();
      }

      const version = await this.request<string>("/app/version");
      const mainData = await this.request<QBMainData>("/sync/maindata");

      const torrents = Object.values(mainData.torrents || {});
      const downloading = torrents.filter((t) =>
        ["downloading", "forcedDL", "metaDL", "stalledDL", "queuedDL"].includes(t.state)
      ).length;
      const seeding = torrents.filter((t) =>
        ["uploading", "forcedUP", "stalledUP", "queuedUP"].includes(t.state)
      ).length;

      return {
        id: "",
        name: "",
        type: "qbittorrent",
        isConnected: true,
        version,
        freeSpace: mainData.server_state?.free_space_on_disk,
        totalDownloading: downloading,
        totalSeeding: seeding,
        downloadSpeed: mainData.server_state?.dl_info_speed,
        uploadSpeed: mainData.server_state?.up_info_speed
      };
    } catch (error) {
      return {
        id: "",
        name: "",
        type: "qbittorrent",
        isConnected: false,
        errorMessage: error instanceof Error ? error.message : "连接失败"
      };
    }
  }

  // 获取所有种子列表
  async getTorrents(filter?: string, category?: string): Promise<TorrentInfo[]> {
    const params = new URLSearchParams();
    if (filter) params.set("filter", filter);
    if (category) params.set("category", category);

    const torrents = await this.request<QBTorrentInfo[]>(
      `/torrents/info${params.toString() ? `?${params}` : ""}`
    );

    return torrents.map((t) => this.transformTorrent(t));
  }

  // 获取单个种子详情
  async getTorrent(hash: string): Promise<TorrentInfo | null> {
    const torrents = await this.request<QBTorrentInfo[]>(`/torrents/info?hashes=${hash}`);
    if (torrents.length === 0) return null;
    return this.transformTorrent(torrents[0]);
  }

  // 添加种子
  async addTorrent(input: {
    urls?: string[];
    torrents?: string[]; // Base64 encoded torrent files
    savePath?: string;
    category?: string;
    tags?: string[];
    paused?: boolean;
    skipHashCheck?: boolean;
  }): Promise<void> {
    const formData: Record<string, string | Blob> = {};

    if (input.urls?.length) {
      formData.urls = input.urls.join("\n");
    }

    if (input.torrents?.length) {
      // 将 Base64 转换为 Blob
      for (let i = 0; i < input.torrents.length; i++) {
        const base64 = input.torrents[i];
        const binary = Buffer.from(base64, "base64");
        formData[`torrents_${i}`] = new Blob([binary], { type: "application/x-bittorrent" });
      }
    }

    if (input.savePath) formData.savepath = input.savePath;
    if (input.category) formData.category = input.category;
    if (input.tags?.length) formData.tags = input.tags.join(",");
    if (input.paused) formData.paused = "true";
    if (input.skipHashCheck) formData.skip_checking = "true";

    await this.request("/torrents/add", {
      method: "POST",
      form: formData
    });
  }

  // 暂停种子
  async pauseTorrents(hashes: string[]): Promise<void> {
    await this.request("/torrents/pause", {
      method: "POST",
      body: `hashes=${hashes.join("|")}`
    });
  }

  // 恢复种子
  async resumeTorrents(hashes: string[]): Promise<void> {
    await this.request("/torrents/resume", {
      method: "POST",
      body: `hashes=${hashes.join("|")}`
    });
  }

  // 删除种子
  async deleteTorrents(hashes: string[], deleteFiles = false): Promise<void> {
    await this.request("/torrents/delete", {
      method: "POST",
      body: `hashes=${hashes.join("|")}&deleteFiles=${deleteFiles}`
    });
  }

  // 设置种子分类
  async setCategory(hashes: string[], category: string): Promise<void> {
    await this.request("/torrents/setCategory", {
      method: "POST",
      body: `hashes=${hashes.join("|")}&category=${encodeURIComponent(category)}`
    });
  }

  // 获取所有分类
  async getCategories(): Promise<Record<string, { name: string; savePath: string }>> {
    return this.request("/torrents/categories");
  }

  // 创建分类
  async createCategory(name: string, savePath?: string): Promise<void> {
    await this.request("/torrents/createCategory", {
      method: "POST",
      body: `category=${encodeURIComponent(name)}${savePath ? `&savePath=${encodeURIComponent(savePath)}` : ""}`
    });
  }

  // 获取全局传输信息
  async getTransferInfo(): Promise<{
    dlSpeed: number;
    upSpeed: number;
    freeSpace: number;
  }> {
    const data = await this.request<{
      dl_info_speed: number;
      up_info_speed: number;
      free_space_on_disk: number;
    }>("/transfer/info");

    return {
      dlSpeed: data.dl_info_speed,
      upSpeed: data.up_info_speed,
      freeSpace: data.free_space_on_disk
    };
  }

  // 转换种子信息为统一格式
  private transformTorrent(t: QBTorrentInfo): TorrentInfo {
    return {
      hash: t.hash,
      name: t.name,
      size: t.size,
      progress: t.progress,
      downloadSpeed: t.dlspeed,
      uploadSpeed: t.upspeed,
      downloaded: t.downloaded,
      uploaded: t.uploaded,
      ratio: t.ratio,
      state: stateMapping[t.state] || "unknown",
      category: t.category || undefined,
      tags: t.tags ? t.tags.split(",").filter(Boolean) : undefined,
      savePath: t.save_path,
      addedOn: t.added_on,
      completedOn: t.completion_on || undefined,
      seedingTime: t.seeding_time,
      eta: t.eta > 0 ? t.eta : undefined,
      numSeeds: t.num_seeds,
      numLeeches: t.num_leechs,
      tracker: t.tracker || undefined
    };
  }
}

// 工厂函数
export const createQBittorrentClient = (config: QBittorrentConfig) => new QBittorrentClient(config);
