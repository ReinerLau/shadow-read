import React from "react";
import type { CardProps } from "../types";

/**
 * 扑克牌组件
 * 显示点数但不考虑花色
 */
const Card: React.FC<CardProps> = ({ value, selected = false, onClick }) => {
  return (
    <div
      className={`
        w-full aspect-square rounded border-1 shadow cursor-pointer flex items-center justify-center font-bold transition-all duration-200
        ${
          selected
            ? "bg-blue-500 text-white border-blue-600"
            : "bg-white border-gray-300 hover:bg-gray-100"
        }
      `}
      onClick={onClick}
    >
      {value}
    </div>
  );
};

export default Card;
