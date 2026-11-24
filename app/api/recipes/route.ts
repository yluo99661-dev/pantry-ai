import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "网站还没有配置 AI API 密钥。部署者请在环境变量中设置 OPENAI_API_KEY。" }, { status: 503 });

    const body = await req.json();
    const { ingredients = [], cuisine = "不限", preference = "随心吃", servings = "1–2人", imageData } = body;
    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const system = `你是一位擅长家常料理、食品安全和减少浪费的中文料理助手。请基于用户食材、偏好、人数生成3道实际可做的菜谱。若提供图片，先辨认图片中可见食材，不确定时明确标注，不要凭空断定。食材优先使用用户现有食材，必要的常见调味料可以补充。考虑食材数量和烹饪设备，步骤要清晰、安全。严格输出 JSON，不要 markdown 代码围栏，结构如下：
{"detectedIngredients":["识别出的食材"],"recipes":[{"name":"菜名","intro":"简短介绍","time":"约20分钟","difficulty":"简单","servings":"1–2人","ingredients":[{"name":"食材","amount":"数量"}],"steps":["步骤1","步骤2"],"tips":"小贴士","substitutions":["替代建议"]}]}
请生成3道菜，避免重复，时间、数量合理。`;

    const userText = `现有食材：${ingredients.join("、") || "请根据图片识别"}\n料理风格：${cuisine}\n偏好：${preference}\n用餐人数：${servings}\n请生成适合我的3道菜。`;
    const content: any[] = [{ type: "text", text: userText }];
    if (imageData) content.push({ type: "image_url", image_url: { url: imageData, detail: "low" } });

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: content as any }
      ],
    });

    const text = completion.choices[0]?.message?.content || "{}";
    const data = JSON.parse(text);
    if (!Array.isArray(data.recipes)) throw new Error("模型返回格式异常，请重试。");
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("recipe API error", err);
    return NextResponse.json({ error: err?.message || "菜谱生成暂时失败，请稍后再试。" }, { status: 500 });
  }
}
