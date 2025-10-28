import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { Button } from "antd";
import { EditModePopup } from "../components/EditModePopup";
import { RecordingPopup } from "../components/RecordingPopup";
import SubtitleList from "../components/SubtitleList";
import { MoreModal } from "../components/MoreModal";
import { PlayModeValues, type PlayMode } from "../types";
import { useMediaInit } from "../hooks/useMediaInit";
import { useSubtitleIndexPersist } from "../hooks/useSubtitleIndexPersist";
import MediaDatabaseService from "../services/mediaDatabase";
import {
  MediaController,
  MediaTimeRange,
  MediaControlBar,
  MediaTimeDisplay,
} from "media-chrome/react";

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
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  /** 编辑模式下的精确时间（毫秒），为 null 时使用原始值 */
  const [editedTime, setEditedTime] = useState<{
    startTime: number;
    endTime: number;
  }>({
    startTime: 0,
    endTime: 0,
  });
  /** 字幕模糊状态 */
  const [subtitleBlurred, setSubtitleBlurred] = useState<boolean>(false);
  /** 是否正在拖动进度条 */
  const isSeeking = useRef<boolean>(false);
  /** 录音模式是否显示 */
  const [recordingMode, setRecordingMode] = useState<boolean>(false);

  /**
   * 根据播放模式检查并处理字幕播放逻辑
   * 优先判断是否为编辑模式或录音模式，这两种模式的逻辑与单句暂停相同
   * @param shouldSeekToStart 是否应该跳转到字幕开始位置（播放时为 true，时间更新时为 false）
   * @returns {boolean} 是否应该更新 currentSubtitleIndex
   */
  const checkPlayMode = (shouldSeekToStart: boolean = false): boolean => {
    if (!subtitle || currentSubtitleIndex === -1 || !videoRef.current)
      return true;

    const currentTimeMs = videoRef.current.currentTime * 1000;
    const currentEntry = subtitle.entries[currentSubtitleIndex];

    // 优先判断编辑模式或录音模式：逻辑与单句暂停相同
    if (editMode || recordingMode) {
      // 在编辑模式下使用编辑后的精确时间，如果没有编辑则使用原始精确时间
      // 在录音模式下使用原始精确时间
      const preciseStartTime =
        editMode && editedTime?.startTime !== undefined
          ? editedTime.startTime
          : currentEntry.preciseStartTime;
      const preciseEndTime =
        editMode && editedTime?.endTime !== undefined
          ? editedTime.endTime
          : currentEntry.preciseEndTime;

      if (shouldSeekToStart) {
        videoRef.current.currentTime = preciseStartTime / 1000;
      }

      // 如果当前时间超过了当前字幕的精确结束时间
      if (currentTimeMs >= preciseEndTime) {
        // 时间更新时：立即暂停
        videoRef.current.pause();
      }
      // 不走其他播放模式
      return false;
    }

    // 单句暂停模式：检查当前字幕是否已播放完毕
    if (playMode === PlayModeValues.SINGLE_PAUSE) {
      if (shouldSeekToStart) {
        videoRef.current.currentTime = currentEntry.preciseStartTime / 1000;
      }
      // 如果当前时间超过了当前字幕的精确结束时间
      if (currentTimeMs >= currentEntry.preciseEndTime) {
        videoRef.current.pause();
      }
      // 不更新 currentSubtitleIndex，保持在当前字幕
      return false;
    }

    // 单句循环模式：检查当前字幕是否已播放完毕
    if (playMode === PlayModeValues.SINGLE_LOOP) {
      // 如果当前时间超过了当前字幕的精确结束时间，跳回到字幕精确开始位置继续播放
      if (currentTimeMs >= currentEntry.preciseEndTime) {
        videoRef.current.currentTime = currentEntry.preciseStartTime / 1000;
      }
      // 不更新 currentSubtitleIndex，保持在当前字幕
      return false;
    }

    return true;
  };

  /**
   * 视频加载元数据后跳转到保存的字幕索引
   */
  const handleLoadedMetadata = () => {
    if (!subtitle || savedSubtitleIndex < 0) return;
    const savedEntry = subtitle.entries[savedSubtitleIndex];
    videoRef.current!.currentTime = savedEntry.startTime / 1000;
    setCurrentSubtitleIndex(savedSubtitleIndex);
  };

  /**
   * 监听视频播放时间并同步字幕索引
   */
  const handleTimeUpdate = () => {
    if (isSeeking.current) return;
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
   * 处理 seeking 开始事件
   */
  const handleSeeking = () => {
    isSeeking.current = true;
  };

  /**
   * 处理 seeked 结束事件
   */
  const handleSeeked = () => {
    isSeeking.current = false;
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

    if (currentSubtitleIndex < 1) return;
    const previousEntry = subtitle.entries[currentSubtitleIndex - 1];
    videoRef.current.currentTime = previousEntry.startTime / 1000; // 转换为秒
    setCurrentSubtitleIndex(currentSubtitleIndex - 1);
    videoRef.current.play();
  };

  /**
   * 下一句 - 跳转到下一个字幕条目的开始时间
   */
  const handleNextSubtitle = () => {
    if (!videoRef.current || !subtitle) return;
    if (currentSubtitleIndex === subtitle.entries.length - 1) return;
    const nextEntry = subtitle.entries[currentSubtitleIndex + 1];
    videoRef.current.currentTime = nextEntry.startTime / 1000; // 转换为秒
    setCurrentSubtitleIndex(currentSubtitleIndex + 1);
    videoRef.current.play();
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
   * 处理字幕点击事件 - 跳转到对应时间
   */
  const handleSubtitleClick = (subtitleIndex: number) => {
    if (!videoRef.current || !subtitle || subtitleIndex === -1) return;
    // 获取对应索引的字幕条目
    const entry = subtitle.entries[subtitleIndex];
    // 将毫秒转换为秒
    videoRef.current.currentTime = entry.startTime / 1000;
    // 更新当前字幕索引
    setCurrentSubtitleIndex(subtitleIndex);
  };

  /**
   * 处理进入编辑模式
   */
  const handleEnterEditMode = (subtitleIndex: number) => {
    if (!subtitle || subtitleIndex === -1 || !videoRef.current) return;
    const targetEntry = subtitle.entries[subtitleIndex];
    // 初始化编辑时间为原始精确时间
    setEditedTime({
      startTime: targetEntry.preciseStartTime,
      endTime: targetEntry.preciseEndTime,
    });
    // 跳转到对应字幕的开始位置
    videoRef.current.currentTime = targetEntry.startTime / 1000;
    // 暂停播放
    videoRef.current.pause();
    // 更新当前字幕索引
    setCurrentSubtitleIndex(subtitleIndex);
    setEditMode(true);
  };

  /**
   * 处理退出编辑模式
   */
  const handleExitEditMode = () => {
    setEditMode(false);
    // 重置编辑时间
    setEditedTime({
      startTime: 0,
      endTime: 0,
    });
  };

  /**
   * 处理时间偏移
   * @param offset 偏移量（毫秒）
   * @param isStartTime 是否是开始时间
   * @param isForward 是否向前偏移
   */
  const handleTimeOffset = (
    offset: number,
    isStartTime: boolean,
    isForward: boolean
  ) => {
    setEditedTime((prev) => {
      const newTime = isStartTime ? prev.startTime! : prev.endTime!;
      const newOffset = isForward ? newTime + offset : newTime - offset;
      return {
        ...prev,
        [isStartTime ? "startTime" : "endTime"]: newOffset,
      };
    });
  };

  /**
   * 处理保存时间偏移
   */
  const handleSaveTimeOffset = async () => {
    if (!subtitle || currentSubtitleIndex === -1 || !editedTime) return;

    try {
      // 创建新的字幕条目副本
      const updatedSubtitle = { ...subtitle };
      const currentEntry = updatedSubtitle.entries[currentSubtitleIndex];

      // 更新当前字幕条目的精确时间
      if (editedTime.startTime !== null) {
        currentEntry.preciseStartTime = editedTime.startTime;
      }
      if (editedTime.endTime !== null) {
        currentEntry.preciseEndTime = editedTime.endTime;
      }

      // 保存更新后的字幕数据到数据库
      await MediaDatabaseService.updateSubtitle(updatedSubtitle);

      // 退出编辑模式
      handleExitEditMode();
    } catch {
      // 错误处理：如果保存失败，可以显示错误提示
      // 这里可以集成 Ant Design 的 message 组件来显示错误信息
    }
  };

  /**
   * 处理播放速度变化
   */
  const handlePlaybackSpeedChange = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
  };

  /**
   * 处理进入录音模式
   */
  const handleEnterRecordingMode = (subtitleIndex: number) => {
    if (!subtitle || subtitleIndex === -1 || !videoRef.current) return;
    const targetEntry = subtitle.entries[subtitleIndex];
    // 跳转到对应字幕的开始位置
    videoRef.current.currentTime = targetEntry.startTime / 1000;
    // 暂停播放
    videoRef.current.pause();
    // 更新当前字幕索引
    setCurrentSubtitleIndex(subtitleIndex);
    setRecordingMode(true);
  };

  /**
   * 处理退出录音模式
   */
  const handleExitRecordingMode = () => {
    setRecordingMode(false);
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
    <>
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

        <div className="flex-1 flex min-h-0 w-full min-w-0 max-sm:flex-col">
          {/* 视频播放器 */}
          <div className="h-full flex-1 bg-black flex items-center justify-center max-sm:w-full max-sm:h-auto max-sm:flex-none">
            <MediaController className="h-full">
              <video
                slot="media"
                ref={videoRef}
                src={videoUrl}
                autoPlay
                className="w-full h-full max-sm:h-auto"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onSeeking={handleSeeking}
                onSeeked={handleSeeked}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                playsInline
              />
              <MediaControlBar>
                <MediaTimeRange />
                <MediaTimeDisplay showDuration className="px-2" />
              </MediaControlBar>
            </MediaController>
          </div>

          {/* 字幕列表 */}
          <div className="w-1/3 p-4 max-sm:w-full max-sm:flex-1 max-sm:min-h-0">
            {subtitle && (
              <SubtitleList
                subtitle={subtitle}
                currentIndex={currentSubtitleIndex}
                onSubtitleClick={handleSubtitleClick}
                onEnterEditMode={handleEnterEditMode}
                onEnterRecordingMode={handleEnterRecordingMode}
                subtitleBlurred={subtitleBlurred}
              />
            )}
          </div>
        </div>

        {/* 操作区域 */}
        <div className="p-3 h-20 flex gap-4 bg-white">
          <Button
            className="flex-1 h-full"
            type="text"
            onClick={handlePreviousSubtitle}
            icon={<div className="i-mdi:skip-previous text-xl" />}
          />
          <Button
            className="flex-1 h-full"
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
            className="flex-1 h-full"
            type="text"
            onClick={handleNextSubtitle}
            icon={<div className="i-mdi:skip-next text-xl" />}
          />
        </div>
      </div>
      {/* 更多弹窗 */}
      <MoreModal
        open={isMoreModalOpen}
        onCancel={handleMoreModalClose}
        onPlayModeChange={(mode) => setPlayMode(mode)}
        onPlaybackSpeedChange={(speed) => handlePlaybackSpeedChange(speed)}
        playMode={playMode}
        subtitleBlurred={subtitleBlurred}
        onSubtitleBlurChange={setSubtitleBlurred}
      />
      {/* 编辑模式 Popup */}
      <EditModePopup
        editMode={editMode}
        editedTime={editedTime}
        isPlaying={isPlaying}
        onExitEditMode={handleExitEditMode}
        onSaveTimeOffset={handleSaveTimeOffset}
        onTimeOffset={handleTimeOffset}
        onTogglePlayPause={handleTogglePlayPause}
      />
      {/* 录音模式 Popup */}
      <RecordingPopup
        recordingMode={recordingMode}
        onExitRecordingMode={handleExitRecordingMode}
        onTogglePlayPause={handleTogglePlayPause}
      />
    </>
  );
}

export default PlayPage;
