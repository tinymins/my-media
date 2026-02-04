/**
 * 通用 PT 站点客户端
 * 根据 YAML 配置文件动态解析站点 API
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import * as cheerio from "cheerio";

// 站点配置目录（通过环境变量配置，默认项目根目录下的 sites）
const SITES_CONFIG_DIR = process.env.SITES_CONFIG_DIR || path.resolve(__dirname, "../../../../sites");

// ============ 配置文件类型定义 ============

export interface SiteConfig {
  id: string;
  name: string;
  domain: string;
  encoding?: string;
  config_url?: string;
  allow_auth_type: ("cookies" | "api_key")[];

  // 用户信息配置 (HTML 解析方式)
  userinfo?: {
    path: string;
    item?: { selector: string };
    fields: Record<string, FieldConfig>;
  };

  // API 用户信息配置 (用于 API Key 认证的站点)
  api_userinfo?: {
    path: string;
    method?: "GET" | "POST";
    // 自定义请求头，支持模板变量 {{api_key}}
    headers?: Record<string, string>;
    // 请求体 (POST 时使用)
    body?: Record<string, unknown>;
    // 响应数据路径 (如 "data" 表示从 response.data 取值)
    data_path?: string;
    // 字段映射：key 是标准字段名，value 是 JSON path (支持嵌套如 "memberCount.uploaded")
    fields: Record<string, string>;
  };

  // API 搜索配置 (用于 API Key 认证的站点)
  api_search?: {
    path: string;
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    // 搜索请求体模板，{{keyword}} 会被替换
    body_template?: Record<string, unknown>;
    // 响应数据路径
    data_path?: string;
    // 种子列表路径（从 data 中取）
    list_path?: string;
    // 字段映射
    fields: Record<string, string>;
  };

  // 搜索配置 (HTML 解析方式)
  search?: {
    paths: Array<{
      path: string;
      categories?: (string | number)[];
    }>;
    query?: Record<string, string>;
  };

  // 分类映射
  category_mappings?: Array<{
    id: number;
    cate_level1: string;
    cate_level2: string;
    cate_level2_desc?: string;
  }>;
}

export interface FieldConfig {
  selector?: string;
  attribute?: string;
  method?: string;
  default_value?: string | number;
  optional?: boolean;
  filters?: Array<{
    name: string;
    args?: unknown[];
  }>;
  case?: Record<string, unknown>;
  text?: string;
}

// ============ 用户信息类型 ============

export interface PtSiteUserInfo {
  uid: string;
  username: string;
  uploaded: string;
  downloaded: string;
  shareRatio: string;
  seeding: number;
  leeching: number;
  vipGroup?: string;
  bonus?: string;
}

// ============ 搜索结果类型 ============

export interface PtSearchResult {
  id: string;
  title: string;
  subtitle?: string;
  size: string;
  sizeBytes?: number;
  seeders: number;
  leechers: number;
  grabs?: number;
  category?: string;
  uploadTime?: string;
  downloadUrl?: string;
  detailUrl?: string;
  posterUrl?: string;
  imdbUrl?: string;
  imdbRating?: string;
  doubanUrl?: string;
  doubanRating?: string;
  discount?: string; // FREE, PERCENT_50, PERCENT_70 等
  discountEndTime?: string;
  videoCodec?: string;
  audioCodec?: string;
  resolution?: string;
  source?: string;
}

// ============ 客户端实现 ============

export class PtSiteClient {
  private config: SiteConfig;
  private cookies?: string;
  private apiKey?: string;

  constructor(
    config: SiteConfig,
    auth: { cookies?: string; apiKey?: string }
  ) {
    this.config = config;
    this.cookies = auth.cookies;
    this.apiKey = auth.apiKey;
  }

  /**
   * 从 YAML 字符串解析配置
   */
  static parseConfig(yamlContent: string): SiteConfig {
    return yaml.load(yamlContent) as SiteConfig;
  }

  /**
   * 从本地文件加载配置（根据 siteId）
   */
  static loadConfigFromFile(siteId: string): SiteConfig {
    const filePath = path.join(SITES_CONFIG_DIR, `${siteId}.yml`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`站点配置文件不存在: ${filePath}`);
    }

    const yamlContent = fs.readFileSync(filePath, "utf-8");
    return PtSiteClient.parseConfig(yamlContent);
  }

  /**
   * 获取所有可用的站点配置
   */
  static listAvailableSites(): SiteConfig[] {
    if (!fs.existsSync(SITES_CONFIG_DIR)) {
      return [];
    }

    const files = fs.readdirSync(SITES_CONFIG_DIR).filter(f => f.endsWith(".yml"));
    const configs: SiteConfig[] = [];

    for (const file of files) {
      try {
        const filePath = path.join(SITES_CONFIG_DIR, file);
        const yamlContent = fs.readFileSync(filePath, "utf-8");
        configs.push(PtSiteClient.parseConfig(yamlContent));
      } catch (error) {
        console.error(`Failed to parse site config ${file}:`, error);
      }
    }

    return configs;
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const userInfo = await this.getUserInfo();
      return userInfo !== null;
    } catch {
      return false;
    }
  }

  /**
   * 搜索种子
   */
  async search(keyword: string): Promise<PtSearchResult[]> {
    console.log(`[PtSiteClient] Searching for: "${keyword}" on ${this.config.name}`);

    // 优先使用 API 方式
    if (this.apiKey && this.config.api_search) {
      return this.searchByApi(keyword);
    }

    // TODO: HTML 解析方式搜索
    console.log(`[PtSiteClient] No api_search config for ${this.config.name}, skipping`);
    return [];
  }

  /**
   * 通过 API 搜索
   */
  private async searchByApi(keyword: string): Promise<PtSearchResult[]> {
    const searchConfig = this.config.api_search;
    if (!searchConfig) return [];

    try {
      const url = this.buildUrl(searchConfig.path);

      // 构建请求头
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/json"
      };

      if (searchConfig.headers) {
        for (const [key, value] of Object.entries(searchConfig.headers)) {
          headers[key] = this.replaceTemplateVars(value);
        }
      }

      // 构建请求体，替换 {{keyword}}
      let body = {};
      if (searchConfig.body_template) {
        body = JSON.parse(
          JSON.stringify(searchConfig.body_template).replace(/\{\{keyword\}\}/g, keyword)
        );
      }

      console.log(`[PtSiteClient] API search request: POST ${url}`);
      console.log(`[PtSiteClient] API search body:`, JSON.stringify(body));

      const response = await fetch(url, {
        method: searchConfig.method || "POST",
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        console.error(`[PtSiteClient] Search API failed: ${response.status}`);
        return [];
      }

      const json = await response.json();
      console.log(`[PtSiteClient] Search API response code: ${json.code}, message: ${json.message}`);

      if (json.code && json.code !== "0" && json.code !== 0) {
        console.error(`[PtSiteClient] Search API error: ${json.message}`);
        return [];
      }

      // 获取数据
      let data = json;
      if (searchConfig.data_path) {
        data = this.getNestedValue(json, searchConfig.data_path);
      }

      // 获取列表
      let list = data;
      if (searchConfig.list_path) {
        list = this.getNestedValue(data, searchConfig.list_path);
      }

      if (!Array.isArray(list)) {
        console.error(`[PtSiteClient] Search result is not an array`);
        return [];
      }

      console.log(`[PtSiteClient] Found ${list.length} torrents`);

      // 打印第一条结果的完整数据用于调试
      if (list.length > 0) {
        console.log(`[PtSiteClient] Sample torrent data:`, JSON.stringify(list[0], null, 2));
      }

      // 映射结果
      return list.map((item: Record<string, unknown>) => this.mapSearchResult(item, searchConfig.fields));
    } catch (error) {
      console.error(`[PtSiteClient] Search error:`, error);
      return [];
    }
  }

  /**
   * 映射搜索结果
   */
  private mapSearchResult(
    item: Record<string, unknown>,
    fields: Record<string, string>
  ): PtSearchResult {
    const getValue = (path: string | undefined): unknown => {
      if (!path) return undefined;
      return this.getNestedValue(item, path);
    };

    const size = getValue(fields.size);
    const sizeNum = typeof size === "number" ? size : (typeof size === "string" ? parseInt(size, 10) : 0);

    return {
      id: String(getValue(fields.id) || ""),
      title: String(getValue(fields.title) || ""),
      subtitle: getValue(fields.subtitle) ? String(getValue(fields.subtitle)) : undefined,
      size: this.formatSize(size),
      sizeBytes: sizeNum || undefined,
      seeders: Number(getValue(fields.seeders)) || 0,
      leechers: Number(getValue(fields.leechers)) || 0,
      grabs: getValue(fields.grabs) ? Number(getValue(fields.grabs)) : undefined,
      category: String(getValue(fields.category) || ""),
      uploadTime: String(getValue(fields.upload_time) || ""),
      downloadUrl: String(getValue(fields.download_url) || ""),
      detailUrl: String(getValue(fields.detail_url) || ""),
      posterUrl: getValue(fields.poster_url) ? String(getValue(fields.poster_url)) : undefined,
      imdbUrl: getValue(fields.imdb_url) ? String(getValue(fields.imdb_url)) : undefined,
      imdbRating: getValue(fields.imdb_rating) ? String(getValue(fields.imdb_rating)) : undefined,
      doubanUrl: getValue(fields.douban_url) ? String(getValue(fields.douban_url)) : undefined,
      doubanRating: getValue(fields.douban_rating) ? String(getValue(fields.douban_rating)) : undefined,
      discount: getValue(fields.discount) ? String(getValue(fields.discount)) : undefined,
      discountEndTime: getValue(fields.discount_end_time) ? String(getValue(fields.discount_end_time)) : undefined,
      videoCodec: getValue(fields.video_codec) ? String(getValue(fields.video_codec)) : undefined,
      audioCodec: getValue(fields.audio_codec) ? String(getValue(fields.audio_codec)) : undefined,
      resolution: getValue(fields.resolution) ? String(getValue(fields.resolution)) : undefined,
      source: getValue(fields.source) ? String(getValue(fields.source)) : undefined
    };
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(): Promise<PtSiteUserInfo | null> {
    // 优先使用 API 方式（API Key 认证 + 有 api_userinfo 配置）
    if (this.apiKey && this.config.api_userinfo) {
      return this.getUserInfoByApi();
    }

    // 使用网页解析方式（需要有 userinfo 配置）
    if (this.config.userinfo) {
      // 优先使用 Cookie，但如果只有 API Key，也尝试用 API Key 访问网页
      if (this.cookies || this.apiKey) {
        return this.getUserInfoByHtml();
      }
    }

    console.error("getUserInfo: 缺少认证凭据或 userinfo 配置");
    return null;
  }

  /**
   * 通过 API 获取用户信息
   */
  private async getUserInfoByApi(): Promise<PtSiteUserInfo | null> {
    const apiConfig = this.config.api_userinfo;
    if (!apiConfig) return null;

    try {
      const url = this.buildUrl(apiConfig.path);

      // 构建请求头
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/json"
      };

      // 应用配置中的自定义 headers，支持模板变量
      if (apiConfig.headers) {
        for (const [key, value] of Object.entries(apiConfig.headers)) {
          headers[key] = this.replaceTemplateVars(value);
        }
      }

      // 构建请求选项
      const fetchOptions: RequestInit = {
        method: apiConfig.method || "POST",
        headers
      };

      // POST 请求时添加 body
      if (fetchOptions.method === "POST") {
        fetchOptions.body = JSON.stringify(apiConfig.body ?? {});
      }

      console.log(`[PtSiteClient] API request: ${fetchOptions.method} ${url}`);
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        console.error(`[PtSiteClient] API request failed: ${response.status} ${response.statusText}`);
        throw new Error(`API request failed: ${response.status}`);
      }

      const json = await response.json();
      console.log(`[PtSiteClient] API response:`, JSON.stringify(json).substring(0, 500));

      // 检查 API 返回的错误码
      if (json.code && json.code !== "0" && json.code !== 0) {
        console.error(`[PtSiteClient] API error: code=${json.code}, message=${json.message}`);
        throw new Error(json.message || `API error: ${json.code}`);
      }

      // 从 data_path 取数据（如 "data" -> json.data）
      let data = json;
      if (apiConfig.data_path) {
        data = this.getNestedValue(json, apiConfig.data_path);
      }

      if (!data) {
        console.error("[PtSiteClient] API response data is empty");
        return null;
      }

      // 根据配置映射字段
      return this.mapApiUserInfo(data, apiConfig.fields);
    } catch (error) {
      console.error("Failed to get user info by API:", error);
      return null;
    }
  }

  /**
   * 替换模板变量 (如 {{api_key}})
   */
  private replaceTemplateVars(template: string): string {
    return template
      .replace(/\{\{api_key\}\}/g, this.apiKey || "")
      .replace(/\{\{cookies\}\}/g, this.cookies || "");
  }

  /**
   * 从嵌套对象中获取值 (支持 "data.user.name" 这样的路径)
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    const parts = path.split(".");
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === "object") {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return current;
  }

  /**
   * 通过 HTML 解析获取用户信息
   */
  private async getUserInfoByHtml(): Promise<PtSiteUserInfo | null> {
    const userinfoConfig = this.config.userinfo;
    if (!userinfoConfig) return null;

    try {
      const url = this.buildUrl(userinfoConfig.path);
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      };

      // 优先使用 Cookie 认证
      if (this.cookies) {
        headers["Cookie"] = this.cookies;
      }
      // 如果有 API Key，也添加到 header
      if (this.apiKey) {
        headers["x-api-key"] = this.apiKey;
      }

      console.log(`[PtSiteClient] Fetching userinfo from: ${url}`);
      const response = await fetch(url, { headers });

      if (!response.ok) {
        console.error(`[PtSiteClient] HTTP request failed: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP request failed: ${response.status}`);
      }

      const html = await response.text();
      console.log(`[PtSiteClient] Response length: ${html.length} bytes`);
      // 打印部分 HTML 用于调试
      console.log(`[PtSiteClient] HTML preview: ${html.substring(0, 500)}...`);

      const $ = cheerio.load(html);

      // 获取目标元素
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let $context: any = $("body");
      if (userinfoConfig.item?.selector) {
        $context = $(userinfoConfig.item.selector);
        console.log(`[PtSiteClient] Context selector: ${userinfoConfig.item.selector}, found: ${$context.length}`);
      }

      // 解析各字段
      const fields = userinfoConfig.fields;
      const uid = this.extractField($, $context, fields.uid) || "0";
      const username = this.extractField($, $context, fields.username) || "未知";
      const uploaded = this.extractField($, $context, fields.uploaded) || "0";
      const downloaded = this.extractField($, $context, fields.downloaded) || "0";
      const shareRatio = this.extractField($, $context, fields.share_ratio) || "0";
      const seeding = parseInt(this.extractField($, $context, fields.seeding) || "0", 10);
      const leeching = parseInt(this.extractField($, $context, fields.leeching) || "0", 10);
      const vipGroup = this.extractField($, $context, fields.vip_group || fields.user_group);
      const bonus = this.extractField($, $context, fields.bonus);

      console.log(`[PtSiteClient] Parsed userinfo: uid=${uid}, username=${username}, uploaded=${uploaded}, downloaded=${downloaded}`);

      return {
        uid,
        username,
        uploaded: this.formatSize(uploaded),
        downloaded: this.formatSize(downloaded),
        shareRatio: this.formatRatio(shareRatio),
        seeding,
        leeching,
        vipGroup,
        bonus
      };
    } catch (error) {
      console.error("Failed to get user info by HTML:", error);
      return null;
    }
  }

  /**
   * 从 HTML 中提取字段值
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractField(
    $: any,
    $context: any,
    fieldConfig?: FieldConfig
  ): string | undefined {
    if (!fieldConfig) return undefined;

    // 处理 case 条件
    if (fieldConfig.case) {
      for (const [selector, value] of Object.entries(fieldConfig.case)) {
        if (selector === "*") {
          return String(value);
        }
        if ($context.find(selector).length > 0 || $(selector).length > 0) {
          return String(value);
        }
      }
      return undefined;
    }

    // 处理 text 模板（暂时简化处理）
    if (fieldConfig.text) {
      return fieldConfig.text;
    }

    if (!fieldConfig.selector) {
      return fieldConfig.default_value?.toString();
    }

    let $el = $context.find(fieldConfig.selector);
    if ($el.length === 0) {
      $el = $(fieldConfig.selector);
    }

    if ($el.length === 0) {
      return fieldConfig.default_value?.toString();
    }

    let value: string;

    // 处理 method
    if (fieldConfig.method === "next_sibling") {
      const nextNode = $el[0]?.nextSibling;
      value = nextNode?.type === "text" ? (nextNode as unknown as Text).data?.trim() || "" : "";
    } else if (fieldConfig.attribute) {
      value = $el.attr(fieldConfig.attribute) || "";
    } else {
      value = $el.text().trim();
    }

    // 应用过滤器
    if (fieldConfig.filters) {
      value = this.applyFilters(value, fieldConfig.filters);
    }

    return value || fieldConfig.default_value?.toString();
  }

  /**
   * 应用过滤器
   */
  private applyFilters(
    value: string,
    filters: Array<{ name: string; args?: unknown[] }>
  ): string {
    for (const filter of filters) {
      switch (filter.name) {
        case "re_search": {
          const [pattern, group = 0] = filter.args || [];
          const regex = new RegExp(pattern as string);
          const match = value.match(regex);
          value = match ? match[group as number] || "" : "";
          break;
        }
        case "replace": {
          const [search, replacement] = filter.args || [];
          value = value.replace(search as string, replacement as string);
          break;
        }
        case "querystring": {
          const param = filter.args?.[0] as string;
          try {
            const url = new URL(value, "http://dummy");
            value = url.searchParams.get(param) || "";
          } catch {
            value = "";
          }
          break;
        }
        // 可以继续添加更多过滤器...
      }
    }
    return value;
  }

  /**
   * 映射 API 返回的用户信息
   */
  private mapApiUserInfo(
    json: Record<string, unknown>,
    fieldMapping: Record<string, string>
  ): PtSiteUserInfo {
    const getValue = (path: string | undefined): unknown => {
      if (!path) return undefined;
      const parts = path.split(".");
      let current: unknown = json;
      for (const part of parts) {
        if (current && typeof current === "object") {
          current = (current as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }
      return current;
    };

    const uploaded = getValue(fieldMapping.uploaded);
    const downloaded = getValue(fieldMapping.downloaded);
    const shareRatio = getValue(fieldMapping.share_ratio ?? fieldMapping.shareRatio);

    return {
      uid: String(getValue(fieldMapping.uid) || "0"),
      username: String(getValue(fieldMapping.username) || "未知"),
      uploaded: this.formatSize(uploaded),
      downloaded: this.formatSize(downloaded),
      shareRatio: this.formatRatio(shareRatio),
      seeding: Number(getValue(fieldMapping.seeding)) || 0,
      leeching: Number(getValue(fieldMapping.leeching)) || 0,
      vipGroup: String(getValue(fieldMapping.vip_group ?? fieldMapping.vipGroup) || ""),
      bonus: String(getValue(fieldMapping.bonus) || "0")
    };
  }

  /**
   * 格式化大小
   */
  private formatSize(value: unknown): string {
    if (typeof value === "string") {
      // 已经是格式化的字符串
      if (/^\d+(\.\d+)?\s*(B|KB|MB|GB|TB|PB)$/i.test(value)) {
        return value;
      }
      // 尝试解析为数字
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return this.bytesToString(num);
      }
      return value;
    }
    if (typeof value === "number") {
      return this.bytesToString(value);
    }
    return "0 B";
  }

  /**
   * 字节数转可读字符串
   */
  private bytesToString(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(2)} ${units[i]}`;
  }

  /**
   * 格式化分享率
   */
  private formatRatio(value: unknown): string {
    if (typeof value === "string") {
      if (value === "inf" || value === "∞" || value === "無限") {
        return "∞";
      }
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return num.toFixed(3);
      }
      return value;
    }
    if (typeof value === "number") {
      if (value === Infinity || value > 10000) return "∞";
      return value.toFixed(3);
    }
    return "0.000";
  }

  /**
   * 构建完整 URL
   */
  private buildUrl(path: string): string {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    const base = this.config.domain.endsWith("/")
      ? this.config.domain
      : `${this.config.domain}/`;
    return `${base}${path.startsWith("/") ? path.slice(1) : path}`;
  }
}

// ============ 辅助函数 ============

/**
 * 格式化字节数为人类可读的大小
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(2)} ${units[i]}`;
}

/**
 * 格式化分享率
 */
export function formatRatio(ratio: number): string {
  if (ratio === Infinity || ratio > 10000) return "∞";
  if (ratio === 0) return "0.000";
  return ratio.toFixed(3);
}
