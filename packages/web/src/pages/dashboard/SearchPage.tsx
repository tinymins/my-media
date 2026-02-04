import { useState } from "react";
import { Button, Card, Col, Empty, Image, Input, Row, Space, Spin, Tabs, Tag, Typography } from "antd";
import { DownloadOutlined, PlayCircleOutlined, SearchOutlined, StarOutlined } from "@ant-design/icons";
import type { Lang } from "../../lib/types";
import type { PtTorrent, MediaItem, TmdbMedia } from "@acme/types";

const { Text, Title, Paragraph } = Typography;
const { Search } = Input;

type SearchPageProps = {
  lang: Lang;
};

// 格式化文件大小
const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

// PT 种子卡片
const TorrentCard = ({ torrent, onDownload }: { torrent: PtTorrent; onDownload: (t: PtTorrent) => void }) => (
  <Card
    size="small"
    className="mb-3"
    hoverable
    actions={[
      <Button
        key="download"
        type="primary"
        size="small"
        icon={<DownloadOutlined />}
        onClick={() => onDownload(torrent)}
      >
        下载
      </Button>
    ]}
  >
    <div className="flex gap-3">
      {torrent.posterUrl && (
        <Image
          src={torrent.posterUrl}
          alt={torrent.title}
          width={80}
          height={120}
          className="object-cover rounded"
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        />
      )}
      <div className="flex-1 min-w-0">
        <Text strong ellipsis className="block">
          {torrent.title}
        </Text>
        {torrent.subtitle && (
          <Text type="secondary" ellipsis className="block text-xs">
            {torrent.subtitle}
          </Text>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          <Tag color="blue">{torrent.siteName}</Tag>
          <Tag>{torrent.size}</Tag>
          {torrent.downloadVolumeFactor === 0 && <Tag color="green">免费</Tag>}
          {torrent.uploadVolumeFactor && torrent.uploadVolumeFactor > 1 && (
            <Tag color="orange">{torrent.uploadVolumeFactor}x 上传</Tag>
          )}
        </div>
        <div className="mt-1 text-xs text-gray-500">
          <Space split="·">
            <span>↑ {torrent.seeders}</span>
            <span>↓ {torrent.leechers}</span>
            {torrent.grabs && <span>✓ {torrent.grabs}</span>}
          </Space>
        </div>
      </div>
    </div>
  </Card>
);

// 媒体库卡片
const MediaCard = ({ item }: { item: MediaItem }) => (
  <Card
    size="small"
    className="mb-3"
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
          {item.resolution && <Tag size="small">{item.resolution}</Tag>}
          {item.videoCodec && <Tag size="small">{item.videoCodec}</Tag>}
        </Space>
      }
    />
  </Card>
);

// TMDB 卡片
const TmdbCard = ({ media, onSearch }: { media: TmdbMedia; onSearch: (keyword: string) => void }) => (
  <Card
    size="small"
    className="mb-3"
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
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("torrents");

  // Mock data - 实际应调用 tRPC API
  const [ptResults] = useState<PtTorrent[]>([]);
  const [mediaResults] = useState<MediaItem[]>([]);
  const [tmdbResults] = useState<TmdbMedia[]>([]);

  const handleSearch = async (value: string) => {
    if (!value.trim()) return;

    setKeyword(value);
    setLoading(true);

    // TODO: 调用 search API
    // const result = await trpc.search.search.mutate({ keyword: value });
    // setPtResults(result.ptResults);
    // setMediaResults(result.mediaResults);
    // setTmdbResults(result.tmdbResults);

    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleDownload = (torrent: PtTorrent) => {
    // TODO: 调用下载 API
    console.log("Download:", torrent);
  };

  const renderContent = () => {
    if (loading) {
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
        items={[
          {
            key: "torrents",
            label: `PT站点 (${ptResults.length})`,
            children: ptResults.length > 0 ? (
              <div className="grid gap-3">
                {ptResults.map((torrent) => (
                  <TorrentCard
                    key={torrent.id}
                    torrent={torrent}
                    onDownload={handleDownload}
                  />
                ))}
              </div>
            ) : (
              <Empty description="暂无种子结果" />
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
    <div className="p-6">
      <Card className="mb-6">
        <div className="max-w-2xl mx-auto">
          <Title level={4} className="text-center mb-4">
            聚合搜索
          </Title>
          <Search
            placeholder="输入电影、剧集名称搜索..."
            allowClear
            enterButton={
              <Button type="primary" icon={<SearchOutlined />}>
                搜索
              </Button>
            }
            size="large"
            onSearch={handleSearch}
            loading={loading}
          />
          <Paragraph type="secondary" className="text-center mt-2 text-xs">
            同时搜索 PT站点、媒体库 和 TMDB 数据库
          </Paragraph>
        </div>
      </Card>

      <Card>{renderContent()}</Card>
    </div>
  );
}
