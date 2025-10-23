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
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

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
    if (!videoRef.current || !subtitle) return;

    const handleTimeUpdate = () => {
      const currentTimeMs = videoRef.current!.currentTime * 1000; // 转换为毫秒
      const index = subtitle.entries.findIndex(
        (entry) =>
          currentTimeMs >= entry.startTime && currentTimeMs < entry.endTime
      );
      setCurrentSubtitleIndex(index);
    };

    const video = videoRef.current;
    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [subtitle]);

  /**
   * 监听视频播放/暂停状态
   */
  useEffect(() => {
    if (!videoRef.current) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const video = videoRef.current;
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  /**
   * 上一句 - 跳转到上一个字幕条目的开始时间
   */
  const handlePreviousSubtitle = () => {
    if (!videoRef.current || !subtitle) return;

    if (currentSubtitleIndex > 0) {
      const previousEntry = subtitle.entries[currentSubtitleIndex - 1];
      videoRef.current.currentTime = previousEntry.startTime / 1000; // 转换为秒
    }
  };

  /**
   * 下一句 - 跳转到下一个字幕条目的开始时间
   */
  const handleNextSubtitle = () => {
    if (!videoRef.current || !subtitle) return;

    if (currentSubtitleIndex < subtitle.entries.length - 1) {
      const nextEntry = subtitle.entries[currentSubtitleIndex + 1];
      videoRef.current.currentTime = nextEntry.startTime / 1000; // 转换为秒
    }
  };

  /**
   * 播放/暂停切换
   */
  const handleTogglePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  /**
   * 返回首页
   */
  const handleGoBack = () => {
    navigate("/");
  };

  /**
   * 处理字幕双击事件 - 跳转到对应时间
   */
  const handleSubtitleClick = (startTimeMs: number) => {
    if (!videoRef.current) return;
    // 将毫秒转换为秒
    videoRef.current.currentTime = startTimeMs / 1000;
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
      <video ref={videoRef} src={videoUrl} autoPlay className="w-full" />

      {/* 字幕列表 */}
      {subtitle && (
        <div className="flex-1 min-h-0 p-4">
          <SubtitleList
            subtitle={subtitle}
            currentIndex={currentSubtitleIndex}
            onSubtitleClick={handleSubtitleClick}
          />
        </div>
      )}

      {/* 操作区域 */}
      <div className="p-3  flex justify-center gap-4 bg-white">
        <Button
          className="flex-1"
          type="text"
          onClick={handlePreviousSubtitle}
          icon={<div className="i-mdi:skip-previous text-xl" />}
        />
        <Button
          className="flex-1"
          type="text"
          onClick={handleTogglePlayPause}
          icon={
            isPlaying ? (
              <div className="i-mdi-pause text-xl" />
            ) : (
              <div className="i-mdi-play text-xl" />
            )
          }
        />
        <Button
          className="flex-1"
          type="text"
          onClick={handleNextSubtitle}
          icon={<div className="i-mdi:skip-next text-xl" />}
        />
      </div>
    </div>
  );
}

export default PlayPage;
