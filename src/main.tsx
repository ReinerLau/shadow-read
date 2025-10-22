import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "virtual:uno.css";
import App from "./App.tsx";
import { HashRouter } from "react-router";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <ConfigProvider locale={zhCN}>
        <App />
      </ConfigProvider>
    </HashRouter>
  </StrictMode>
);
