import { openDB, type IDBPDatabase } from "idb";
import type { Game, GameDB } from "../types";

/**
 * 数据库名称和版本
 */
const DB_NAME = "doudizhu-simulator";
const DB_VERSION = 1;

/**
 * 数据库实例缓存
 */
let dbInstance: IDBPDatabase<GameDB> | null = null;

/**
 * 获取数据库实例
 * @returns Promise<IDBPDatabase<GameDB>>
 */
async function getDB(): Promise<IDBPDatabase<GameDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<GameDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 创建对局存储对象仓库
      if (!db.objectStoreNames.contains("games")) {
        const gameStore = db.createObjectStore("games", {
          keyPath: "id",
          autoIncrement: true,
        });

        // 创建索引用于搜索
        gameStore.createIndex("title", "title", { unique: false });
      }
    },
  });

  return dbInstance;
}

/**
 * 游戏数据库服务类
 */
export class GameDatabaseService {
  /**
   * 获取所有对局
   * @returns Promise<Game[]>
   */
  static async getAllGames(): Promise<Game[]> {
    const db = await getDB();
    return await db.getAll("games");
  }

  /**
   * 根据ID获取对局
   * @param id - 对局ID
   * @returns Promise<Game | undefined>
   */
  static async getGameById(id: number): Promise<Game | undefined> {
    const db = await getDB();
    return await db.get("games", id);
  }

  /**
   * 保存对局（新增或更新）
   * @param game - 对局数据
   * @returns Promise<number> 返回保存后的对局ID
   */
  static async saveGame(game: Omit<Game, "id"> | Game): Promise<number> {
    const db = await getDB();

    // 如果是更新操作（有ID），直接保存
    if ("id" in game && game.id) {
      await db.put("games", game as Game);
      return game.id;
    }

    // 如果是新增操作（没有ID），让数据库自动分配ID
    const result = await db.add("games", game as Game);
    return result as number;
  }

  /**
   * 删除对局
   * @param id - 对局ID
   * @returns Promise<void>
   */
  static async deleteGame(id: number): Promise<void> {
    const db = await getDB();
    await db.delete("games", id);
  }

  /**
   * 清空所有对局数据
   * @returns Promise<void>
   */
  static async clearAllGames(): Promise<void> {
    const db = await getDB();
    await db.clear("games");
  }

  /**
   * 根据标题搜索对局
   * @param searchTerm - 搜索关键词
   * @returns Promise<Game[]>
   */
  static async searchGamesByTitle(searchTerm: string): Promise<Game[]> {
    const db = await getDB();
    const allGames = await db.getAll("games");

    // 前端筛选，支持模糊匹配
    return allGames.filter((game) =>
      game.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  /**
   * 初始化数据库
   * @returns Promise<void>
   */
  static async initializeDatabase(): Promise<void> {
    // 仅初始化数据库连接，不导入任何默认数据
    await getDB();
    console.log("数据库初始化完成");
  }
}

/**
 * 导出数据库服务实例（单例模式）
 */
export default GameDatabaseService;
