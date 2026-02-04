import { useState } from "react";
import { Button, Card, Empty, Modal, Progress, Space, Table, Tag, Typography, Popconfirm, Tooltip } from "antd";
import {
  DeleteOutlined,
  InfoCircleOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  CloudDownloadOutlined
} from "@ant-design/icons";
import type { Lang } from "../../lib/types";
import type { TorrentInfo, TorrentState } from "@acme/types";

const { Text, Title, Paragraph } = Typography;

type DownloadsPageProps = {
  lang: Lang;
};

// 状态显示配置
const stateConfig: Record<TorrentState, { label: string; color: string }> = {
  downloading: { label: "下载中", color: "processing" },
  seeding: { label: "做种中", color: "success" },
  pausedDL: { label: "暂停下载", color: "warning" },
  pausedUP: { label: "暂停上传", color: "warning" },
  stalledDL: { label: "等待下载", color: "default" },
  stalledUP: { label: "等待上传", color: "default" },
  checkingDL: { label: "校验中", color: "processing" },
  checkingUP: { label: "校验中", color: "processing" },
  queuedDL: { label: "排队下载", color: "default" },
  queuedUP: { label: "排队上传", color: "default" },
  error: { label: "错误", color: "error" },
  missingFiles: { label: "文件丢失", color: "error" },
  uploading: { label: "上传中", color: "success" },
  completed: { label: "已完成", color: "success" },
  unknown: { label: "未知", color: "default" }
};

// 格式化文件大小
const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

// 格式化速度
const formatSpeed = (bytesPerSec: number): string => {
  return `${formatSize(bytesPerSec)}/s`;
};

// 格式化时间
const formatEta = (seconds: number): string => {
  if (seconds <= 0 || seconds === 8640000) return "∞";
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时 ${Math.floor((seconds % 3600) / 60)}分钟`;
  return `${Math.floor(seconds / 86400)}天 ${Math.floor((seconds % 86400) / 3600)}小时`;
};

// 格式化做种时间
const formatSeedingTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${mins}分钟`;
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}天${hours}小时`;
};

export default function DownloadsPage({ lang }: DownloadsPageProps) {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTorrent, setSelectedTorrent] = useState<TorrentInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // Mock data - 实际应调用 tRPC API
  const [torrents] = useState<TorrentInfo[]>([
    {
      hash: "abc123",
      name: "平凡英雄.Ordinary.Hero.2022.2160p.60FPS.WEB-DL.H265.DDP2.0-OurTV",
      size: 18500000000,
      progress: 1,
      downloadSpeed: 0,
      uploadSpeed: 52000,
      downloaded: 18500000000,
      uploaded: 0,
      ratio: 0,
      state: "seeding",
      category: "movie",
      savePath: "/mnt/media/downloads/movie-robot/movie",
      addedOn: Date.now() / 1000 - 86400 * 2,
      completedOn: Date.now() / 1000 - 86400,
      seedingTime: 86400 + 3600 * 9 + 60 * 18 + 22
    }
  ]);

  const handleRefresh = () => {
    setLoading(true);
    // TODO: 调用刷新 API
    setTimeout(() => setLoading(false), 1000);
  };

  const handlePause = (hashes: string[]) => {
    // TODO: 调用暂停 API
    console.log("Pause:", hashes);
  };

  const handleResume = (hashes: string[]) => {
    // TODO: 调用继续 API
    console.log("Resume:", hashes);
  };

  const handleDelete = (hashes: string[], deleteFiles = false) => {
    // TODO: 调用删除 API
    console.log("Delete:", hashes, deleteFiles);
  };

  const showDetail = (torrent: TorrentInfo) => {
    setSelectedTorrent(torrent);
    setDetailModalOpen(true);
  };

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      render: (name: string, record: TorrentInfo) => (
        <Space direction="vertical" size={0}>
          <Tooltip title={name}>
            <Text strong ellipsis style={{ maxWidth: 400 }}>
              {name}
            </Text>
          </Tooltip>
          <Space size="small" className="text-xs">
            <Tag color={stateConfig[record.state].color}>
              {stateConfig[record.state].label}
            </Tag>
            {record.category && <Tag>{record.category}</Tag>}
          </Space>
        </Space>
      )
    },
    {
      title: "大小",
      dataIndex: "size",
      key: "size",
      width: 100,
      render: (size: number) => formatSize(size)
    },
    {
      title: "进度",
      dataIndex: "progress",
      key: "progress",
      width: 180,
      render: (progress: number, record: TorrentInfo) => (
        <div>
          <Progress
            percent={Math.round(progress * 100)}
            size="small"
            status={record.state === "error" ? "exception" : undefined}
          />
          {record.state === "downloading" && record.eta && (
            <Text type="secondary" className="text-xs">
              剩余 {formatEta(record.eta)}
            </Text>
          )}
        </div>
      )
    },
    {
      title: "速度",
      key: "speed",
      width: 150,
      render: (_: unknown, record: TorrentInfo) => (
        <Space direction="vertical" size={0} className="text-xs">
          <span>↓ {formatSpeed(record.downloadSpeed)}</span>
          <span>↑ {formatSpeed(record.uploadSpeed)}</span>
        </Space>
      )
    },
    {
      title: "分享率",
      dataIndex: "ratio",
      key: "ratio",
      width: 80,
      render: (ratio: number) => (
        <Text type={ratio >= 1 ? "success" : undefined}>
          {ratio.toFixed(2)}
        </Text>
      )
    },
    {
      title: "操作",
      key: "actions",
      width: 150,
      render: (_: unknown, record: TorrentInfo) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<InfoCircleOutlined />}
            onClick={() => showDetail(record)}
          />
          {["downloading", "stalledDL", "queuedDL"].includes(record.state) ? (
            <Button
              type="text"
              size="small"
              icon={<PauseCircleOutlined />}
              onClick={() => handlePause([record.hash])}
            />
          ) : ["pausedDL", "pausedUP"].includes(record.state) ? (
            <Button
              type="text"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleResume([record.hash])}
            />
          ) : null}
          <Popconfirm
            title="删除种子"
            description="是否同时删除文件？"
            onConfirm={() => handleDelete([record.hash], true)}
            onCancel={() => handleDelete([record.hash], false)}
            okText="删除文件"
            cancelText="仅删除任务"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="p-6">
      <Card
        title={
          <Space>
            <CloudDownloadOutlined />
            <span>下载管理</span>
          </Space>
        }
        extra={
          <Space>
            {selectedRows.length > 0 && (
              <>
                <Button
                  icon={<PauseCircleOutlined />}
                  onClick={() => handlePause(selectedRows)}
                >
                  暂停
                </Button>
                <Button
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleResume(selectedRows)}
                >
                  继续
                </Button>
                <Popconfirm
                  title="批量删除"
                  description={`确定删除选中的 ${selectedRows.length} 个任务？`}
                  onConfirm={() => handleDelete(selectedRows)}
                >
                  <Button danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              </>
            )}
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={torrents}
          columns={columns}
          rowKey="hash"
          loading={loading}
          rowSelection={{
            selectedRowKeys: selectedRows,
            onChange: (keys) => setSelectedRows(keys as string[])
          }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个任务`
          }}
          locale={{
            emptyText: <Empty description="暂无下载任务" />
          }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title="详细信息"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={600}
      >
        {selectedTorrent && (
          <div className="space-y-3">
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <Text type="secondary">内容类型：</Text>
              <Text>{selectedTorrent.category === "movie" ? "电影" : "剧集"}</Text>

              <Text type="secondary">种子名称：</Text>
              <Text copyable className="break-all">
                {selectedTorrent.name}
              </Text>

              <Text type="secondary">保存路径：</Text>
              <Text copyable className="break-all">
                {selectedTorrent.savePath}
              </Text>

              <Text type="secondary">文件尺寸：</Text>
              <Text>{formatSize(selectedTorrent.size)}</Text>

              <Text type="secondary">已经上传：</Text>
              <Text>{formatSize(selectedTorrent.uploaded)}</Text>

              <Text type="secondary">分享比率：</Text>
              <Text>{(selectedTorrent.ratio * 100).toFixed(2)}%</Text>

              <Text type="secondary">做种时间：</Text>
              <Text>{formatSeedingTime(selectedTorrent.seedingTime)}</Text>

              {selectedTorrent.tracker && (
                <>
                  <Text type="secondary">Tracker：</Text>
                  <Text className="break-all">{selectedTorrent.tracker}</Text>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
