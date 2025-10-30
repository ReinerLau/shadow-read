import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

/**
 * 视频元数据类型定义
 */
interface VideoMetadata {
  /** 视频第一帧缩略图 (Data URL) */
  thumbnail: string;
  /** 视频时长格式化字符串 (HH:MM:SS) */
  duration: string;
  /** 视频编码格式 (e.g., "h264", "vp9", "av1") */
  videoCodec?: string;
  /** 音频编码格式 (e.g., "aac", "opus", "mp3") */
  audioCodec?: string;
  /** 容器格式 (e.g., "mp4", "webm", "mkv") */
  container?: string;
}

/**
 * FFmpeg 单例实例
 */
const ffmpegInstance: FFmpeg | null = null;

/**
 * 获取或初始化 FFmpeg 实例
 * 使用延迟初始化模式，仅在需要时加载 FFmpeg WASM 文件
 * @returns Promise<FFmpeg> 返回初始化的 FFmpeg 实例，如果初始化失败则返回 null
 */
async function getFFmpegInstance(): Promise<FFmpeg> {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  // 动态导入 FFmpeg 模块
  const ffmpeg = new FFmpeg();

  const coreURL = "/ffmpeg-core/ffmpeg-core.js";
  const wasmURL = "/ffmpeg-core/ffmpeg-core.wasm";

  await ffmpeg.load({
    coreURL: await toBlobURL(coreURL, "text/javascript"),
    wasmURL: await toBlobURL(wasmURL, "application/wasm"),
  });

  return ffmpeg;
}

/**
 * 使用 FFmpeg 提取视频编码信息
 * 解析视频文件的编码格式、音频编解码器和容器格式
 * @param file - 视频文件对象
 * @returns Promise<object> 返回包含 videoCodec、audioCodec 和 container 的对象
 */
export async function extractEncodingFormat(file: File): Promise<
  | {
      videoCodec: string;
      audioCodec: string;
    }
  | false
> {
  try {
    const ffmpeg = await getFFmpegInstance();

    // 将文件转换为 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // 将文件写入 FFmpeg 虚拟文件系统
    const inputFileName = "input_video";
    await ffmpeg.writeFile(inputFileName, uint8Array);

    // 执行 ffprobe 命令获取媒体信息
    await ffmpeg.ffprobe([
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      inputFileName,
      "-o",
      `${inputFileName}.json`,
    ]);

    // 读取输出文件
    const outputData = await ffmpeg.readFile(`${inputFileName}.json`);
    const jsonContent = new TextDecoder().decode(outputData as Uint8Array);
    const probeData = JSON.parse(jsonContent);
    const videoCodec = probeData.streams[0].codec_name;
    const audioCodec = probeData.streams[1].codec_name;

    await ffmpeg.deleteFile(inputFileName);

    return {
      videoCodec: videoCodec,
      audioCodec: audioCodec,
    };
  } catch {
    return false;
  }
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
 * 在单次视频加载过程中的 onloadeddata 事件中同时提取缩略图、时长和编码信息，避免重复加载视频
 * @param file - 视频文件对象
 * @returns Promise<VideoMetadata> 返回包含缩略图 Data URL、时长和编码信息的元数据对象
 */
export async function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  // 第一步：提取视频编码格式信息（在加载视频前调用）
  const encodingInfo = await extractEncodingFormat(file);

  // 第二步：创建 Promise 来提取缩略图和时长
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
        ...(encodingInfo || {}),
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
