import { useEffect, useRef, type RefObject } from "react";
import type { Subtitle } from "../types";

/**
 * 视频加载完成后跳转到保存的字幕索引的 Hook
 * @param videoRef - 视频元素的引用
 * @param subtitle - 字幕数据
 * @param savedSubtitleIndex - 保存的字幕索引
 * @param setCurrentSubtitleIndex - 设置当前字幕索引的函数
 */
export function useSubtitleJump(
  videoRef: RefObject<HTMLVideoElement | null>,
  subtitle: Subtitle | null,
  savedSubtitleIndex: number | null,
  setCurrentSubtitleIndex: (index: number) => void
) {
  const hasJumpedToSaved = useRef<boolean>(false);

  useEffect(() => {
    if (
      !videoRef.current ||
      !subtitle ||
      savedSubtitleIndex === null ||
      hasJumpedToSaved.current
    )
      return;

    const handleLoadedMetadata = () => {
      if (
        videoRef.current &&
        subtitle &&
        savedSubtitleIndex !== null &&
        !hasJumpedToSaved.current
      ) {
        const savedEntry = subtitle.entries[savedSubtitleIndex];
        videoRef.current.currentTime = savedEntry.startTime / 1000;
        setCurrentSubtitleIndex(savedSubtitleIndex);
        hasJumpedToSaved.current = true; // 标记已跳转，避免重复跳转
      }
    };

    const video = videoRef.current;
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    // 如果视频已经加载完成，直接跳转
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [subtitle, savedSubtitleIndex, videoRef, setCurrentSubtitleIndex]);
}
