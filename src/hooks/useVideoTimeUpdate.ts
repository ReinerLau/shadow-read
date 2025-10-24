import { useEffect } from "react";
import type { Subtitle, PlayMode } from "../types";
import { PlayModeValues } from "../types";

/**
 * 监听视频播放时间并同步字幕索引
 * @param videoRef - 视频元素的引用
 * @param subtitle - 字幕数据
 * @param playMode - 播放模式
 * @param currentSubtitleIndex - 当前字幕索引
 * @param setCurrentSubtitleIndex - 更新当前字幕索引的函数
 */
export function useVideoTimeUpdate(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  subtitle: Subtitle | null,
  playMode: PlayMode,
  currentSubtitleIndex: number,
  setCurrentSubtitleIndex: (index: number) => void
) {
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
        const currentEntry = subtitle.entries[currentSubtitleIndex];
        // 如果当前时间超过了当前字幕的结束时间，立即暂停
        if (currentTimeMs >= currentEntry.endTime) {
          videoRef.current!.pause();
          // 不改变 currentSubtitleIndex，保持在当前字幕
          return;
        }
      }

      // 单句循环模式：检查当前字幕是否已播放完毕
      if (
        playMode === PlayModeValues.SINGLE_LOOP &&
        currentSubtitleIndex !== -1
      ) {
        const currentEntry = subtitle.entries[currentSubtitleIndex];
        // 如果当前时间超过了当前字幕的结束时间，跳回到字幕开始位置继续播放
        if (currentTimeMs >= currentEntry.endTime) {
          videoRef.current!.currentTime = currentEntry.startTime / 1000;
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
  }, [
    subtitle,
    playMode,
    currentSubtitleIndex,
    videoRef,
    setCurrentSubtitleIndex,
  ]);
}
