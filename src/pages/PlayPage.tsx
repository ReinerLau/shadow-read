import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { Button, Modal, Radio } from "antd";
import SubtitleList from "../components/SubtitleList";
import { PlayModeValues, type PlayMode } from "../types";
import { useMediaInit } from "../hooks/useMediaInit";
import { useSubtitleIndexPersist } from "../hooks/useSubtitleIndexPersist";

/**
 * 播放页组件
 * 用于播放导入的本地视频文件
 */
function PlayPage() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const { videoUrl, subtitle, savedSubtitleIndex, error } =
    useMediaInit(mediaId);
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState<number>(-1);
  const [isMoreModalOpen, setIsMoreModalOpen] = useState<boolean>(false);
  const [playMode, setPlayMode] = useState<PlayMode>(PlayModeValues.OFF);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  /**
   * 根据播放模式检查并处理字幕播放逻辑
   * @param shouldSeekToStart 是否应该跳转到字幕开始位置（播放时为 true，时间更新时为 false）
   * @returns {boolean} 是否应该更新 currentSubtitleIndex
   */
  const checkPlayMode = (shouldSeekToStart: boolean = false): boolean => {
    if (!subtitle || currentSubtitleIndex === -1 || !videoRef.current)
      return true;

    const currentTimeMs = videoRef.current.currentTime * 1000;
    const currentEntry = subtitle.entries[currentSubtitleIndex];

    // 单句暂停模式：检查当前字幕是否已播放完毕
    if (playMode === PlayModeValues.SINGLE_PAUSE) {
      // 如果当前时间超过了当前字幕的精确结束时间
      if (currentTimeMs >= currentEntry.preciseEndTime) {
        if (shouldSeekToStart) {
          // 播放时：跳回到字幕精确开始位置
          videoRef.current.currentTime = currentEntry.preciseStartTime / 1000;
        } else {
          // 时间更新时：立即暂停
          videoRef.current.pause();
        }
        // 不更新 currentSubtitleIndex，保持在当前字幕
        return false;
      }
    }

    // 单句循环模式：检查当前字幕是否已播放完毕
    if (playMode === PlayModeValues.SINGLE_LOOP) {
      // 如果当前时间超过了当前字幕的精确结束时间，跳回到字幕精确开始位置继续播放
      if (currentTimeMs >= currentEntry.preciseEndTime) {
        videoRef.current.currentTime = currentEntry.preciseStartTime / 1000;
        // 不更新 currentSubtitleIndex，保持在当前字幕
        return false;
      }
    }

    return true;
  };

  /**
   * 视频加载元数据后跳转到保存的字幕索引
   */
  const handleLoadedMetadata = () => {
    if (subtitle && savedSubtitleIndex) {
      const savedEntry = subtitle.entries[savedSubtitleIndex];
      videoRef.current!.currentTime = savedEntry.startTime / 1000;
      setCurrentSubtitleIndex(savedSubtitleIndex);
    }
  };

  /**
   * 监听视频播放时间并同步字幕索引
   */
  const handleTimeUpdate = () => {
    if (!subtitle) return;

    const currentTimeMs = videoRef.current!.currentTime * 1000 || 0; // 转换为毫秒

    // 检查播放模式是否允许更新字幕索引
    if (!checkPlayMode()) {
      return;
    }

    // 查找当前时间对应的字幕索引
    const index = subtitle.entries.findIndex(
      (entry) =>
        currentTimeMs >= entry.startTime && currentTimeMs < entry.endTime
    );

    // 只有当 index 不是 -1 时才更新 currentSubtitleIndex
    if (index !== -1) {
      setCurrentSubtitleIndex(index);
    }
  };

  /**
   * 离开页面时保存当前字幕索引
   */
  useSubtitleIndexPersist(mediaId, currentSubtitleIndex);

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
      checkPlayMode(true);
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
   * 处理字幕长按事件 - 跳转到对应时间并暂停视频
   */
  const handleSubtitleLongPress = (startTimeMs: number) => {
    if (!videoRef.current) return;
    // 将毫秒转换为秒
    videoRef.current.currentTime = startTimeMs / 1000;
    // 暂停视频
    videoRef.current.pause();
    setIsPlaying(false);
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
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-lg text-red-600">{error || "无法播放视频"}</div>
        </div>
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
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay
        className="w-full"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* 字幕列表 */}
      <div className="flex-1 min-h-0 p-4">
        {subtitle && (
          <SubtitleList
            subtitle={subtitle}
            currentIndex={currentSubtitleIndex}
            onSubtitleClick={handleSubtitleClick}
            onSubtitleLongPress={handleSubtitleLongPress}
          />
        )}
      </div>

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
