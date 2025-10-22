import { openDB, type IDBPDatabase } from "idb";
import type { MediaFile, MediaDB } from "../types";

/**
 * 数据库名称和版本
 */
const DB_NAME = "media";
const DB_VERSION = 2;

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
        db.createObjectStore("videos", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    },
  });

  return dbInstance;
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
   * 初始化数据库
   * @returns Promise<void>
   */
  static async initializeDatabase(): Promise<void> {
    // 仅初始化数据库连接，不导入任何默认数据
    await getDB();
  }
}

/**
 * 导出数据库服务实例（单例模式）
 */
export default MediaDatabaseService;
