import React from "react";
import { Row, Col, Tag } from "antd";
import Card from "./Card";
import type { PlayedCardsProps, PlayerType } from "../types";

/**
 * 获取玩家身份显示文本
 * @param playerType - 玩家类型
 * @returns 玩家身份显示文本
 */
const getPlayerDisplayName = (playerType: PlayerType): string => {
  switch (playerType) {
    case "landlord":
      return "地主";
    case "farmer1":
      return "下家";
    case "farmer2":
      return "顶家";
    default:
      return "";
  }
};

/**
 * 牌堆组件
 * 显示最近一次出牌的内容和出牌玩家身份
 */
const PlayedCards: React.FC<PlayedCardsProps> = ({ playedCards, playedBy }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2">
      {/* 出牌玩家身份 */}
      {playedBy && <Tag className="m-0">{getPlayerDisplayName(playedBy)}</Tag>}

      {/* 出牌内容 */}
      {playedCards.length > 0 && (
        <Row className="w-full" gutter={[8, 8]} justify="center">
          {playedCards.map((cardValue, index) => (
            <Col key={index} span={2}>
              <Card value={cardValue} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default PlayedCards;
