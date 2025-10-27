/**
 * SessionStorage 键名
 */
const VIDEO_IDS_KEY = "shadow-read-video-ids";

/**
 * SessionStorage 服务类
 * 用于管理可用的视频 ID 列表
 */
export class SessionStorageService {
  /**
   * 获取所有可用的视频 ID
   * @returns number[] 视频 ID 数组
   */
  static getAvailableVideoIds(): number[] {
    try {
      const data = sessionStorage.getItem(VIDEO_IDS_KEY);
      if (!data) return [];
      return JSON.parse(data) as number[];
    } catch {
      return [];
    }
  }

  /**
   * 添加视频 ID 到可用列表
   * @param videoId - 视频 ID
   */
  static addVideoId(videoId: number): void {
    try {
      const ids = this.getAvailableVideoIds();
      if (!ids.includes(videoId)) {
        ids.push(videoId);
        sessionStorage.setItem(VIDEO_IDS_KEY, JSON.stringify(ids));
      }
    } catch {
      // 错误处理
    }
  }

  /**
   * 从可用列表中移除视频 ID
   * @param videoId - 视频 ID
   */
  static removeVideoId(videoId: number): void {
    try {
      const ids = this.getAvailableVideoIds();
      const filteredIds = ids.filter((id) => id !== videoId);
      sessionStorage.setItem(VIDEO_IDS_KEY, JSON.stringify(filteredIds));
    } catch {
      // 错误处理
    }
  }

  /**
   * 检查视频 ID 是否在可用列表中
   * @param videoId - 视频 ID
   * @returns boolean 是否可用
   */
  static isVideoAvailable(videoId: number): boolean {
    const ids = this.getAvailableVideoIds();
    return ids.includes(videoId);
  }

  /**
   * 清空所有视频 ID
   */
  static clearAllVideoIds(): void {
    try {
      sessionStorage.removeItem(VIDEO_IDS_KEY);
    } catch {
      // 错误处理
    }
  }
}

export default SessionStorageService;
