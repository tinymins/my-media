import { useEffect, useState } from "react";
import { Button, Card, Descriptions, Space, Spin, Tag, Typography, Divider, Row, Col, Alert, Tooltip } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudServerOutlined,
  DownloadOutlined,
  GlobalOutlined,
  ReloadOutlined,
  WarningOutlined,
  ApiOutlined
} from "@ant-design/icons";
import { trpc } from "../../lib/trpc";
import type { Lang } from "../../lib/types";

const { Title, Text } = Typography;

type SystemStatusPageProps = {
  lang: Lang;
};

// 格式化文件大小
const formatBytes = (bytes?: number): string => {
  if (bytes === undefined || bytes === null) return "N/A";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

// 格式化速度
const formatSpeed = (bytesPerSec?: number): string => {
  if (bytesPerSec === undefined || bytesPerSec === null) return "N/A";
  return `${formatBytes(bytesPerSec)}/s`;
};

// 状态标签组件
const StatusTag = ({ connected, error }: { connected: boolean; error?: string }) => {
  if (connected) {
    return (
      <Tag icon={<CheckCircleOutlined />} color="success">
        已连接
      </Tag>
    );
  }
  return (
    <Tooltip title={error}>
      <Tag icon={<CloseCircleOutlined />} color="error">
        未连接
      </Tag>
    </Tooltip>
  );
};

export default function SystemStatusPage({ lang }: SystemStatusPageProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: status, isLoading, error, refetch } = trpc.systemStatus.getAll.useQuery(
    undefined,
    {
      refetchInterval: 30000, // 每 30 秒自动刷新
      retry: 1
    }
  );

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    refetch();
  };

  if (error) {
    return (
      <div className="p-6">
        <Alert
          message="获取系统状态失败"
          description={error.message}
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!mb-0">
          <ApiOutlined className="mr-2" />
          系统连接状态
        </Title>
        <Button
          icon={<ReloadOutlined spin={isLoading} />}
          onClick={handleRefresh}
          loading={isLoading}
        >
          刷新状态
        </Button>
      </div>

      {isLoading && !status ? (
        <div className="flex justify-center py-20">
          <Spin size="large" tip="正在检查连接状态..." />
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {/* TMDB 状态 */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <GlobalOutlined />
                  <span>TMDB (电影数据库)</span>
                </Space>
              }
              extra={<StatusTag connected={status?.tmdb.isConnected ?? false} error={status?.tmdb.errorMessage} />}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="配置状态">
                  {status?.tmdb.isConfigured ? (
                    <Tag color="success">已配置 API Key</Tag>
                  ) : (
                    <Tag color="warning">未配置 TMDB_API_KEY</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="连接状态">
                  {status?.tmdb.isConnected ? "正常" : status?.tmdb.errorMessage || "连接失败"}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* 媒体服务器状态 */}
          <Col xs={24}>
            <Card
              title={
                <Space>
                  <CloudServerOutlined />
                  <span>媒体服务器</span>
                </Space>
              }
            >
              {status?.mediaServers.length === 0 ? (
                <Alert
                  message="暂无配置"
                  description="请先在设置中添加媒体服务器（Plex/Emby/Jellyfin）"
                  type="info"
                  showIcon
                />
              ) : (
                <div className="space-y-4">
                  {status?.mediaServers.map((server) => (
                    <div
                      key={server.id}
                      className="p-4 border rounded-lg dark:border-slate-700"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <Text strong className="text-lg">{server.name}</Text>
                          <Tag className="ml-2">{server.type.toUpperCase()}</Tag>
                        </div>
                        <StatusTag connected={server.isConnected} error={server.errorMessage} />
                      </div>
                      <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
                        <Descriptions.Item label="版本">
                          {server.version || "N/A"}
                        </Descriptions.Item>
                        <Descriptions.Item label="媒体库数量">
                          {server.libraryCount ?? "N/A"}
                        </Descriptions.Item>
                        {server.errorMessage && (
                          <Descriptions.Item label="错误信息">
                            <Text type="danger">{server.errorMessage}</Text>
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Col>

          {/* 下载客户端状态 */}
          <Col xs={24}>
            <Card
              title={
                <Space>
                  <DownloadOutlined />
                  <span>下载客户端</span>
                </Space>
              }
            >
              {status?.downloadClients.length === 0 ? (
                <Alert
                  message="暂无配置"
                  description="请先在设置中添加下载客户端（qBittorrent/Transmission）"
                  type="info"
                  showIcon
                />
              ) : (
                <div className="space-y-4">
                  {status?.downloadClients.map((client) => (
                    <div
                      key={client.id}
                      className="p-4 border rounded-lg dark:border-slate-700"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <Text strong className="text-lg">{client.name}</Text>
                          <Tag className="ml-2">{client.type.toUpperCase()}</Tag>
                        </div>
                        <StatusTag connected={client.isConnected} error={client.errorMessage} />
                      </div>
                      <Descriptions column={{ xs: 1, sm: 2, md: 4 }} size="small">
                        <Descriptions.Item label="版本">
                          {client.version || "N/A"}
                        </Descriptions.Item>
                        <Descriptions.Item label="可用空间">
                          {formatBytes(client.freeSpace)}
                        </Descriptions.Item>
                        <Descriptions.Item label="下载中">
                          {client.totalDownloading ?? 0} 个任务
                        </Descriptions.Item>
                        <Descriptions.Item label="做种中">
                          {client.totalSeeding ?? 0} 个任务
                        </Descriptions.Item>
                        <Descriptions.Item label="下载速度">
                          {formatSpeed(client.downloadSpeed)}
                        </Descriptions.Item>
                        <Descriptions.Item label="上传速度">
                          {formatSpeed(client.uploadSpeed)}
                        </Descriptions.Item>
                        {client.errorMessage && (
                          <Descriptions.Item label="错误信息" span={2}>
                            <Text type="danger">{client.errorMessage}</Text>
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Col>

          {/* PT 站点状态 */}
          <Col xs={24}>
            <Card
              title={
                <Space>
                  <GlobalOutlined />
                  <span>PT 站点</span>
                </Space>
              }
            >
              {status?.ptSites.length === 0 ? (
                <Alert
                  message="暂无配置"
                  description="请先在设置中添加 PT 站点"
                  type="info"
                  showIcon
                />
              ) : (
                <div className="space-y-4">
                  {status?.ptSites.map((site) => (
                    <div
                      key={site.id}
                      className="p-4 border rounded-lg dark:border-slate-700"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <Text strong className="text-lg">{site.name}</Text>
                          <Tag className="ml-2">{site.siteId}</Tag>
                          {!site.isEnabled && <Tag color="default">已禁用</Tag>}
                        </div>
                        <StatusTag connected={site.isConnected} />
                      </div>
                      <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                        <Descriptions.Item label="启用状态">
                          {site.isEnabled ? (
                            <Tag color="success">已启用</Tag>
                          ) : (
                            <Tag color="default">已禁用</Tag>
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label="最后检查">
                          {site.lastCheckedAt
                            ? new Date(site.lastCheckedAt).toLocaleString()
                            : "从未检查"}
                        </Descriptions.Item>
                      </Descriptions>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Col>
        </Row>
      )}

      {/* 帮助信息 */}
      <Divider />
      <Alert
        message="提示"
        description={
          <ul className="list-disc pl-4 mt-2 space-y-1">
            <li>绿色状态表示服务连接正常，红色表示连接失败</li>
            <li>页面每 30 秒自动刷新一次，也可手动点击刷新按钮</li>
            <li>如果连接失败，请检查服务地址、认证信息是否正确，以及网络是否可达</li>
            <li>TMDB 需要在环境变量中配置 TMDB_API_KEY</li>
          </ul>
        }
        type="info"
        showIcon
        icon={<WarningOutlined />}
      />
    </div>
  );
}
