import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Drawer, Button } from "antd";
import MediaDatabaseService from "../services/mediaDatabase";
import type { MediaFile } from "../types";

/**
 * 视频卡片组件属性
 */
interface VideoCardProps {
  /** 视频文件数据 */
  video: MediaFile;
  /** 删除视频后的回调函数 */
  onVideoDeleted?: () => void;
}

/**
 * 视频卡片组件
 * 显示视频封面、时长、名称的卡片
 * 点击卡片时导航到播放页
 */
const VideoCard: React.FC<VideoCardProps> = ({ video, onVideoDeleted }) => {
  const navigate = useNavigate();
  /** 抽屉打开状态 */
  const [drawerOpen, setDrawerOpen] = useState(false);
  /** 删除加载状态 */
  const [deleteLoading, setDeleteLoading] = useState(false);

  /**
   * 处理卡片点击事件，导航到播放页
   */
  const handleClick = () => {
    navigate(`/play/${video.id}`);
  };

  /**
   * 处理"更多操作"按钮点击
   */
  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDrawerOpen(true);
  };

  /**
   * 处理删除视频
   */
  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      // 删除关联字幕
      const subtitle = await MediaDatabaseService.getSubtitleByVideoId(
        video.id
      );
      if (subtitle) {
        await MediaDatabaseService.deleteSubtitle(subtitle.id);
      }
      // 删除视频
      await MediaDatabaseService.deleteVideo(video.id);
      setDrawerOpen(false);
      onVideoDeleted?.();
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div
        className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer"
        onClick={handleClick}
      >
        {/* 视频封面 */}
        <div className="relative w-full aspect-video bg-gray-200 overflow-hidden">
          {video.thumbnail ? (
            <img
              src={video.thumbnail}
              alt={video.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-300">
              <div className="i-mdi-play-circle text-4xl text-gray-500" />
            </div>
          )}
          {/* 时长标签 */}
          {video.duration && (
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-mono">
              {video.duration}
            </div>
          )}
        </div>

        <div className="p-3 flex items-center">
          {/* 视频名称 */}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-800 truncate">
              {video.name}
            </h3>
          </div>
          {/* 更多操作 */}
          <Button
            type="text"
            size="small"
            onClick={handleMoreClick}
            title="更多操作"
            icon={<div className="i-mdi-dots-vertical text-lg" />}
          />
        </div>
      </div>

      {/* 更多操作 */}
      <Drawer
        placement="bottom"
        height={48}
        onClose={() => setDrawerOpen(false)}
        closeIcon={false}
        open={drawerOpen}
        classNames={{
          content: "!bg-transparent",
          body: "!p-2",
        }}
      >
        <Button
          color="danger"
          loading={deleteLoading}
          onClick={handleDelete}
          variant="outlined"
          block
          className="border-none"
        >
          删除
        </Button>
      </Drawer>
    </>
  );
};

export default VideoCard;
