import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { Button, Spin } from "antd";
import MediaDatabaseService from "../services/mediaDatabase";

/**
 * 播放页组件
 * 用于播放导入的本地视频文件
 */
function PlayPage() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  /**
   * 初始化视频播放
   */
  useEffect(() => {
    const initializeVideo = async () => {
      try {
        if (!mediaId) {
          setError("未找到视频ID");
          setLoading(false);
          return;
        }

        // 根据 mediaId 获取视频文件
        const media = await MediaDatabaseService.getVideoById(Number(mediaId));

        if (!media) {
          setError("视频文件不存在");
          setLoading(false);
          return;
        }

        // 验证文件句柄是否仍然可用
        try {
          await media.handle.requestPermission({ mode: "read" });
          const file = await media.handle.getFile();
          const url = URL.createObjectURL(file);
          setVideoUrl(url);

          // 更新最后播放时间
          await MediaDatabaseService.updateVideoPlayedTime(media.id);

          setLoading(false);
        } catch {
          setError("无法访问视频文件，可能已被删除或权限已更改");
          setLoading(false);
        }
      } catch {
        setError("加载视频失败");
        setLoading(false);
      }
    };

    initializeVideo();

    // 清理 URL 对象
    return () => {
      setVideoUrl((prevUrl) => {
        if (prevUrl) {
          URL.revokeObjectURL(prevUrl);
        }
        return null;
      });
    };
  }, [mediaId]);

  /**
   * 返回首页
   */
  const handleGoBack = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center">
        <Spin size="large" tip="加载视频中..." />
      </div>
    );
  }

  if (error || !videoUrl) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4">
        <div className="text-lg text-red-600">{error || "无法播放视频"}</div>
        <Button onClick={handleGoBack}>返回首页</Button>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      {/* 控制栏 */}
      <div className="p-3">
        <Button
          type="text"
          shape="circle"
          onClick={handleGoBack}
          icon={<div className="i-mdi-arrow-left text-xl" />}
        />
      </div>

      {/* 视频播放器 */}
      <video ref={videoRef} src={videoUrl} autoPlay />
      {/* 字幕列表 */}
      <div className="flex-1"></div>
      {/* 操作区域 */}
    </div>
  );
}

export default PlayPage;
