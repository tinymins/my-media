import { useState, useMemo, useEffect } from "react";
import { Button, Card, Col, Empty, Image, Input, Row, Select, Space, Spin, Tabs, Tag, Typography, message, Tooltip, Dropdown, Checkbox, AutoComplete } from "antd";
import { DownloadOutlined, PlayCircleOutlined, SearchOutlined, StarOutlined, FilterOutlined, ArrowUpOutlined, ArrowDownOutlined, CheckCircleOutlined, ClockCircleOutlined, LinkOutlined, CloseOutlined, HistoryOutlined } from "@ant-design/icons";
import type { Lang } from "../../lib/types";
import type { PtTorrent, MediaItem, TmdbMedia } from "@acme/types";
import { trpc } from "../../lib/trpc";

const { Text, Title, Paragraph } = Typography;

// 搜索历史存储 key
const SEARCH_HISTORY_KEY = "search_history";
const MAX_HISTORY_COUNT = 20;

// 获取搜索历史
const getSearchHistory = (): string[] => {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
};

// 保存搜索历史
const saveSearchHistory = (history: string[]) => {
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
};

// 添加搜索历史
const addSearchHistory = (keyword: string): string[] => {
  const history = getSearchHistory();
  // 移除重复项
  const filtered = history.filter(h => h !== keyword);
  // 添加到开头
  const newHistory = [keyword, ...filtered].slice(0, MAX_HISTORY_COUNT);
  saveSearchHistory(newHistory);
  return newHistory;
};

// 删除搜索历史
const removeSearchHistory = (keyword: string): string[] => {
  const history = getSearchHistory();
  const newHistory = history.filter(h => h !== keyword);
  saveSearchHistory(newHistory);
  return newHistory;
};

type SearchPageProps = {
  lang: Lang;
};

// 筛选选项
const RESOLUTION_OPTIONS = [
  { label: "全部", value: "" },
  { label: "4K/2160p", value: "4K,2160p" },
  { label: "1080p", value: "1080p" },
  { label: "720p", value: "720p" },
  { label: "SD", value: "SD" },
];

const VIDEO_CODEC_OPTIONS = [
  { label: "全部", value: "" },
  { label: "H.265/HEVC", value: "H.265" },
  { label: "H.264/AVC", value: "H.264" },
  { label: "AV1", value: "AV1" },
];

const DISCOUNT_OPTIONS = [
  { label: "全部", value: "" },
  { label: "免费", value: "free" },
  { label: "50%优惠", value: "half" },
  { label: "2x上传", value: "2x" },
];

// 格式化时间
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "今天";
    if (days === 1) return "昨天";
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    if (days < 365) return `${Math.floor(days / 30)}月前`;
    return `${Math.floor(days / 365)}年前`;
  } catch {
    return dateStr;
  }
};

// 获取折扣标签
const getDiscountTags = (torrent: PtTorrent) => {
  const tags: React.ReactNode[] = [];

  if (torrent.downloadVolumeFactor === 0) {
    tags.push(<Tag key="free" color="green" className="font-bold">免费</Tag>);
  } else if (torrent.downloadVolumeFactor === 0.5) {
    tags.push(<Tag key="half" color="cyan">50%</Tag>);
  } else if (torrent.downloadVolumeFactor === 0.3) {
    tags.push(<Tag key="70" color="blue">30%</Tag>);
  }

  if (torrent.uploadVolumeFactor && torrent.uploadVolumeFactor > 1) {
    tags.push(<Tag key="upload" color="orange">{torrent.uploadVolumeFactor}x↑</Tag>);
  }

  return tags;
};

// 获取媒体信息标签
const getMediaTags = (torrent: PtTorrent) => {
  const tags: React.ReactNode[] = [];

  if (torrent.resolution) {
    const color = torrent.resolution.includes("4K") || torrent.resolution === "2160p" ? "gold" : "default";
    tags.push(<Tag key="res" color={color}>{torrent.resolution}</Tag>);
  }

  if (torrent.videoCodec) {
    tags.push(<Tag key="video">{torrent.videoCodec}</Tag>);
  }

  if (torrent.audioCodec) {
    tags.push(<Tag key="audio">{torrent.audioCodec}</Tag>);
  }

  return tags;
};

// PT 种子卡片 - 增强版
const TorrentCard = ({ torrent, onDownload }: { torrent: PtTorrent; onDownload: (t: PtTorrent) => void }) => {
  const discountTags = getDiscountTags(torrent);
  const mediaTags = getMediaTags(torrent);

  return (
    <Card size="small" className="mb-2 hover:shadow-md transition-shadow" hoverable>
      <div className="flex gap-3">
        {/* 封面图 */}
        {torrent.posterUrl ? (
          <div className="flex-shrink-0">
            <Image
              src={torrent.posterUrl}
              alt={torrent.title}
              width={60}
              height={85}
              className="object-cover rounded"
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
              preview={false}
            />
          </div>
        ) : null}

        {/* 主要内容 */}
        <div className="flex-1 min-w-0">
          {/* 标题行 */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <Tooltip title={torrent.title}>
                <Text strong className="block text-sm leading-tight line-clamp-1">
                  {torrent.title}
                </Text>
              </Tooltip>
              {torrent.subtitle && (
                <Tooltip title={torrent.subtitle}>
                  <Text type="secondary" className="block text-xs mt-0.5 line-clamp-1">
                    {torrent.subtitle}
                  </Text>
                </Tooltip>
              )}
            </div>

            {/* 下载按钮 */}
            <Button
              type="primary"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => onDownload(torrent)}
            />
          </div>

          {/* 标签行：折扣 + 媒体信息 */}
          <div className="mt-2 flex flex-wrap gap-1">
            {discountTags}
            {mediaTags}
          </div>

          {/* 底部信息行 */}
          <div className="mt-2 flex items-center justify-between text-xs">
            {/* 左侧：站点、大小 */}
            <Space size="small" className="text-gray-500">
              <Tag color="blue" className="mr-0">{torrent.siteName}</Tag>
              <span>{torrent.size}</span>
              {torrent.uploadDate && (
                <Tooltip title={torrent.uploadDate}>
                  <span className="flex items-center gap-0.5">
                    <ClockCircleOutlined /> {formatDate(torrent.uploadDate)}
                  </span>
                </Tooltip>
              )}
            </Space>

            {/* 右侧：做种/下载/完成数 + 评分 */}
            <Space size="small" className="text-gray-500">
              <Tooltip title="做种">
                <span className="text-green-600 flex items-center gap-0.5">
                  <ArrowUpOutlined /> {torrent.seeders}
                </span>
              </Tooltip>
              <Tooltip title="下载">
                <span className="text-red-500 flex items-center gap-0.5">
                  <ArrowDownOutlined /> {torrent.leechers}
                </span>
              </Tooltip>
              {torrent.grabs !== undefined && (
                <Tooltip title="完成">
                  <span className="flex items-center gap-0.5">
                    <CheckCircleOutlined /> {torrent.grabs}
                  </span>
                </Tooltip>
              )}
              {torrent.imdbRating && (
                <Tooltip title={`IMDb: ${torrent.imdbRating}`}>
                  <a href={`https://www.imdb.com/title/${torrent.imdbId}`} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 text-yellow-600" onClick={e => e.stopPropagation()}>
                    <StarOutlined /> {torrent.imdbRating}
                  </a>
                </Tooltip>
              )}
              {torrent.doubanRating && (
                <Tooltip title={`豆瓣: ${torrent.doubanRating}`}>
                  <a href={`https://movie.douban.com/subject/${torrent.doubanId}`} target="_blank" rel="noreferrer" className="text-green-700" onClick={e => e.stopPropagation()}>
                    豆{torrent.doubanRating}
                  </a>
                </Tooltip>
              )}
              {torrent.detailsUrl && (
                <Tooltip title="查看详情">
                  <a href={torrent.detailsUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                    <LinkOutlined />
                  </a>
                </Tooltip>
              )}
            </Space>
          </div>
        </div>
      </div>
    </Card>
  );
};

// 媒体库卡片
const MediaCard = ({ item }: { item: MediaItem }) => (
  <Card
    size="small"
    hoverable
    cover={
      item.posterUrl && (
        <Image
          src={item.posterUrl}
          alt={item.title}
          height={180}
          className="object-cover"
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        />
      )
    }
    actions={[
      <Button key="play" type="text" icon={<PlayCircleOutlined />}>
        播放
      </Button>
    ]}
  >
    <Card.Meta
      title={
        <Text ellipsis title={item.title}>
          {item.title}
        </Text>
      }
      description={
        <Space className="text-xs">
          {item.year && <span>{item.year}</span>}
          {item.resolution && <Tag>{item.resolution}</Tag>}
          {item.videoCodec && <Tag>{item.videoCodec}</Tag>}
        </Space>
      }
    />
  </Card>
);

// TMDB 卡片
const TmdbCard = ({ media, onSearch }: { media: TmdbMedia; onSearch: (keyword: string) => void }) => (
  <Card
    size="small"
    hoverable
    cover={
      media.posterPath && (
        <Image
          src={media.posterPath}
          alt={media.title}
          height={180}
          className="object-cover"
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        />
      )
    }
    actions={[
      <Button
        key="search"
        type="text"
        icon={<SearchOutlined />}
        onClick={() => onSearch(media.title)}
      >
        搜索资源
      </Button>
    ]}
  >
    <Card.Meta
      title={
        <Text ellipsis title={media.title}>
          {media.title}
        </Text>
      }
      description={
        <div>
          <Space className="text-xs mb-1">
            <Tag color={media.mediaType === "movie" ? "blue" : "green"}>
              {media.mediaType === "movie" ? "电影" : "剧集"}
            </Tag>
            {media.releaseDate && <span>{media.releaseDate.slice(0, 4)}</span>}
          </Space>
          {media.voteAverage && (
            <div className="flex items-center gap-1 text-xs">
              <StarOutlined className="text-yellow-500" />
              <span>{media.voteAverage.toFixed(1)}</span>
            </div>
          )}
        </div>
      }
    />
  </Card>
);

export default function SearchPage({ lang }: SearchPageProps) {
  const [keyword, setKeyword] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [activeTab, setActiveTab] = useState("torrents");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // 初始化搜索历史
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // 筛选状态
  const [filters, setFilters] = useState({
    resolution: "",
    videoCodec: "",
    discount: "",
    freeOnly: false,
  });

  // 搜索结果状态
  const [ptResults, setPtResults] = useState<PtTorrent[]>([]);
  const [mediaResults, setMediaResults] = useState<MediaItem[]>([]);
  const [tmdbResults, setTmdbResults] = useState<TmdbMedia[]>([]);

  // 搜索 mutation
  const searchMutation = trpc.search.search.useMutation({
    onSuccess: (result) => {
      setPtResults(result.ptResults);
      setMediaResults(result.mediaResults);
      setTmdbResults(result.tmdbResults);
    },
    onError: () => {
      message.error("搜索失败，请稍后重试");
    }
  });

  // 筛选后的结果
  const filteredPtResults = useMemo(() => {
    return ptResults.filter(t => {
      // 分辨率筛选
      if (filters.resolution) {
        const resValues = filters.resolution.split(",");
        if (!resValues.some(v => t.resolution?.includes(v))) {
          return false;
        }
      }

      // 视频编码筛选
      if (filters.videoCodec && !t.videoCodec?.includes(filters.videoCodec)) {
        return false;
      }

      // 折扣筛选
      if (filters.discount === "free" && t.downloadVolumeFactor !== 0) {
        return false;
      }
      if (filters.discount === "half" && t.downloadVolumeFactor !== 0.5) {
        return false;
      }
      if (filters.discount === "2x" && (!t.uploadVolumeFactor || t.uploadVolumeFactor < 2)) {
        return false;
      }

      // 仅免费
      if (filters.freeOnly && t.downloadVolumeFactor !== 0) {
        return false;
      }

      return true;
    });
  }, [ptResults, filters]);

  const handleSearch = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setKeyword(trimmed);
    setInputValue(trimmed);
    // 保存到历史记录
    const newHistory = addSearchHistory(trimmed);
    setSearchHistory(newHistory);
    searchMutation.mutate({ keyword: trimmed });
  };

  const handleDeleteHistory = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    e.preventDefault();
    const newHistory = removeSearchHistory(item);
    setSearchHistory(newHistory);
  };

  const handleClearAllHistory = () => {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    setSearchHistory([]);
  };

  // 构建下拉选项
  const historyOptions = searchHistory.map(item => ({
    value: item,
    label: (
      <div className="flex items-center justify-between group">
        <Space>
          <HistoryOutlined className="text-gray-400" />
          <span>{item}</span>
        </Space>
        <CloseOutlined
          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => handleDeleteHistory(e, item)}
        />
      </div>
    ),
  }));

  // 自定义下拉框渲染，在底部添加清空按钮
  const dropdownRender = (menu: React.ReactNode) => (
    <>
      {menu}
      {searchHistory.length > 0 && (
        <div
          className="mt-1 pt-1 border-t border-gray-200/30 text-center text-gray-500 text-xs cursor-pointer hover:text-gray-300"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleClearAllHistory}
        >
          清空搜索历史
        </div>
      )}
    </>
  );

  const handleDownload = (torrent: PtTorrent) => {
    // TODO: 调用下载 API
    message.info(`正在添加下载: ${torrent.title}`);
  };

  // 筛选器下拉菜单
  const filterMenu = {
    items: [
      {
        key: "resolution",
        label: (
          <div className="py-1">
            <div className="text-xs text-gray-500 mb-1">分辨率</div>
            <Select
              size="small"
              value={filters.resolution}
              onChange={v => setFilters(f => ({ ...f, resolution: v }))}
              options={RESOLUTION_OPTIONS}
              className="w-32"
              onClick={e => e.stopPropagation()}
            />
          </div>
        ),
      },
      {
        key: "videoCodec",
        label: (
          <div className="py-1">
            <div className="text-xs text-gray-500 mb-1">视频编码</div>
            <Select
              size="small"
              value={filters.videoCodec}
              onChange={v => setFilters(f => ({ ...f, videoCodec: v }))}
              options={VIDEO_CODEC_OPTIONS}
              className="w-32"
              onClick={e => e.stopPropagation()}
            />
          </div>
        ),
      },
      {
        key: "discount",
        label: (
          <div className="py-1">
            <div className="text-xs text-gray-500 mb-1">促销</div>
            <Select
              size="small"
              value={filters.discount}
              onChange={v => setFilters(f => ({ ...f, discount: v }))}
              options={DISCOUNT_OPTIONS}
              className="w-32"
              onClick={e => e.stopPropagation()}
            />
          </div>
        ),
      },
      { type: "divider" as const },
      {
        key: "freeOnly",
        label: (
          <Checkbox
            checked={filters.freeOnly}
            onChange={e => setFilters(f => ({ ...f, freeOnly: e.target.checked }))}
          >
            仅显示免费
          </Checkbox>
        ),
      },
    ],
  };

  const renderContent = () => {
    if (searchMutation.isPending) {
      return (
        <div className="flex justify-center items-center py-20">
          <Spin size="large" tip="搜索中..." />
        </div>
      );
    }

    if (!keyword) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="输入关键词搜索电影、剧集资源"
        />
      );
    }

    return (
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        tabBarExtraContent={
          activeTab === "torrents" && ptResults.length > 0 ? (
            <Space>
              {filters.freeOnly && <Tag color="green" closable onClose={() => setFilters(f => ({ ...f, freeOnly: false }))}>仅免费</Tag>}
              {filters.resolution && <Tag closable onClose={() => setFilters(f => ({ ...f, resolution: "" }))}>{RESOLUTION_OPTIONS.find(o => o.value === filters.resolution)?.label}</Tag>}
              {filters.videoCodec && <Tag closable onClose={() => setFilters(f => ({ ...f, videoCodec: "" }))}>{filters.videoCodec}</Tag>}
              <Dropdown menu={filterMenu} trigger={["click"]} placement="bottomRight">
                <Button icon={<FilterOutlined />} size="small">
                  筛选
                </Button>
              </Dropdown>
            </Space>
          ) : null
        }
        items={[
          {
            key: "torrents",
            label: `PT站点 (${filteredPtResults.length}/${ptResults.length})`,
            children: filteredPtResults.length > 0 ? (
              <div className="space-y-2">
                {filteredPtResults.map((torrent) => (
                  <TorrentCard
                    key={`${torrent.siteId}-${torrent.id}`}
                    torrent={torrent}
                    onDownload={handleDownload}
                  />
                ))}
              </div>
            ) : (
              <Empty description={ptResults.length > 0 ? "没有符合筛选条件的结果" : "暂无种子结果"} />
            )
          },
          {
            key: "media",
            label: `媒体库 (${mediaResults.length})`,
            children: mediaResults.length > 0 ? (
              <Row gutter={[16, 16]}>
                {mediaResults.map((item) => (
                  <Col key={item.id} xs={12} sm={8} md={6} lg={4}>
                    <MediaCard item={item} />
                  </Col>
                ))}
              </Row>
            ) : (
              <Empty description="媒体库中暂无此内容" />
            )
          },
          {
            key: "tmdb",
            label: `TMDB (${tmdbResults.length})`,
            children: tmdbResults.length > 0 ? (
              <Row gutter={[16, 16]}>
                {tmdbResults.map((media) => (
                  <Col key={media.id} xs={12} sm={8} md={6} lg={4}>
                    <TmdbCard media={media} onSearch={handleSearch} />
                  </Col>
                ))}
              </Row>
            ) : (
              <Empty description="TMDB 中未找到相关内容" />
            )
          }
        ]}
      />
    );
  };

  return (
    <div className="p-4">
      <Card className="mb-4">
        <div className="max-w-2xl mx-auto">
          <Title level={4} className="text-center mb-4">
            聚合搜索
          </Title>
          <Space.Compact className="w-full">
            <AutoComplete
              className="flex-1"
              size="large"
              value={inputValue}
              onChange={setInputValue}
              options={historyOptions}
              dropdownRender={dropdownRender}
              onSelect={handleSearch}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch(inputValue);
                }
              }}
              placeholder="输入电影、剧集名称搜索..."
              allowClear
              filterOption={(inputValue, option) =>
                option?.value.toLowerCase().includes(inputValue.toLowerCase()) ?? false
              }
            />
            <Button
              type="primary"
              size="large"
              icon={<SearchOutlined />}
              loading={searchMutation.isPending}
              onClick={() => handleSearch(inputValue)}
            >
              搜索
            </Button>
          </Space.Compact>
          <Paragraph type="secondary" className="text-center mt-2 text-xs">
            同时搜索 PT站点、媒体库 和 TMDB 数据库
          </Paragraph>
        </div>
      </Card>

      <Card>{renderContent()}</Card>
    </div>
  );
}
