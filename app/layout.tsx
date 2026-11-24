import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "冰箱灵感 · AI 食谱助手",
  description: "用手边食材，发现下一顿美食。AI 帮你生成个性化菜谱。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
