import SrtParser from "srt-parser-2";
import type { SubtitleEntry } from "../types";

/**
 * 将 SRT 时间格式 (HH:MM:SS,MMM) 转换为毫秒
 * @param timeStr - SRT 时间字符串
 * @returns 毫秒数
 */
function srtTimeToMs(timeStr: string): number {
  const [time, ms] = timeStr.split(",");
  const [hours, minutes, seconds] = time.split(":");
  return (
    parseInt(hours) * 3600000 +
    parseInt(minutes) * 60000 +
    parseInt(seconds) * 1000 +
    parseInt(ms || "0")
  );
}

/**
 * 字幕解析服务类
 */
export class SubtitleParserService {
  /**
   * 解析 SRT 字幕文件
   * @param file - 字幕文件
   * @returns Promise<SubtitleEntry[]> 解析后的字幕条目数组
   */
  static async parseSrtFile(file: File): Promise<SubtitleEntry[]> {
    const text = await file.text();
    const parser = new SrtParser();
    const parsed = parser.fromSrt(text);

    // 转换为 SubtitleEntry 格式
    return parsed.map((item) => {
      const startTime = srtTimeToMs(item.startTime);
      const endTime = srtTimeToMs(item.endTime);
      return {
        index: parseInt(item.id),
        startTime,
        endTime,
        preciseStartTime: startTime,
        preciseEndTime: endTime,
        text: item.text,
      };
    });
  }
}

/**
 * 导出字幕解析服务实例
 */
export default SubtitleParserService;
