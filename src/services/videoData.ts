/**
 * 视频元数据类型定义
 */
interface VideoMetadata {
  /** 视频第一帧缩略图 (Data URL) */
  thumbnail: string;
  /** 视频时长格式化字符串 (HH:MM:SS) */
  duration: string;
}

/**
 * 提取视频时长
 * 从视频元素中获取时长并格式化
 * @param video - 视频元素
 * @returns string 返回格式为 "HH:MM:SS" 的时长字符串
 */
function extractVideoDuration(video: HTMLVideoElement): string {
  // 获取视频时长（秒）
  const duration = video.duration;
  // 返回格式化后的时长
  return formatDuration(duration);
}

/**
 * 提取视频第一帧缩略图
 * 从视频元素中提取第一帧并转换为 Data URL
 * @param video - 视频元素
 * @returns string 返回缩略图的 Data URL
 */
function extractVideoThumbnail(video: HTMLVideoElement): string {
  const canvas = document.createElement("canvas");

  // 设置画布尺寸与视频相同
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // 获取绘图工具
  const ctx = canvas.getContext("2d");

  // 绘制视频第一帧到画布上
  ctx!.drawImage(video, 0, 0);

  // 将画布转换为 Data URL
  const thumbnailDataUrl = canvas.toDataURL("image/jpeg");

  return thumbnailDataUrl;
}

/**
 * 获取视频元数据（缩略图和时长）
 * 在单次视频加载过程中的 onloadeddata 事件中同时提取缩略图和时长，避免重复加载视频
 * @param file - 视频文件对象
 * @returns Promise<VideoMetadata> 返回包含缩略图 Data URL 和时长的元数据对象
 */
export async function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    // 当视频第一帧数据加载完成时
    video.onloadeddata = () => {
      // 在此事件中同时执行提取时长和提取缩略图的逻辑
      const duration = extractVideoDuration(video);
      const thumbnail = extractVideoThumbnail(video);

      // 释放临时URL
      URL.revokeObjectURL(url);

      resolve({
        thumbnail,
        duration,
      });
    };
    // 预加载视频数据，触发 onloadeddata 事件
    video.preload = "auto";
    video.src = url;
  });
}

/**
 * 将视频时长（秒）转换为 "HH:MM:SS" 格式字符串
 * @param seconds - 视频时长（秒）
 * @returns string 返回格式为 "HH:MM:SS" 的时长字符串
 * @example
 * formatDuration(3661) // 返回 "01:01:01"
 * formatDuration(125) // 返回 "00:02:05"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return [hours, minutes, secs]
    .map((unit) => String(unit).padStart(2, "0"))
    .join(":");
}
