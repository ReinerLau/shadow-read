import React from "react";
import { Row, Col } from "antd";
import Card from "./Card";
import type { HandCardsProps } from "../types";

/**
 * 手牌展示组件
 * 使用网格布局展示玩家手牌，支持多选
 */
const HandCards: React.FC<HandCardsProps> = ({
  cards,
  selectedIndexes = [],
  disabled = false,
  onSelectionChange,
}) => {
  /**
   * 处理牌的点击事件
   * @param index - 被点击牌的索引
   */
  const handleCardClick = (index: number) => {
    // 如果组件被禁用，则不响应点击事件
    if (disabled) {
      return;
    }

    const newSelectedIndexes = selectedIndexes.includes(index)
      ? selectedIndexes.filter((i) => i !== index) // 如果已选中则取消选中
      : [...selectedIndexes, index]; // 如果未选中则添加到选中列表

    onSelectionChange?.(newSelectedIndexes);
  };

  return (
    <Row gutter={[8, 8]}>
      {cards.map((cardValue, index) => (
        <Col key={index} span={3} md={1}>
          <Card
            value={cardValue}
            selected={selectedIndexes.includes(index)}
            onClick={() => handleCardClick(index)}
          />
        </Col>
      ))}
    </Row>
  );
};

export default HandCards;
