# 冰箱灵感 · AI 食谱助手

一个中文、移动端优先的 AI 食谱网站项目。用户可以：
- 手动输入食材
- 上传食材/冰箱照片（AI 视觉识别）
- 选择菜系、烹饪偏好和人数
- 生成 3 道 AI 菜谱
- 查看材料、用量、步骤、技巧和替换建议
- 收藏菜谱（当前收藏仅保存在本次页面状态，刷新会重置）

## 本地运行

1. 安装 Node.js 20+。
2. 解压项目，进入文件夹。
3. 安装依赖：

   ```bash
   npm install
   ```

4. 复制 `.env.example` 为 `.env.local`，并填写自己的 API Key：

   ```env
   OPENAI_API_KEY=你的API密钥
   OPENAI_MODEL=gpt-4o-mini
   ```

5. 启动：

   ```bash
   npm run dev
   ```

6. 浏览器打开 http://localhost:3000

## 部署到 Vercel

1. 将项目上传到 GitHub 仓库（不要上传 `.env.local`）。
2. 在 Vercel 导入该仓库。
3. 在项目 Settings → Environment Variables 添加 `OPENAI_API_KEY`。
4. 可选添加 `OPENAI_MODEL`，默认 `gpt-4o-mini`。
5. 部署。Vercel 会生成公开网址。

## API

`POST /api/recipes`

请求 JSON：
```json
{
  "ingredients": ["鸡蛋", "番茄", "米饭"],
  "cuisine": "中餐",
  "preference": "简单易做",
  "servings": "1–2人",
  "imageData": "可选 data URL"
}
```

返回 JSON 包含 `detectedIngredients` 和 `recipes`。

## 安全说明

- API Key 只放服务器端环境变量，禁止写进前端代码或提交 Git。
- 上传图像限制 8MB；原型不保存上传图像。
- AI 生成的菜谱并非专业营养/医疗建议；用户应检查过敏原、食材是否熟透及食品安全。
- 生产环境建议进一步增加速率限制、请求大小限制、日志脱敏和数据库持久化。
