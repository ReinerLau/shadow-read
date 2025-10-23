import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { Button } from "antd";
import MediaDatabaseService from "../services/mediaDatabase";
import SubtitleList from "../components/SubtitleList";
import type { Subtitle } from "../types";

/**
 * 播放页组件
 * 用于播放导入的本地视频文件
 */
function PlayPage() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>();
  const [subtitle, setSubtitle] = useState<Subtitle | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  /**
   * 初始化视频播放
   */
  useEffect(() => {
    let url: string;
    const initializeVideo = async () => {
      try {
        if (!mediaId) {
          setError("未找到视频ID");
          return;
        }

        // 根据 mediaId 获取视频文件
        const media = await MediaDatabaseService.getVideoById(Number(mediaId));

        if (!media) {
          setError("视频文件不存在");
          return;
        }

        // 验证文件句柄是否仍然可用
        try {
          await media.handle.requestPermission({ mode: "read" });
          const file = await media.handle.getFile();
          url = URL.createObjectURL(file);
          setVideoUrl(url);

          // 更新最后播放时间
          await MediaDatabaseService.updateVideoPlayedTime(media.id);

          // 获取关联的字幕
          const subtitleData = await MediaDatabaseService.getSubtitleByVideoId(
            Number(mediaId)
          );
          if (subtitleData) {
            setSubtitle(subtitleData);
          } else {
            setError("未找到字幕文件");
            return;
          }
        } catch {
          setError("无法访问视频文件，可能已被删除或权限已更改");
        }
      } catch {
        setError("加载视频失败");
      }
    };

    initializeVideo();

    // 清理 URL 对象
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [mediaId]);

  /**
   * 监听视频播放时间
   */
  useEffect(() => {
    if (!videoRef.current) return;

    const handleTimeUpdate = () => {
      const currentTimeMs = videoRef.current!.currentTime * 1000; // 转换为毫秒
      setCurrentTime(currentTimeMs);
    };

    const video = videoRef.current;
    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, []);

  /**
   * 返回首页
   */
  const handleGoBack = () => {
    navigate("/");
  };

  if (error) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4">
        <div className="text-lg text-red-600">{error || "无法播放视频"}</div>
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
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay
        controls
        className="w-full"
      />

      {/* 字幕列表显示区域 */}
      {subtitle && (
        <div className="flex-1 min-h-0 p-4">
          <SubtitleList subtitle={subtitle} currentTime={currentTime} />
        </div>
      )}
    </div>
  );
}

export default PlayPage;
