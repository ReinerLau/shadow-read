import { Button, Input, Card, Dropdown, Row, Col, message, Modal } from "antd";
import type { MenuProps } from "antd";
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import GameDatabaseService from "../services/gameDatabase";
import type { Game } from "../types";

/**
 * 首页组件
 * 展示对局列表、搜索等功能
 */
function HomePage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();

  // 搜索关键词状态
  const [searchKeyword, setSearchKeyword] = useState("");

  // 对局列表状态
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 筛选后的对局列表
  const filteredGames = useMemo(() => {
    if (!searchKeyword.trim()) {
      return games;
    }
    return games.filter((game) =>
      game.title.toLowerCase().includes(searchKeyword.toLowerCase())
    );
  }, [games, searchKeyword]);

  /**
   * 初始化数据库并加载对局数据
   */
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        // 初始化数据库
        await GameDatabaseService.initializeDatabase();

        // 加载所有对局
        const allGames = await GameDatabaseService.getAllGames();
        setGames(allGames);
      } catch (error) {
        console.error("初始化数据失败:", error);
        messageApi.error("加载对局数据失败");
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [messageApi]);

  /**
   * 重新加载对局列表
   */
  const reloadGames = async () => {
    try {
      const allGames = await GameDatabaseService.getAllGames();
      setGames(allGames);
    } catch (error) {
      console.error("重新加载对局失败:", error);
      messageApi.error("重新加载对局失败");
    }
  };

  /**
   * 处理卡片点击事件，跳转到对局页面(正常模式)
   * @param gameId - 对局ID
   */
  const handleCardClick = (gameId: number) => {
    navigate(`/game/${gameId}`);
  };

  /**
   * 处理右键菜单点击事件
   * @param key - 菜单项key
   * @param gameId - 对局ID
   * @param event - 点击事件对象
   */
  const handleMenuClick = (
    key: string,
    gameId: number,
    event?: React.MouseEvent | React.KeyboardEvent
  ) => {
    // 阻止事件冒泡，避免触发卡片点击
    if (event) {
      event.stopPropagation();
    }

    switch (key) {
      case "edit":
        navigate(`/edit-game/${gameId}`);
        break;
      case "delete":
        handleDeleteGame(gameId);
        break;
    }
  };

  /**
   * 删除对局
   * @param gameId - 对局ID
   */
  const handleDeleteGame = (gameId: number) => {
    const game = games.find((g) => g.id === gameId);
    if (!game) return;

    modal.confirm({
      title: "确认删除",
      content: `确定要删除对局 "${game.title}" 吗？此操作不可撤销。`,
      okText: "确定",
      cancelText: "取消",
      okType: "danger",
      onOk: async () => {
        try {
          await GameDatabaseService.deleteGame(gameId);
          messageApi.success("对局删除成功");
          await reloadGames();
        } catch {
          messageApi.error("删除对局失败");
        }
      },
    });
  };

  // 更多菜单
  const getContextMenu = (gameId: number): MenuProps => ({
    items: [
      {
        key: "edit",
        label: (
          <div className="flex items-center gap-2">
            <span className="i-mdi-pencil text-base"></span>
            编辑
          </div>
        ),
      },
      {
        key: "delete",
        label: (
          <div className="flex items-center gap-2 text-red-500">
            <span className="i-mdi-delete text-base"></span>
            删除
          </div>
        ),
      },
    ],
    onClick: ({ key, domEvent }) => handleMenuClick(key, gameId, domEvent),
  });

  /**
   * 处理添加对局按钮点击
   */
  const handleAddGame = () => {
    navigate("/game/new");
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-2">正在加载对局数据...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-gray-50 p-6 flex flex-col">
      {contextHolder}
      {modalContextHolder}
      {/* 操作栏 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <Row gutter={[16, 16]} align="middle">
          {/* 搜索框 */}
          <Col xs={24} sm={18}>
            <Input
              placeholder="搜索对局标题..."
              size="large"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </Col>

          {/* 操作按钮 */}
          <Col xs={24} sm={6}>
            <Button
              type="primary"
              size="large"
              onClick={handleAddGame}
              className="w-full"
            >
              <span>添加对局</span>
            </Button>
          </Col>
        </Row>
      </div>

      {/* 对局卡片网格 */}
      <div className="flex-1 overflow-y-scroll">
        <Row className="w-full" gutter={[8, 8]}>
          {filteredGames.map((game) => (
            <Col key={game.id} xs={24} sm={6}>
              <Card
                hoverable
                className="cursor-pointer transition-all duration-200 hover:shadow-md relative"
                onClick={() => handleCardClick(game.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex items-center justify-center">
                    <h3 className="text-lg">{game.title}</h3>
                  </div>
                </div>
                {/* 更多操作按钮 */}
                <Dropdown menu={getContextMenu(game.id)} trigger={["click"]}>
                  <Button
                    type="text"
                    size="small"
                    className="absolute top-2 right-2 p-1 hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation(); // 阻止事件冒泡，避免触发卡片点击
                    }}
                    icon={
                      <div className="i-mdi-dots-horizontal  text-base"></div>
                    }
                  />
                </Dropdown>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
}

export default HomePage;
