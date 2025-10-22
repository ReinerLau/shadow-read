import React from "react";
import { useNavigate } from "react-router";
import type { MediaFile } from "../types";

/**
 * 视频卡片组件属性
 */
interface VideoCardProps {
  /** 视频文件数据 */
  video: MediaFile;
}

/**
 * 视频卡片组件
 * 显示视频封面、时长、名称的卡片
 * 点击卡片时导航到播放页
 */
const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const navigate = useNavigate();

  /**
   * 处理卡片点击事件，导航到播放页
   */
  const handleClick = () => {
    navigate(`/play/${video.id}`);
  };

  return (
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

      {/* 视频信息 */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-gray-800 truncate">
          {video.name}
        </h3>
      </div>
    </div>
  );
};

export default VideoCard;
