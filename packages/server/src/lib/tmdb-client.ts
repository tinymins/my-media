/**
 * TMDB (The Movie Database) API Client
 * 文档: https://developer.themoviedb.org/docs
 */

import type { TmdbMedia, TmdbMediaDetail } from "@acme/types";

export interface TmdbConfig {
  apiKey: string;
  language?: string; // 默认 zh-CN
  baseUrl?: string;
  imageBaseUrl?: string;
}

interface TmdbSearchResult {
  page: number;
  results: TmdbMediaItem[];
  total_pages: number;
  total_results: number;
}

interface TmdbMediaItem {
  id: number;
  media_type?: string;
  title?: string; // 电影
  name?: string; // 剧集
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string; // 电影
  first_air_date?: string; // 剧集
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  original_language?: string;
  genre_ids?: number[];
}

interface TmdbMovieDetail extends TmdbMediaItem {
  imdb_id?: string;
  runtime?: number;
  status?: string;
  tagline?: string;
  budget?: number;
  revenue?: number;
  homepage?: string;
  genres?: Array<{ id: number; name: string }>;
  production_companies?: Array<{ id: number; name: string; logo_path?: string | null }>;
}

interface TmdbTvDetail extends TmdbMediaItem {
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  tagline?: string;
  homepage?: string;
  genres?: Array<{ id: number; name: string }>;
  production_companies?: Array<{ id: number; name: string; logo_path?: string | null }>;
  external_ids?: { imdb_id?: string };
}

export class TmdbClient {
  private apiKey: string;
  private language: string;
  private baseUrl: string;
  private imageBaseUrl: string;

  constructor(config: TmdbConfig) {
    this.apiKey = config.apiKey;
    this.language = config.language || "zh-CN";
    this.baseUrl = config.baseUrl || "https://api.themoviedb.org/3";
    this.imageBaseUrl = config.imageBaseUrl || "https://image.tmdb.org/t/p";
  }

  private async request<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("language", this.language);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // 多类型搜索（电影+剧集）
  async searchMulti(query: string, page = 1): Promise<TmdbMedia[]> {
    const data = await this.request<TmdbSearchResult>("/search/multi", {
      query,
      page: page.toString(),
      include_adult: "false"
    });

    return data.results
      .filter((item) => item.media_type === "movie" || item.media_type === "tv")
      .map((item) => this.transformMedia(item));
  }

  // 搜索电影
  async searchMovies(query: string, year?: number, page = 1): Promise<TmdbMedia[]> {
    const params: Record<string, string> = {
      query,
      page: page.toString(),
      include_adult: "false"
    };
    if (year) params.year = year.toString();

    const data = await this.request<TmdbSearchResult>("/search/movie", params);

    return data.results.map((item) => this.transformMedia({ ...item, media_type: "movie" }));
  }

  // 搜索剧集
  async searchTv(query: string, year?: number, page = 1): Promise<TmdbMedia[]> {
    const params: Record<string, string> = {
      query,
      page: page.toString(),
      include_adult: "false"
    };
    if (year) params.first_air_date_year = year.toString();

    const data = await this.request<TmdbSearchResult>("/search/tv", params);

    return data.results.map((item) => this.transformMedia({ ...item, media_type: "tv" }));
  }

  // 获取电影详情
  async getMovieDetail(movieId: number): Promise<TmdbMediaDetail> {
    const data = await this.request<TmdbMovieDetail>(`/movie/${movieId}`);

    return {
      ...this.transformMedia({ ...data, media_type: "movie" }),
      imdbId: data.imdb_id,
      runtime: data.runtime,
      status: data.status,
      tagline: data.tagline,
      budget: data.budget,
      revenue: data.revenue,
      homepage: data.homepage,
      genres: data.genres,
      productionCompanies: data.production_companies?.map((c) => ({
        id: c.id,
        name: c.name,
        logoPath: c.logo_path ? `${this.imageBaseUrl}/w200${c.logo_path}` : null
      }))
    };
  }

  // 获取剧集详情
  async getTvDetail(tvId: number): Promise<TmdbMediaDetail> {
    const data = await this.request<TmdbTvDetail>(`/tv/${tvId}`, {
      append_to_response: "external_ids"
    });

    return {
      ...this.transformMedia({ ...data, media_type: "tv" }),
      imdbId: data.external_ids?.imdb_id,
      status: data.status,
      tagline: data.tagline,
      homepage: data.homepage,
      numberOfSeasons: data.number_of_seasons,
      numberOfEpisodes: data.number_of_episodes,
      genres: data.genres,
      productionCompanies: data.production_companies?.map((c) => ({
        id: c.id,
        name: c.name,
        logoPath: c.logo_path ? `${this.imageBaseUrl}/w200${c.logo_path}` : null
      }))
    };
  }

  // 通过 IMDB ID 查找
  async findByImdbId(imdbId: string): Promise<TmdbMedia | null> {
    const data = await this.request<{
      movie_results: TmdbMediaItem[];
      tv_results: TmdbMediaItem[];
    }>(`/find/${imdbId}`, { external_source: "imdb_id" });

    if (data.movie_results.length > 0) {
      return this.transformMedia({ ...data.movie_results[0], media_type: "movie" });
    }
    if (data.tv_results.length > 0) {
      return this.transformMedia({ ...data.tv_results[0], media_type: "tv" });
    }

    return null;
  }

  // 获取热门电影
  async getPopularMovies(page = 1): Promise<TmdbMedia[]> {
    const data = await this.request<TmdbSearchResult>("/movie/popular", {
      page: page.toString()
    });

    return data.results.map((item) => this.transformMedia({ ...item, media_type: "movie" }));
  }

  // 获取热门剧集
  async getPopularTv(page = 1): Promise<TmdbMedia[]> {
    const data = await this.request<TmdbSearchResult>("/tv/popular", {
      page: page.toString()
    });

    return data.results.map((item) => this.transformMedia({ ...item, media_type: "tv" }));
  }

  // 获取图片 URL
  getPosterUrl(posterPath: string | null, size: "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original" = "w500"): string | undefined {
    if (!posterPath) return undefined;
    return `${this.imageBaseUrl}/${size}${posterPath}`;
  }

  getBackdropUrl(backdropPath: string | null, size: "w300" | "w780" | "w1280" | "original" = "w1280"): string | undefined {
    if (!backdropPath) return undefined;
    return `${this.imageBaseUrl}/${size}${backdropPath}`;
  }

  // 转换媒体信息为统一格式
  private transformMedia(item: TmdbMediaItem): TmdbMedia {
    const isMovie = item.media_type === "movie";

    return {
      id: item.id,
      mediaType: isMovie ? "movie" : "tv",
      title: isMovie ? item.title! : item.name!,
      originalTitle: isMovie ? item.original_title : item.original_name,
      overview: item.overview,
      posterPath: item.poster_path ? `${this.imageBaseUrl}/w500${item.poster_path}` : null,
      backdropPath: item.backdrop_path ? `${this.imageBaseUrl}/w1280${item.backdrop_path}` : null,
      releaseDate: isMovie ? item.release_date : item.first_air_date,
      voteAverage: item.vote_average,
      voteCount: item.vote_count,
      popularity: item.popularity,
      originalLanguage: item.original_language,
      genreIds: item.genre_ids
    };
  }
}

// 工厂函数
export const createTmdbClient = (config: TmdbConfig) => new TmdbClient(config);

// 默认实例（需要配置 API Key）
let defaultTmdbClient: TmdbClient | null = null;

export const getTmdbClient = (apiKey?: string): TmdbClient => {
  if (!defaultTmdbClient && apiKey) {
    defaultTmdbClient = new TmdbClient({ apiKey });
  }
  if (!defaultTmdbClient) {
    throw new Error("TMDB API Key not configured");
  }
  return defaultTmdbClient;
};
