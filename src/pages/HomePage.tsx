import { Button, Spin } from "antd";
import { useEffect, useState } from "react";
import ImportVideo from "../components/ImportVideo";
import VideoCard from "../components/VideoCard";
import MediaDatabaseService from "../services/mediaDatabase";
import type { MediaFile } from "../types";

/**
 * 首页组件
 */
function HomePage() {
  /** 视频列表 */
  const [videos, setVideos] = useState<MediaFile[]>([]);
  /** 加载状态 */
  const [loading, setLoading] = useState(true);

  /**
   * 获取所有视频
   */
  const fetchVideos = async () => {
    try {
      setLoading(true);
      const allVideos = await MediaDatabaseService.getAllVideos();
      setVideos(allVideos);
    } catch {
      // 错误处理
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      {/* header */}
      <div className="p-3 flex justify-between bg-white ">
        {/* 搜索视频 */}
        <Button
          type="text"
          shape="circle"
          icon={<div className="i-mdi-magnify text-xl" />}
        />
        {/* 导入视频 */}
        <ImportVideo />
      </div>
      {/* 视频列表 */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Spin />
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="i-mdi-video-plus text-6xl text-gray-300 mb-4" />
            <div className="text-gray-500">暂无视频，请导入视频</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onVideoDeleted={fetchVideos}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;
