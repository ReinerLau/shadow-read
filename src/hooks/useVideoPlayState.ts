import { useEffect, useState } from "react";

/**
 * 监听视频播放/暂停状态
 * @param videoRef - 视频元素引用
 * @returns 是否正在播放
 */
export const useVideoPlayState = (
  videoRef: React.RefObject<HTMLVideoElement | null>
) => {
  const [isPlaying, setIsPlaying] = useState(false);

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
  }, [videoRef]);

  return isPlaying;
};
