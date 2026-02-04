import { z } from "zod";

// PT/BT 站点认证类型
export const PtSiteAuthTypeSchema = z.enum(["cookies", "api_key"]);
export type PtSiteAuthType = z.infer<typeof PtSiteAuthTypeSchema>;

// PT 站点配置
export const PtSiteSchema = z.object({
  id: z.string(),
  name: z.string(),
  siteId: z.string(),
  domain: z.string(),
  authType: PtSiteAuthTypeSchema,
  cookies: z.string().nullable().optional(),
  apiKey: z.string().nullable().optional(),
  configYaml: z.string().nullable().optional(),
  configUrl: z.string().nullable().optional(),
  isEnabled: z.boolean(),
  lastCheckedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type PtSite = z.infer<typeof PtSiteSchema>;

// 创建 PT 站点输入
export const CreatePtSiteInputSchema = z.object({
  name: z.string().min(1, "站点名称不能为空"),
  siteId: z.string().min(1, "站点标识不能为空"),
  domain: z.string().url("请输入有效的域名"),
  authType: PtSiteAuthTypeSchema.default("cookies"),
  cookies: z.string().optional(),
  apiKey: z.string().optional(),
  configYaml: z.string().optional(),
  configUrl: z.string().url().optional(),
  isEnabled: z.boolean().default(true)
});

export type CreatePtSiteInput = z.infer<typeof CreatePtSiteInputSchema>;

// 更新 PT 站点输入
export const UpdatePtSiteInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  domain: z.string().url().optional(),
  authType: PtSiteAuthTypeSchema.optional(),
  cookies: z.string().nullable().optional(),
  apiKey: z.string().nullable().optional(),
  configYaml: z.string().nullable().optional(),
  configUrl: z.string().url().nullable().optional(),
  isEnabled: z.boolean().optional()
});

export type UpdatePtSiteInput = z.infer<typeof UpdatePtSiteInputSchema>;

// PT 站点搜索结果（种子）
export const PtTorrentSchema = z.object({
  id: z.string(),
  siteId: z.string(),
  siteName: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  category: z.string().optional(),
  detailsUrl: z.string().optional(),
  downloadUrl: z.string(),
  posterUrl: z.string().optional(),
  imdbId: z.string().optional(),
  size: z.string(),
  sizeBytes: z.number().optional(),
  seeders: z.number(),
  leechers: z.number(),
  grabs: z.number().optional(),
  uploadDate: z.string().optional(),
  downloadVolumeFactor: z.number().optional(), // 下载折扣 0=免费
  uploadVolumeFactor: z.number().optional(), // 上传折扣
  tags: z.array(z.string()).optional() // 标签: 免费, 2x上传 等
});

export type PtTorrent = z.infer<typeof PtTorrentSchema>;

// PT 站点用户信息
export const PtUserInfoSchema = z.object({
  uid: z.string().optional(),
  username: z.string().optional(),
  uploaded: z.string().optional(),
  downloaded: z.string().optional(),
  shareRatio: z.string().optional(),
  seeding: z.number().optional(),
  leeching: z.number().optional(),
  vipGroup: z.string().optional(),
  bonus: z.string().optional()
});

export type PtUserInfo = z.infer<typeof PtUserInfoSchema>;

// PT 站点状态（包含用户信息）
export const PtSiteStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  siteId: z.string(),
  isLoggedIn: z.boolean(),
  userInfo: PtUserInfoSchema.nullable().optional(),
  lastCheckedAt: z.string().nullable().optional(),
  errorMessage: z.string().optional()
});

export type PtSiteStatus = z.infer<typeof PtSiteStatusSchema>;
