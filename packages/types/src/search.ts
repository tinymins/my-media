import { z } from "zod";
import { MediaItemSchema } from "./media-server";
import { PtTorrentSchema } from "./pt-site";

// TMDB 搜索结果
export const TmdbMediaSchema = z.object({
  id: z.number(),
  mediaType: z.enum(["movie", "tv"]),
  title: z.string(),
  originalTitle: z.string().optional(),
  overview: z.string().optional(),
  posterPath: z.string().nullable().optional(),
  backdropPath: z.string().nullable().optional(),
  releaseDate: z.string().optional(),
  voteAverage: z.number().optional(),
  voteCount: z.number().optional(),
  popularity: z.number().optional(),
  originalLanguage: z.string().optional(),
  genreIds: z.array(z.number()).optional()
});

export type TmdbMedia = z.infer<typeof TmdbMediaSchema>;

// TMDB 详情
export const TmdbMediaDetailSchema = TmdbMediaSchema.extend({
  imdbId: z.string().nullable().optional(),
  runtime: z.number().optional(), // 电影时长
  status: z.string().optional(),
  tagline: z.string().optional(),
  budget: z.number().optional(),
  revenue: z.number().optional(),
  homepage: z.string().optional(),
  numberOfSeasons: z.number().optional(), // 剧集季数
  numberOfEpisodes: z.number().optional(), // 剧集总集数
  genres: z.array(z.object({
    id: z.number(),
    name: z.string()
  })).optional(),
  productionCompanies: z.array(z.object({
    id: z.number(),
    name: z.string(),
    logoPath: z.string().nullable().optional()
  })).optional()
});

export type TmdbMediaDetail = z.infer<typeof TmdbMediaDetailSchema>;

// 聚合搜索输入
export const SearchInputSchema = z.object({
  keyword: z.string().min(1, "搜索关键词不能为空"),
  year: z.number().optional(),
  mediaType: z.enum(["all", "movie", "tv"]).default("all"),
  sources: z.object({
    ptSites: z.boolean().default(true),
    mediaServers: z.boolean().default(true),
    tmdb: z.boolean().default(true)
  }).optional()
});

export type SearchInput = z.infer<typeof SearchInputSchema>;

// PT 站点搜索输入
export const PtSearchInputSchema = z.object({
  keyword: z.string().min(1),
  siteIds: z.array(z.string()).optional(), // 指定站点，不传则搜索所有启用站点
  category: z.enum(["all", "movie", "tv", "anime", "music"]).default("all")
});

export type PtSearchInput = z.infer<typeof PtSearchInputSchema>;

// 聚合搜索结果
export const SearchResultSchema = z.object({
  keyword: z.string(),
  // PT 站点结果
  ptResults: z.array(PtTorrentSchema),
  // 媒体服务器结果
  mediaResults: z.array(MediaItemSchema),
  // TMDB 结果
  tmdbResults: z.array(TmdbMediaSchema),
  // 搜索耗时
  timeTaken: z.number() // 毫秒
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

// 一键下载输入
export const QuickDownloadInputSchema = z.object({
  torrent: PtTorrentSchema,
  downloadClientId: z.string().optional(), // 不传则使用默认下载器
  savePath: z.string().optional(), // 不传则使用默认路径
  category: z.string().optional()
});

export type QuickDownloadInput = z.infer<typeof QuickDownloadInputSchema>;
