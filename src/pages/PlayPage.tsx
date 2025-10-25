import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { Button, Modal, Radio, InputNumber } from "antd";
import { Popup } from "antd-mobile";
import SubtitleList from "../components/SubtitleList";
import { PlayModeValues, type PlayMode } from "../types";
import { useMediaInit } from "../hooks/useMediaInit";
import { useSubtitleIndexPersist } from "../hooks/useSubtitleIndexPersist";

/**
 * 将毫秒转换为 HH:MM:SS.mmm 格式的时间字符串
 * @param milliseconds 毫秒数
 * @returns 格式化后的时间字符串
 */
const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const ms = milliseconds % 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
};

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
  const [editMode, setEditMode] = useState<boolean>(false);
  /** 编辑模式下的精确时间（毫秒），为 null 时使用原始值 */
  const [editedTime, setEditedTime] = useState<{
    startTime: number | null;
    endTime: number | null;
  } | null>(null);
  /** 时间偏移步长（毫秒），默认 100ms */
  const [offsetStep, setOffsetStep] = useState<number>(100);

  /**
   * 根据播放模式检查并处理字幕播放逻辑
   * 优先判断是否为编辑模式，编辑模式逻辑与单句暂停相同
   * @param shouldSeekToStart 是否应该跳转到字幕开始位置（播放时为 true，时间更新时为 false）
   * @returns {boolean} 是否应该更新 currentSubtitleIndex
   */
  const checkPlayMode = (shouldSeekToStart: boolean = false): boolean => {
    if (!subtitle || currentSubtitleIndex === -1 || !videoRef.current)
      return true;

    const currentTimeMs = videoRef.current.currentTime * 1000;
    const currentEntry = subtitle.entries[currentSubtitleIndex];

    // 优先判断编辑模式：逻辑与单句暂停相同
    if (editMode) {
      // 使用编辑后的精确时间，如果没有编辑则使用原始精确时间
      const preciseStartTime =
        editedTime?.startTime ?? currentEntry.preciseStartTime;
      const preciseEndTime = editedTime?.endTime ?? currentEntry.preciseEndTime;

      // 如果当前时间超过了当前字幕的精确结束时间
      if (currentTimeMs >= preciseEndTime) {
        if (shouldSeekToStart) {
          // 播放时：跳回到字幕精确开始位置
          videoRef.current.currentTime = preciseStartTime / 1000;
        } else {
          // 时间更新时：立即暂停
          videoRef.current.pause();
        }
      }
      // 不走其他播放模式
      return false;
    }

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
   * 处理字幕点击事件 - 跳转到对应时间
   */
  const handleSubtitleClick = (subtitleIndex: number) => {
    if (!videoRef.current || !subtitle) return;
    // 获取对应索引的字幕条目
    const entry = subtitle.entries[subtitleIndex];
    // 将毫秒转换为秒
    videoRef.current.currentTime = entry.startTime / 1000;
    // 更新当前字幕索引
    setCurrentSubtitleIndex(subtitleIndex);
  };

  /**
   * 处理字幕长按事件 - 跳转到对应时间并暂停视频
   */
  const handleSubtitleLongPress = (subtitleIndex: number) => {
    if (!videoRef.current || !subtitle) return;
    // 获取对应索引的字幕条目
    const entry = subtitle.entries[subtitleIndex];
    // 将毫秒转换为秒
    videoRef.current.currentTime = entry.startTime / 1000;
    // 暂停视频
    videoRef.current.pause();
    setIsPlaying(false);
    // 更新当前字幕索引
    setCurrentSubtitleIndex(subtitleIndex);
  };

  /**
   * 处理进入编辑模式
   */
  const handleEnterEditMode = () => {
    if (!subtitle || currentSubtitleIndex === -1) return;
    const currentEntry = subtitle.entries[currentSubtitleIndex];
    // 初始化编辑时间为原始精确时间
    setEditedTime({
      startTime: currentEntry.preciseStartTime,
      endTime: currentEntry.preciseEndTime,
    });
    setEditMode(true);
  };

  /**
   * 处理退出编辑模式
   */
  const handleExitEditMode = () => {
    setEditMode(false);
    // 重置编辑时间
    setEditedTime(null);
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
      if (prev === null) return null;
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
  const handleSaveTimeOffset = () => {
    // TODO: 实现时间偏移保存逻辑
    handleExitEditMode();
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
              onEnterEditMode={handleEnterEditMode}
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
      {/* 编辑模式 Popup */}
      <Popup visible={editMode} closeOnMaskClick={false} position="bottom">
        <div className="p-4 space-y-2">
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleExitEditMode}>
              取消
            </Button>
            <Button
              className="flex-1"
              type="primary"
              onClick={handleSaveTimeOffset}
            >
              保存
            </Button>
          </div>
          {/* 步长设置 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">偏移步长</div>
            <InputNumber
              step={1}
              value={offsetStep}
              onChange={(value) => setOffsetStep(value ?? 100)}
              className="w-full"
            />
          </div>
          {/* 精确时间显示 */}
          {subtitle && currentSubtitleIndex !== -1 && (
            <div className="space-y-2">
              <div className=" p-4 bg-blue-50 rounded-lg flex items-center">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">开始时间</div>
                  <div className=" font-mono text-sm font-semibold text-blue-600">
                    {formatTime(
                      editedTime?.startTime ??
                        subtitle.entries[currentSubtitleIndex].preciseStartTime
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  {/* 向前偏移 */}
                  <Button
                    className="flex-1"
                    type="text"
                    onClick={() => handleTimeOffset(offsetStep, true, true)}
                    icon={<div className="i-mdi:menu-up text-3xl" />}
                  />
                  {/* 向后偏移 */}
                  <Button
                    className="flex-1"
                    type="text"
                    onClick={() => handleTimeOffset(offsetStep, true, false)}
                    icon={<div className="i-mdi:menu-down text-3xl" />}
                  />
                </div>
              </div>
              <div className=" p-4 bg-blue-50 rounded-lg flex items-center">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">结束时间</div>
                  <div className=" font-mono text-sm font-semibold text-blue-600">
                    {formatTime(
                      editedTime?.endTime ??
                        subtitle.entries[currentSubtitleIndex].preciseEndTime
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  {/* 向前偏移 */}
                  <Button
                    className="flex-1"
                    type="text"
                    onClick={() => handleTimeOffset(offsetStep, false, true)}
                    icon={<div className="i-mdi:menu-up text-3xl" />}
                  />
                  {/* 向后偏移 */}
                  <Button
                    className="flex-1"
                    type="text"
                    onClick={() => handleTimeOffset(offsetStep, false, false)}
                    icon={<div className="i-mdi:menu-down text-3xl" />}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="flex">
            {/* 预览 */}
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
          </div>
        </div>
      </Popup>
    </>
  );
}

export default PlayPage;
