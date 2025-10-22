import { Button, Modal, Input, message } from "antd";
import { useNavigate, useParams, useLocation } from "react-router";
import { useState, useEffect } from "react";
import Player from "../components/Player";
import PlayedCards from "../components/PlayedCards";
import GameDatabaseService from "../services/gameDatabase";
import type {
  PlayerType,
  PlayerCards,
  Game,
  CardValue,
  GameSnapshot,
} from "../types";

/** 玩家出牌顺序 */
const playerOrder: PlayerType[] = ["landlord", "farmer1", "farmer2"];

/** 有效的手牌类型 */
const validCardValues: CardValue[] = [
  "D",
  "X",
  "2",
  "A",
  "K",
  "Q",
  "J",
  "10",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
];

/**
 * 卡牌优先级映射 - 用于排序
 * 数值越大，优先级越高，排序时会放在右侧
 */
const cardPriority: Record<CardValue, number> = {
  D: 15, // 大王
  X: 14, // 小王
  "2": 13,
  A: 12,
  K: 11,
  Q: 10,
  J: 9,
  "10": 8,
  "9": 7,
  "8": 6,
  "7": 5,
  "6": 4,
  "5": 3,
  "4": 2,
  "3": 1,
};

/**
 * 对出牌进行排序
 * 规则：多张相同类型手牌优先放在左侧，不同类型的手牌按照从大到小、从左往右的顺序排列（D > X > 2 > A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3）
 * @param cards - 要排序的卡牌数组
 * @returns 排序后的卡牌数组
 */
const sortPlayedCards = (cards: CardValue[]): CardValue[] => {
  // 统计每种卡牌的数量
  const cardCount: Record<CardValue, number> = {} as Record<CardValue, number>;
  cards.forEach((card) => {
    cardCount[card] = (cardCount[card] || 0) + 1;
  });

  // 按照规则排序：先按数量降序（多张的在左侧），数量相同时按优先级降序（大牌在左侧）
  return cards.sort((a, b) => {
    const countA = cardCount[a];
    const countB = cardCount[b];

    // 如果数量不同，数量多的排在左侧（多张相同类型优先放在左侧）
    if (countA !== countB) {
      return countB - countA;
    }

    // 数量相同时，按照优先级降序排序（优先级高的排在左侧，从大到小）
    return cardPriority[b] - cardPriority[a];
  });
};

/**
 * 对手牌进行排序
 * 规则：按照手牌大小顺序排列（D > X > 2 > A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3），不考虑数量
 * @param cards - 要排序的卡牌数组
 * @returns 排序后的卡牌数组
 */
const sortHandCards = (cards: CardValue[]): CardValue[] => {
  // 按照优先级降序排序（优先级高的排在左侧，从大到小）
  return cards.sort((a, b) => {
    return cardPriority[b] - cardPriority[a];
  });
};

/**
 * 对局页面组件 - 支持正常模式和编辑模式
 * 展示斗地主对局的游戏界面，包含地主、下家、顶家的手牌和操作
 */
function GamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams<{ gameId: string }>();
  const [messageApi, contextHolder] = message.useMessage();

  /** 判断是否为编辑模式 */
  const isEditMode =
    location.pathname.startsWith("/edit-game/") || gameId === "new";
  /** 判断是否为新增模式 */
  const isNewMode = gameId === "new";

  /**
   * 当前对局信息（从数据库加载）
   */
  const [currentGame, setCurrentGame] = useState<Game | null>(null);

  /** 当前玩家选中的牌索引 */
  const [selectedCards, setSelectedCards] = useState<number[]>([]);

  /** 当前轮到的玩家 */
  const [currentPlayer, setCurrentPlayer] = useState<PlayerType>("landlord");

  /** 牌堆中的牌（最近一次出牌） */
  const [playedCards, setPlayedCards] = useState<CardValue[]>([]);

  /** 出牌的玩家身份 */
  const [playedBy, setPlayedBy] = useState<PlayerType | null>(null);

  /** 当前对局的手牌状态（可变） */
  const [currentCards, setCurrentCards] = useState<PlayerCards>({
    landlord: [],
    farmer1: [],
    farmer2: [],
  });

  /** 游戏是否已结束 */
  const [isGameEnded, setIsGameEnded] = useState<boolean>(false);

  /** 编辑模式相关状态 */
  const [gameTitle, setGameTitle] = useState<string>("");
  const [titleInputValue, setTitleInputValue] = useState<string>("");
  const [editTitleModalVisible, setEditTitleModalVisible] =
    useState<boolean>(false);
  const [editCardsModalVisible, setEditCardsModalVisible] =
    useState<boolean>(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerType | null>(null);
  const [cardsInputValue, setCardsInputValue] = useState<string>("");

  /** 保存状态 */
  const [isSaving, setIsSaving] = useState<boolean>(false);

  /** 游戏历史记录 - 用于撤回功能 */
  const [gameHistory, setGameHistory] = useState<GameSnapshot[]>([]);

  /**
   * 检查游戏是否结束
   * @param cards - 当前手牌状态
   * @returns 获胜玩家，如果游戏未结束则返回null
   */
  const checkGameEnd = (cards: PlayerCards): PlayerType | null => {
    // 检查每个玩家的手牌数量
    if (cards.landlord.length === 0) return "landlord";
    if (cards.farmer1.length === 0) return "farmer1";
    if (cards.farmer2.length === 0) return "farmer2";
    return null;
  };

  /**
   * 创建当前游戏状态的快照
   * @returns 当前游戏状态快照
   */
  const createGameSnapshot = (): GameSnapshot => {
    return {
      cards: {
        landlord: [...currentCards.landlord],
        farmer1: [...currentCards.farmer1],
        farmer2: [...currentCards.farmer2],
      },
      currentPlayer,
      playedCards: [...playedCards],
      playedBy,
      isGameEnded,
    };
  };

  /**
   * 恢复游戏状态到指定快照
   * @param snapshot - 要恢复的游戏状态快照
   */
  const restoreGameSnapshot = (snapshot: GameSnapshot) => {
    setCurrentCards(snapshot.cards);
    setCurrentPlayer(snapshot.currentPlayer);
    setPlayedCards(snapshot.playedCards);
    setPlayedBy(snapshot.playedBy);
    setIsGameEnded(snapshot.isGameEnded);
    // 清空选中的牌
    setSelectedCards([]);
  };

  /**
   * 撤回到上一次操作前的状态
   * 支持连续撤回出牌和过牌操作，直到记录清空
   */
  const handleUndo = () => {
    if (gameHistory.length === 0) {
      return;
    }

    // 获取最后一个历史记录
    const lastSnapshot = gameHistory[gameHistory.length - 1];

    // 恢复到该状态
    restoreGameSnapshot(lastSnapshot);

    // 移除最后一个历史记录
    setGameHistory((prev) => prev.slice(0, -1));
  };

  /**
   * 切换到下一个玩家
   * 如果游戏已结束（任意玩家手牌数量为0），则不进行切换
   */
  const switchToNextPlayer = () => {
    // 检查游戏是否已结束，如果已结束则不切换玩家
    if (isGameEnded) {
      return;
    }

    const currentIndex = playerOrder.indexOf(currentPlayer);
    const nextIndex = (currentIndex + 1) % playerOrder.length;
    setCurrentPlayer(playerOrder[nextIndex]);
    // 切换玩家时清空选中的牌
    setSelectedCards([]);
  };

  /**
   * 从数据库加载对局数据
   */
  useEffect(() => {
    const loadGame = async () => {
      if (isNewMode) {
        // 新增模式：设置默认值
        setCurrentGame(null);
        return;
      }

      try {
        const game = await GameDatabaseService.getGameById(Number(gameId));
        setCurrentGame(game || null);
      } catch (error) {
        console.error("加载对局失败:", error);
        messageApi.error("加载对局失败");
        navigate("/");
      }
    };

    loadGame();
  }, [gameId, isNewMode, navigate, messageApi]);

  /**
   * 根据对局数据设置首发玩家和初始手牌
   */
  useEffect(() => {
    if (isNewMode) {
      // 新增模式：设置默认值
      const defaultTitle = "新对局";
      setGameTitle(defaultTitle);
      setCurrentPlayer("landlord");
      setCurrentCards({
        landlord: [],
        farmer1: [],
        farmer2: [],
      });
      // 清空游戏历史记录
      setGameHistory([]);
    } else if (currentGame) {
      // 编辑或正常模式：使用现有数据
      setGameTitle(currentGame.title);
      setCurrentPlayer(currentGame.firstPlayer);
      setCurrentCards({
        landlord: [...currentGame.cards.landlord],
        farmer1: [...currentGame.cards.farmer1],
        farmer2: [...currentGame.cards.farmer2],
      });
      // 清空游戏历史记录（每次加载对局时重置）
      setGameHistory([]);
    }
  }, [currentGame, isNewMode]);

  /**
   * 监听手牌变化，检查游戏是否结束
   */
  useEffect(() => {
    // 只在手牌状态有效时检查游戏结束
    if (
      currentCards.landlord.length > 0 ||
      currentCards.farmer1.length > 0 ||
      currentCards.farmer2.length > 0
    ) {
      const gameWinner = checkGameEnd(currentCards);
      if (gameWinner && !isGameEnded) {
        setIsGameEnded(true);
      }
    }
  }, [currentCards, isGameEnded]);

  /**
   * 返回首页
   */
  const handleGoBack = () => {
    navigate("/");
  };

  /**
   * 重来功能 - 重置对局到初始状态
   */
  const handleRestart = () => {
    if (currentGame) {
      // 重置手牌状态为初始状态
      setCurrentCards({
        landlord: [...currentGame.cards.landlord],
        farmer1: [...currentGame.cards.farmer1],
        farmer2: [...currentGame.cards.farmer2],
      });
      // 重置当前玩家为首发玩家
      setCurrentPlayer(currentGame.firstPlayer);
      // 清空选中的牌
      setSelectedCards([]);
      // 清空牌堆
      setPlayedCards([]);
      // 清空出牌玩家身份
      setPlayedBy(null);
      // 重置游戏结束状态
      setIsGameEnded(false);
      // 清空游戏历史记录
      setGameHistory([]);
    }
  };

  /**
   * 验证手牌输入是否有效
   * @param input - 输入的手牌字符串
   * @returns 验证结果和错误信息
   */
  const validateCardsInput = (
    input: string
  ): { isValid: boolean; cards: CardValue[]; error?: string } => {
    // 自动移除所有空白符（包括空格、制表符、换行符等）
    const cleanedInput = input.replace(/\s/g, "");
    if (!cleanedInput) {
      return { isValid: true, cards: [] };
    }

    // 通过字符切割，特殊处理10
    const cards: CardValue[] = [];
    let i = 0;

    while (i < cleanedInput.length) {
      let cardStr = "";

      // 检查是否为10（两个字符）
      if (
        i < cleanedInput.length - 1 &&
        cleanedInput.slice(i, i + 2) === "10"
      ) {
        cardStr = "10";
        i += 2;
      } else {
        // 单个字符的牌
        cardStr = cleanedInput[i];
        i += 1;
      }

      // 转换为大写进行匹配，支持大小写兼容
      const upperCardStr = cardStr.toUpperCase();
      if (!validCardValues.includes(upperCardStr as CardValue)) {
        return {
          isValid: false,
          cards: [],
          error: `无效的手牌类型: ${cardStr}。有效类型: ${validCardValues.join(
            ", "
          )}`,
        };
      }
      cards.push(upperCardStr as CardValue);
    }

    // 检查手牌数量限制
    const maxCards = editingPlayer === "landlord" ? 20 : 17;
    if (cards.length > maxCards) {
      return {
        isValid: false,
        cards: [],
        error: `${
          editingPlayer === "landlord" ? "地主" : "农民"
        }手牌数量不能超过${maxCards}张`,
      };
    }

    return { isValid: true, cards };
  };

  /**
   * 处理对局名称编辑
   */
  const handleEditTitle = () => {
    // 将当前标题设置为输入框的初始值
    setTitleInputValue(gameTitle);
    setEditTitleModalVisible(true);
  };

  /**
   * 确认修改对局名称
   */
  const handleConfirmEditTitle = () => {
    if (titleInputValue.trim()) {
      // 只有确认时才同步到 gameTitle
      setGameTitle(titleInputValue.trim());
      setEditTitleModalVisible(false);
      setTitleInputValue("");
      messageApi.success("对局名称已更新");
    } else {
      messageApi.error("对局名称不能为空");
    }
  };

  /**
   * 处理手牌编辑
   * @param player - 要编辑的玩家
   */
  const handleEditCards = (player: PlayerType) => {
    setEditingPlayer(player);
    // 设置当前手牌作为初始值，直接连接字符不用空格分隔
    const currentPlayerCards = currentCards[player];
    setCardsInputValue(currentPlayerCards.join(""));
    setEditCardsModalVisible(true);
  };

  /**
   * 确认修改手牌
   */
  const handleConfirmEditCards = () => {
    if (!editingPlayer) return;

    const validation = validateCardsInput(cardsInputValue);
    if (!validation.isValid) {
      messageApi.error(validation.error);
      return;
    }

    // 对手牌进行排序并更新
    const sortedCards = sortHandCards([...validation.cards]);
    setCurrentCards((prev) => ({
      ...prev,
      [editingPlayer]: sortedCards,
    }));

    setEditCardsModalVisible(false);
    setEditingPlayer(null);
    setCardsInputValue("");
    messageApi.success("手牌已更新");
  };

  /**
   * 取消编辑
   */
  const handleCancelEdit = () => {
    setEditTitleModalVisible(false);
    setEditCardsModalVisible(false);
    setEditingPlayer(null);
    setCardsInputValue("");
    setTitleInputValue("");
  };

  /**
   * 设置首发玩家
   * @param player - 要设置为首发的玩家
   */
  const handleSetFirstPlayer = (player: PlayerType) => {
    if (isEditMode) {
      setCurrentPlayer(player);
    }
  };

  /**
   * 保存对局到数据库
   */
  const handleSaveGame = async () => {
    if (!gameTitle.trim()) {
      messageApi.error("对局名称不能为空");
      return;
    }

    // 检查是否所有玩家都有手牌
    if (
      currentCards.landlord.length === 0 &&
      currentCards.farmer1.length === 0 &&
      currentCards.farmer2.length === 0
    ) {
      messageApi.error("请至少为一个玩家设置手牌");
      return;
    }

    setIsSaving(true);

    try {
      const gameData: Omit<Game, "id"> | Game = {
        ...(currentGame?.id ? { id: currentGame.id } : {}),
        title: gameTitle.trim(),
        firstPlayer: currentPlayer,
        cards: {
          landlord: [...currentCards.landlord],
          farmer1: [...currentCards.farmer1],
          farmer2: [...currentCards.farmer2],
        },
      };

      await GameDatabaseService.saveGame(gameData);

      if (isNewMode) {
        messageApi.success("对局创建成功");
      } else {
        messageApi.success("对局保存成功");
      }

      // 保存成功后跳转到首页
      navigate("/");
    } catch (error) {
      console.error("保存对局失败:", error);
      messageApi.error("保存对局失败");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 处理过牌操作
   * @param player - 玩家身份 ('landlord' | 'farmer1' | 'farmer2')
   */
  const handlePass = (player: PlayerType) => {
    // 检查游戏是否已结束
    if (isGameEnded) {
      return;
    }

    // 检查是否轮到该玩家
    if (player !== currentPlayer) {
      return;
    }

    // 在过牌前保存当前游戏状态快照
    const snapshot = createGameSnapshot();
    setGameHistory((prev) => [...prev, snapshot]);

    // 切换到下一个玩家（会自动清空选中的牌）
    switchToNextPlayer();
  };

  /**
   * 处理出牌操作
   * @param player - 玩家身份 ('landlord' | 'farmer1' | 'farmer2')
   */
  const handlePlayCards = (player: PlayerType) => {
    // 检查游戏是否已结束
    if (isGameEnded) {
      return;
    }

    // 检查是否轮到该玩家
    if (player !== currentPlayer) {
      return;
    }

    if (selectedCards.length === 0) {
      return;
    }

    // 在出牌前保存当前游戏状态快照
    const snapshot = createGameSnapshot();
    setGameHistory((prev) => [...prev, snapshot]);

    const playerCards = currentCards[player];
    const selectedCardValues = selectedCards.map((index) => playerCards[index]);

    // 对出牌进行排序
    const sortedSelectedCards = sortPlayedCards([...selectedCardValues]);

    // 将排序后的牌显示在牌堆中（覆盖之前的牌）
    setPlayedCards(sortedSelectedCards);
    // 记录出牌的玩家身份
    setPlayedBy(player);

    // 从玩家手牌中移除已出的牌
    const newPlayerCards = playerCards.filter(
      (_, index) => !selectedCards.includes(index)
    );

    // 更新手牌状态
    const newCards = {
      ...currentCards,
      [player]: newPlayerCards,
    };
    setCurrentCards(newCards);

    // 检查游戏是否结束
    const gameWinner = checkGameEnd(newCards);
    if (gameWinner) {
      setIsGameEnded(true);
      // 清空选中的牌，但不切换到下一个玩家
      setSelectedCards([]);
    } else {
      // 切换到下一个玩家（会自动清空选中的牌）
      switchToNextPlayer();
    }
  };

  return (
    <div className="h-dvh bg-gray-50 flex flex-col">
      {contextHolder}
      {/* 顶部操作栏 */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex items-center justify-between">
          <Button onClick={handleGoBack}>返回</Button>
          <div className="flex flex-col items-center">
            {/* 对局名称 */}
            {isEditMode ? (
              <h1
                className="text-xl font-semibold cursor-pointer hover:text-blue-500 transition-colors"
                onClick={handleEditTitle}
                title="点击编辑对局名称"
              >
                {gameTitle}
              </h1>
            ) : (
              <h1 className="text-xl font-semibold">{gameTitle}</h1>
            )}
          </div>
          {!isEditMode && <Button onClick={handleRestart}>重来</Button>}
          {isEditMode && (
            <Button type="primary" loading={isSaving} onClick={handleSaveGame}>
              {isSaving ? "保存中..." : "保存"}
            </Button>
          )}
        </div>
      </div>

      {/* 对局区域 */}
      <div className="flex-1 p-6 flex flex-col !lg:flex-row gap-4 overflow-y-scroll">
        <div className="flex flex-col justify-between gap-4 lg:w-screen-xl">
          {/* 地主 */}
          <Player
            playerType="landlord"
            cards={currentCards.landlord}
            selectedIndexes={selectedCards}
            isCurrentPlayer={currentPlayer === "landlord"}
            isEditMode={isEditMode}
            isGameEnded={isGameEnded}
            onSelectionChange={setSelectedCards}
            onPass={handlePass}
            onPlayCards={handlePlayCards}
            onEditCards={handleEditCards}
            onSetFirstPlayer={handleSetFirstPlayer}
          />
          {/* 下家 */}
          <Player
            playerType="farmer1"
            cards={currentCards.farmer1}
            selectedIndexes={selectedCards}
            isCurrentPlayer={currentPlayer === "farmer1"}
            isEditMode={isEditMode}
            isGameEnded={isGameEnded}
            onSelectionChange={setSelectedCards}
            onPass={handlePass}
            onPlayCards={handlePlayCards}
            onEditCards={handleEditCards}
            onSetFirstPlayer={handleSetFirstPlayer}
          />
          {/* 顶家 */}
          <Player
            playerType="farmer2"
            cards={currentCards.farmer2}
            selectedIndexes={selectedCards}
            isCurrentPlayer={currentPlayer === "farmer2"}
            isEditMode={isEditMode}
            isGameEnded={isGameEnded}
            onSelectionChange={setSelectedCards}
            onPass={handlePass}
            onPlayCards={handlePlayCards}
            onEditCards={handleEditCards}
            onSetFirstPlayer={handleSetFirstPlayer}
          />
        </div>
        {/* 牌堆 */}
        <div className="flex-1 flex flex-col bg-white rounded-lg shadow p-4">
          <div className="flex-1">
            <PlayedCards playedCards={playedCards} playedBy={playedBy} />
          </div>
          {/* 撤回按钮 - 只在非编辑模式且有出牌或过牌记录时显示 */}
          {!isEditMode && gameHistory.length > 0 && (
            <Button className="w-full" onClick={handleUndo}>
              撤回
            </Button>
          )}
        </div>
      </div>

      {/* 编辑对局名称弹窗 */}
      <Modal
        open={editTitleModalVisible}
        onOk={handleConfirmEditTitle}
        onCancel={handleCancelEdit}
        okText="确认"
        cancelText="取消"
        closable={false}
      >
        <Input
          placeholder="请输入对局名称"
          value={titleInputValue}
          onChange={(e) => setTitleInputValue(e.target.value)}
          onPressEnter={handleConfirmEditTitle}
        />
      </Modal>

      {/* 编辑手牌弹窗 */}
      <Modal
        open={editCardsModalVisible}
        onOk={handleConfirmEditCards}
        onCancel={handleCancelEdit}
        okText="确认"
        cancelText="取消"
        closable={false}
      >
        <Input
          placeholder="例如: DX22AAKQJ1098765432"
          value={cardsInputValue}
          onChange={(e) => setCardsInputValue(e.target.value)}
          maxLength={200}
        />
      </Modal>
    </div>
  );
}

export default GamePage;
