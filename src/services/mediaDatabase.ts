import { openDB, type IDBPDatabase } from "idb";
import type { MediaFile, MediaDB, Subtitle } from "../types";

/**
 * 数据库名称和版本
 */
const DB_NAME = "media";
const DB_VERSION = 7;

/**
 * 数据库实例缓存
 */
let dbInstance: IDBPDatabase<MediaDB> | null = null;

/**
 * 获取数据库实例
 * @returns Promise<IDBPDatabase<MediaDB>>
 */
async function getDB(): Promise<IDBPDatabase<MediaDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<MediaDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 创建视频存储对象仓库
      if (!db.objectStoreNames.contains("videos")) {
        const videosStore = db.createObjectStore("videos", {
          keyPath: "id",
          autoIncrement: true,
        });
        // 添加 fileHash 索引以快速查询重复文件
        videosStore.createIndex("fileHash", "fileHash", { unique: true });
      }
      // 创建字幕存储对象仓库
      if (!db.objectStoreNames.contains("subtitles")) {
        const subtitlesStore = db.createObjectStore("subtitles", {
          keyPath: "id",
          autoIncrement: true,
        });
        // 添加 videoId 索引以快速查询特定视频的字幕
        subtitlesStore.createIndex("videoId", "videoId", { unique: true });
      }
    },
  });

  return dbInstance;
}

/**
 * 分块计算文件的 SHA256 哈希值（适用于大文件）
 * @param file - 文件对象
 * @param chunkSize - 分块大小（默认 4MB）
 * @returns Promise<string> 返回文件的哈希值
 */
async function computeFileHash(
  file: File | Blob,
  chunkSize: number = 4 * 1024 * 1024
): Promise<string> {
  const chunks: Uint8Array[] = [];
  let offset = 0;

  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size);
    const chunk = file.slice(offset, end);
    chunks.push(new Uint8Array(await chunk.arrayBuffer()));
    offset = end;
  }

  // Combine chunks and hash
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    combined.set(chunk, pos);
    pos += chunk.length;
  }

  const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 媒体数据库服务类
 */
export class MediaDatabaseService {
  /**
   * 获取所有视频文件句柄
   * @returns Promise<MediaFile[]>
   */
  static async getAllVideos(): Promise<MediaFile[]> {
    const db = await getDB();
    const allVideos = await db.getAll("videos");
    // 按最后播放时间降序排列（最近播放的在前）
    return allVideos.sort((a, b) => {
      const timeA = a.lastPlayedTime ?? 0;
      const timeB = b.lastPlayedTime ?? 0;
      return timeB - timeA;
    });
  }

  /**
   * 根据ID获取视频文件句柄
   * @param id - 视频文件句柄ID
   * @returns Promise<MediaFile | undefined>
   */
  static async getVideoById(id: number): Promise<MediaFile | undefined> {
    const db = await getDB();
    return await db.get("videos", id);
  }

  /**
   * 新增视频文件句柄
   * @param mediaFile - 视频文件句柄数据
   * @returns Promise<number> 返回保存后的视频文件句柄ID
   */
  static async saveVideo(mediaFile: Omit<MediaFile, "id">): Promise<number> {
    const db = await getDB();
    const result = await db.add("videos", mediaFile as MediaFile);
    return result as number;
  }

  /**
   * 删除视频文件句柄
   * @param id - 视频文件句柄ID
   * @returns Promise<void>
   */
  static async deleteVideo(id: number): Promise<void> {
    const db = await getDB();
    await db.delete("videos", id);
  }

  /**
   * 清空所有视频文件句柄数据
   * @returns Promise<void>
   */
  static async clearAllVideos(): Promise<void> {
    const db = await getDB();
    await db.clear("videos");
  }

  /**
   * 根据文件名搜索视频文件句柄
   * @param searchTerm - 搜索关键词
   * @returns Promise<MediaFile[]>
   */
  static async searchVideosByName(searchTerm: string): Promise<MediaFile[]> {
    const db = await getDB();
    const allVideos = await db.getAll("videos");

    // 前端筛选，支持模糊匹配
    return allVideos.filter((video) =>
      video.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  /**
   * 更新视频的最后播放时间
   * @param id - 视频文件句柄ID
   * @returns Promise<void>
   */
  static async updateVideoPlayedTime(id: number): Promise<void> {
    const db = await getDB();
    const video = await db.get("videos", id);
    if (video) {
      video.lastPlayedTime = Date.now();
      await db.put("videos", video);
    }
  }

  /**
   * 为文件计算哈希值并准备保存
   * @param file - 文件对象
   * @returns Promise<string> 返回文件哈希值
   */
  static async prepareFileForStorage(file: File | Blob): Promise<string> {
    const fileHash = await computeFileHash(file);
    return fileHash;
  }

  /**
   * 保存字幕数据
   * @param subtitle - 字幕数据
   * @returns Promise<number> 返回保存后的字幕ID
   */
  static async saveSubtitle(subtitle: Omit<Subtitle, "id">): Promise<number> {
    const db = await getDB();
    const result = await db.add("subtitles", subtitle as Subtitle);
    return result as number;
  }

  /**
   * 根据视频ID获取字幕
   * @param videoId - 视频ID
   * @returns Promise<Subtitle | undefined>
   */
  static async getSubtitleByVideoId(
    videoId: number
  ): Promise<Subtitle | undefined> {
    const db = await getDB();
    const index = db.transaction("subtitles").store.index("videoId");
    return await index.get(videoId);
  }

  /**
   * 删除字幕
   * @param id - 字幕ID
   * @returns Promise<void>
   */
  static async deleteSubtitle(id: number): Promise<void> {
    const db = await getDB();
    await db.delete("subtitles", id);
  }

  /**
   * 初始化数据库
   * @returns Promise<void>
   */
  static async initializeDatabase(): Promise<void> {
    // 仅初始化数据库连接，不导入任何默认数据
    await getDB();
  }

  /**
   * 更新字幕的最后播放索引
   * @param videoId - 视频ID
   * @param subtitleIndex - 字幕索引
   * @returns Promise<void>
   */
  static async updateSubtitleIndex(
    videoId: number,
    subtitleIndex: number
  ): Promise<void> {
    const db = await getDB();
    const subtitle = await this.getSubtitleByVideoId(videoId);
    if (subtitle) {
      subtitle.lastSubtitleIndex = subtitleIndex;
      await db.put("subtitles", subtitle);
    }
  }

  /**
   * 更新字幕数据
   * @param subtitle - 更新后的字幕数据
   * @returns Promise<void>
   */
  static async updateSubtitle(subtitle: Subtitle): Promise<void> {
    const db = await getDB();
    await db.put("subtitles", subtitle);
  }

  /**
   * 根据文件哈希值获取视频
   * @param fileHash - 文件哈希值
   * @returns Promise<MediaFile | undefined>
   */
  static async getVideoByFileHash(
    fileHash: string
  ): Promise<MediaFile | undefined> {
    const db = await getDB();
    return await db.getFromIndex("videos", "fileHash", fileHash);
  }
}

/**
 * 导出数据库服务实例（单例模式）
 */
export default MediaDatabaseService;
