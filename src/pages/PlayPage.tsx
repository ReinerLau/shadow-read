import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { Button, Modal, Radio } from "antd";
import MediaDatabaseService from "../services/mediaDatabase";
import SubtitleList from "../components/SubtitleList";
import { PlayModeValues, type PlayMode } from "../types";
import { useVideoInit } from "../hooks/useVideoInit";
import { useSubtitleInit } from "../hooks/useSubtitleInit";
import { useSubtitleJump } from "../hooks/useSubtitleJump";

/**
 * 播放页组件
 * 用于播放导入的本地视频文件
 */
function PlayPage() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const { videoUrl, error: videoError } = useVideoInit(mediaId);
  const {
    subtitle,
    savedSubtitleIndex,
    error: subtitleError,
  } = useSubtitleInit(mediaId);
  const [error, setError] = useState<string | null>(null);
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMoreModalOpen, setIsMoreModalOpen] = useState<boolean>(false);
  const [playMode, setPlayMode] = useState<PlayMode>(PlayModeValues.OFF);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  /**
   * 检查当前字幕是否播放完毕，若完毕则执行相应操作
   * @param action - 执行的操作类型：'pause' 暂停视频，'loop' 跳回字幕开始位置
   * @returns 是否应该停止后续处理
   */
  const handleSubtitleCompletion = (action: "pause" | "loop"): boolean => {
    if (!videoRef.current || !subtitle || currentSubtitleIndex === -1) {
      return false;
    }

    const currentTimeMs = videoRef.current.currentTime * 1000;
    const currentEntry = subtitle.entries[currentSubtitleIndex];

    if (currentTimeMs >= currentEntry.endTime) {
      if (action === "pause") {
        videoRef.current.pause();
      } else if (action === "loop") {
        videoRef.current.currentTime = currentEntry.startTime / 1000;
      }
      return true;
    }
    return false;
  };

  /**
   * 合并视频和字幕初始化错误
   */
  useEffect(() => {
    if (videoError) {
      setError(videoError);
    } else if (subtitleError) {
      setError(subtitleError);
    }
  }, [videoError, subtitleError]);

  /**
   * 视频加载完成后跳转到保存的字幕索引
   */
  useSubtitleJump(
    videoRef,
    subtitle,
    savedSubtitleIndex,
    setCurrentSubtitleIndex
  );

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

      // 单句暂停模式：检查当前字幕是否已播放完毕
      if (
        playMode === PlayModeValues.SINGLE_PAUSE &&
        currentSubtitleIndex !== -1
      ) {
        // 如果当前时间超过了当前字幕的结束时间，立即暂停
        if (handleSubtitleCompletion("pause")) {
          // 不改变 currentSubtitleIndex，保持在当前字幕
          return;
        }
      }

      // 单句循环模式：检查当前字幕是否已播放完毕
      if (
        playMode === PlayModeValues.SINGLE_LOOP &&
        currentSubtitleIndex !== -1
      ) {
        // 如果当前时间超过了当前字幕的结束时间，跳回到字幕开始位置继续播放
        if (handleSubtitleCompletion("loop")) {
          // 不改变 currentSubtitleIndex，保持在当前字幕
          return;
        }
      }

      // 只有当 index 不是 -1 时才更新 currentSubtitleIndex
      if (index !== -1) {
        setCurrentSubtitleIndex(index);
      }
    };

    const video = videoRef.current;
    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtitle, playMode, currentSubtitleIndex]);

  /**
   * 监听视频播放/暂停状态
   */
  useEffect(() => {
    if (!videoRef.current) return;

    const handlePlay = () => {
      setIsPlaying(true);
    };
    const handlePause = () => setIsPlaying(false);

    const video = videoRef.current;
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [playMode, currentSubtitleIndex, subtitle]);

  /**
   * 离开页面时保存当前字幕索引
   */
  useEffect(() => {
    const saveSubtitleIndex = async () => {
      if (mediaId && currentSubtitleIndex >= 0) {
        await MediaDatabaseService.updateVideoSubtitleIndex(
          Number(mediaId),
          currentSubtitleIndex
        );
      }
    };

    // 监听页面卸载事件
    const handleBeforeUnload = () => {
      if (mediaId && currentSubtitleIndex >= 0) {
        // 使用 sendBeacon 或同步方式保存，但由于 IndexedDB 是异步的，
        // 我们在组件卸载时保存
        saveSubtitleIndex();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // 组件卸载时保存
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      saveSubtitleIndex();
    };
  }, [mediaId, currentSubtitleIndex]);

  /**
   * 上一句 - 跳转到上一个字幕条目的开始时间
   */
  const handlePreviousSubtitle = () => {
    if (!videoRef.current || !subtitle) return;

    if (currentSubtitleIndex > 0) {
      const previousEntry = subtitle.entries[currentSubtitleIndex - 1];
      videoRef.current.currentTime = previousEntry.startTime / 1000; // 转换为秒
      setCurrentSubtitleIndex(currentSubtitleIndex - 1);
      videoRef.current.play();
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
      setCurrentSubtitleIndex(currentSubtitleIndex + 1);
      videoRef.current.play();
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
      // 单句暂停模式：播放时检查是否需要跳回到当前字幕的开始位置
      if (
        playMode === PlayModeValues.SINGLE_PAUSE &&
        currentSubtitleIndex !== -1 &&
        subtitle
      ) {
        // 如果当前时间超过了当前字幕的结束时间，跳回到字幕开始位置
        handleSubtitleCompletion("loop");
      }
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
   * 处理更多按钮点击
   */
  const handleMoreClick = () => {
    setIsMoreModalOpen(true);
  };

  /**
   * 处理更多弹窗关闭
   */
  const handleMoreModalClose = () => {
    setIsMoreModalOpen(false);
  };

  /**
   * 处理字幕双击事件 - 跳转到对应时间
   */
  const handleSubtitleClick = (startTimeMs: number) => {
    if (!videoRef.current) return;
    // 将毫秒转换为秒
    videoRef.current.currentTime = startTimeMs / 1000;
  };

  /**
   * 处理播放速度变化
   */
  const handlePlaybackSpeedChange = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
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
      <div className="p-3 flex justify-between items-center">
        {/* 返回 */}
        <Button
          type="text"
          shape="circle"
          onClick={handleGoBack}
          icon={<div className="i-mdi-arrow-left text-xl" />}
        />
        {/* 更多 */}
        <Button
          type="text"
          shape="circle"
          onClick={handleMoreClick}
          icon={<div className="i-mdi-dots-vertical text-xl" />}
        />
      </div>

      {/* 更多弹窗 */}
      <Modal
        title="更多选项"
        open={isMoreModalOpen}
        onCancel={handleMoreModalClose}
        footer={null}
      >
        <div className="flex flex-col gap-2">
          {/* 播放模式 */}
          <div>播放模式</div>
          <Radio.Group
            block
            value={playMode}
            onChange={(e) => setPlayMode(e.target.value as PlayMode)}
            optionType="button"
            buttonStyle="solid"
            options={[
              {
                label: "关闭",
                value: PlayModeValues.OFF,
              },
              {
                label: "单句暂停",
                value: PlayModeValues.SINGLE_PAUSE,
              },
              {
                label: "单句循环",
                value: PlayModeValues.SINGLE_LOOP,
              },
            ]}
          />
          {/* 播放速度 */}
          <div>播放速度</div>
          <Radio.Group
            block
            value={playbackSpeed}
            onChange={(e) => handlePlaybackSpeedChange(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            options={[
              {
                label: "0.6x",
                value: 0.6,
              },
              {
                label: "0.8x",
                value: 0.8,
              },
              {
                label: "1.0x",
                value: 1.0,
              },
            ]}
          />
        </div>
      </Modal>

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
