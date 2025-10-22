import type { DBSchema } from "idb";

/**
 * 扑克牌点数类型
 * D: 大王, X: 小王, 2-A: 普通牌点
 */
export type CardValue =
  | "D"
  | "X"
  | "2"
  | "A"
  | "K"
  | "Q"
  | "J"
  | "10"
  | "9"
  | "8"
  | "7"
  | "6"
  | "5"
  | "4"
  | "3";

/** 玩家类型定义 */
export type PlayerType = "landlord" | "farmer1" | "farmer2";

/**
 * 玩家手牌数据
 */
export interface PlayerCards {
  /** 地主手牌 */
  landlord: CardValue[];
  /** 下家手牌 */
  farmer1: CardValue[];
  /** 顶家手牌 */
  farmer2: CardValue[];
}

/**
 * 对局数据类型定义
 */
export interface Game {
  /** 对局ID */
  id: number;
  /** 对局标题 */
  title: string;
  /** 玩家手牌 */
  cards: PlayerCards;
  /** 首发玩家 */
  firstPlayer: PlayerType;
}

/**
 * IndexedDB 数据库结构定义
 */
export interface GameDB extends DBSchema {
  games: {
    key: number;
    value: Game;
    indexes: { title: string };
  };
}

/**
 * 媒体文件数据类型定义
 */
export interface MediaFile {
  /** 文件句柄ID */
  id: number;
  /** 文件名称 */
  name: string;
  /** 文件句柄（使用 structuredClone 序列化） */
  handle: FileSystemFileHandle;
  /** 视频第一帧缩略图 (Data URL) */
  thumbnail?: string;
  /** 视频时长格式化字符串 (HH:MM:SS) */
  duration?: string;
}

/**
 * 媒体 IndexedDB 数据库结构定义
 */
export interface MediaDB extends DBSchema {
  videos: {
    key: number;
    value: MediaFile;
    indexes: { name: string };
  };
  subtitles: {
    key: number;
    value: MediaFile;
    indexes: { name: string };
  };
}

/**
 * 扑克牌组件属性
 */
export interface CardProps {
  /** 扑克牌点数 */
  value: CardValue;
  /** 是否被选中 */
  selected?: boolean;
  /** 点击事件回调 */
  onClick?: () => void;
}

/**
 * 手牌展示组件属性
 */
export interface HandCardsProps {
  /** 手牌数组 */
  cards: CardValue[];
  /** 选中的牌的索引数组 */
  selectedIndexes?: number[];
  /** 是否禁用选牌功能 */
  disabled?: boolean;
  /** 选中的牌的索引回调 */
  onSelectionChange?: (selectedIndexes: number[]) => void;
}

/**
 * 牌堆数据类型
 */
export interface PlayedCardsData {
  /** 出牌的玩家身份 */
  player: PlayerType | null;
  /** 出的牌 */
  cards: CardValue[];
}

/**
 * 牌堆组件属性
 */
export interface PlayedCardsProps {
  /** 当前牌堆中的牌（最近一次出牌） */
  playedCards: CardValue[];
  /** 出牌的玩家身份 */
  playedBy?: PlayerType | null;
}

/**
 * 游戏历史记录快照
 * 用于撤回功能，记录每次出牌前的游戏状态
 */
export interface GameSnapshot {
  /** 手牌状态 */
  cards: PlayerCards;
  /** 当前玩家 */
  currentPlayer: PlayerType;
  /** 牌堆中的牌 */
  playedCards: CardValue[];
  /** 出牌的玩家身份 */
  playedBy: PlayerType | null;
  /** 游戏是否结束 */
  isGameEnded: boolean;
}

/** Player 组件的属性接口 */
export interface PlayerProps {
  /** 玩家类型 */
  playerType: PlayerType;
  /** 玩家手牌 */
  cards: CardValue[];
  /** 选中的手牌索引 */
  selectedIndexes: number[];
  /** 是否为当前轮次的玩家 */
  isCurrentPlayer: boolean;
  /** 是否为编辑模式 */
  isEditMode: boolean;
  /** 游戏是否已结束 */
  isGameEnded: boolean;
  /** 手牌选择变化回调 */
  onSelectionChange: (indexes: number[]) => void;
  /** 过牌操作回调 */
  onPass: (player: PlayerType) => void;
  /** 出牌操作回调 */
  onPlayCards: (player: PlayerType) => void;
  /** 编辑手牌操作回调 */
  onEditCards: (player: PlayerType) => void;
  /** 设置首发玩家回调 */
  onSetFirstPlayer?: (player: PlayerType) => void;
}
