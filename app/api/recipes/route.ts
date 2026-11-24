
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function fallbackRecipes(
  ingredients: string[],
  cuisine: string,
  preference: string,
  servings: string
) {
  const items = ingredients.slice(0, 8);
  const main = items[0] || "番茄";
  const second = items[1] || "洋葱";
  const title = items.slice(0, 2).join("");

  const base = items.map(name => ({
    name,
    amount: "根据用餐人数适量"
  }));

  const methods = [
    {
      name: `家常${title}小炒`,
      intro: "简单方便的家常料理",
      time: "约20分钟",
      steps: [
        "清洗食材，按照食材种类分别处理。",
        "生熟食材分开，避免交叉污染。",
        "锅中加入适量食用油，先烹调需要较长时间的食材。",
        "加入其余适合炒制的食材，充分加热至熟透。",
        "根据个人口味调味后盛出。"
      ]
    },
    {
      name: `${main}${second}暖心汤`,
      intro: "适合日常用餐的家常汤品",
      time: "约30分钟",
      steps: [
        "将适合煮汤的食材清洗并切块。",
        "锅中加入适量清水并煮沸。",
        "先加入需要较长时间煮熟的食材。",
        "加入剩余适合煮汤的食材，充分煮熟。",
        "适量调味后即可享用。"
      ]
    },
    {
      name: `${title}家常炖菜`,
      intro: "充分利用现有食材的家常料理",
      time: "约35分钟",
      steps: [
        "清洗食材，分别切成适合烹调的大小。",
        "锅中加入少量油，将适合炒制的食材稍作翻炒。",
        "加入适量清水。",
        "放入适合炖煮的食材，充分加热至熟透。",
        "确认食材熟透后调味出锅。"
      ]
    }
  ];

  return {
    mode: "fallback",
    detectedIngredients: [],
    recipes: methods.map(recipe => ({
      ...recipe,
      intro: "【备用演示模式】" + recipe.intro,
      difficulty: "简单",
      servings,
      ingredients: [
        ...base,
        { name: "食用油", amount: "适量" },
        { name: "盐", amount: "适量" }
      ],
      tips: `当前为规则生成的参考菜谱，并非AI实时生成。请根据实际食材调整做法。所选风格：${cuisine}；偏好：${preference}。肉类、蛋类及海鲜应充分煮熟，不适合该做法的食材请另行处理。`,
      substitutions: [
        "可根据实际情况选择适合该烹调方式的食材"
      ]
    }))
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const ingredients: string[] = Array.isArray(body.ingredients)
      ? body.ingredients
          .filter((item: unknown) => typeof item === "string")
          .map((item: string) => item.trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];

    const cuisine = body.cuisine || "不限";
    const preference = body.preference || "随心吃";
    const servings = body.servings || "1–2人";

    if (!ingredients.length) {
      return NextResponse.json(
        { error: "请先手动输入至少一种食材，暂不支持图片识别。" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      try {
        const client = new OpenAI({
          apiKey,
          maxRetries: 0,
          timeout: 12000
        });

        const completion = await client.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `你是一位中文料理助手。
根据用户食材生成3道安全、实用的菜谱。
充分考虑食材特点和食品安全。
严格返回JSON，格式如下：
{"detectedIngredients":[],"recipes":[{"name":"菜名","intro":"介绍","time":"约20分钟","difficulty":"简单","servings":"1–2人","ingredients":[{"name":"食材","amount":"数量"}],"steps":["步骤1","步骤2"],"tips":"小贴士","substitutions":["替代建议"]}]}`
            },
            {
              role: "user",
              content: `食材：${ingredients.join("、")}
料理风格：${cuisine}
偏好：${preference}
人数：${servings}
请生成3道菜谱。`
            }
          ]
        });

        const data = JSON.parse(
          completion.choices[0]?.message?.content || "{}"
        );

        if (Array.isArray(data.recipes) && data.recipes.length) {
          return NextResponse.json({
            ...data,
            mode: "ai"
          });
        }
      } catch (error) {
        console.error("AI unavailable, using fallback");
      }
    }

    return NextResponse.json(
      fallbackRecipes(
        ingredients,
        cuisine,
        preference,
        servings
      )
    );

  } catch (error) {
    return NextResponse.json(
      { error: "生成失败，请重新输入食材。" },
      { status: 500 }
    );
  }
}
