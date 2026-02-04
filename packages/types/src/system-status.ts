import { z } from "zod";
import { MediaServerStatusSchema } from "./media-server";
import { DownloadClientStatusSchema } from "./download-client";

// PT 站点连接状态
export const PtSiteConnectionStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  siteId: z.string(),
  isConnected: z.boolean(),
  isEnabled: z.boolean(),
  lastCheckedAt: z.string().nullable(),
  errorMessage: z.string().optional()
});

export type PtSiteConnectionStatus = z.infer<typeof PtSiteConnectionStatusSchema>;

// TMDB 状态
export const TmdbStatusSchema = z.object({
  isConfigured: z.boolean(),
  isConnected: z.boolean(),
  errorMessage: z.string().optional()
});

export type TmdbStatus = z.infer<typeof TmdbStatusSchema>;

// 完整系统状态
export const SystemStatusSchema = z.object({
  mediaServers: z.array(MediaServerStatusSchema),
  downloadClients: z.array(DownloadClientStatusSchema),
  ptSites: z.array(PtSiteConnectionStatusSchema),
  tmdb: TmdbStatusSchema
});

export type SystemStatus = z.infer<typeof SystemStatusSchema>;
