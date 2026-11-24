
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import { recipes } from "../../recipes";
const aliases: Record<string,string> = {西红柿:"番茄",马铃薯:"土豆",剩米饭:"米饭",鸡胸肉:"鸡肉",鸡腿:"鸡肉",egg:"鸡蛋",tomato:"番茄",potato:"土豆",chicken:"鸡肉",onion:"洋葱",rice:"米饭",beef:"牛肉",tofu:"豆腐",carrot:"胡萝卜",mushrooms:"蘑菇",cucumber:"黄瓜",salmon:"三文鱼",pork:"猪肉",shrimp:"虾仁",pasta:"意大利面",broccoli:"西兰花",garlic:"大蒜",milk:"牛奶",spinach:"菠菜"};
const norm=(x:string)=>aliases[x.trim().toLowerCase()]||x.trim().toLowerCase();
async function fallbackRecipes(ingredients:string[], cuisine:string, preference:string, servings:string) {
 const have=new Set(ingredients.map(norm)); const count=servings==="1人"?1:servings==="2–3人"?3:servings==="3–4人"||servings==="4人以上"?4:2;
 const local=recipes.filter(r=>(cuisine==="不限"||r.cuisine===cuisine)&&(preference!=="15分钟内"||r.time<=15)).map(r=>{const matched=r.food.filter(([n])=>have.has(norm(n))).length;return {r,matched,score:matched/r.food.length+(r.tags.includes(preference)?0.15:0)};}).filter(x=>x.matched>0).sort((a,b)=>b.score-a.score);
 const result=local.slice(0,3).map(({r,matched})=>({name:r.name,intro:`【本地菜谱】${r.cuisine} · 已有${matched}/${r.food.length}种主要食材`,time:`约${r.time}分钟`,difficulty:r.time<=15?"简单":"普通",servings,ingredients:[...r.food.map(([name,g])=>({name:have.has(norm(name))?name:name+"（需准备）",amount:`${Math.round(g*count/2)}克`})),{name:"调味料",amount:r.season}],steps:r.steps,tips:"用量按人数范围上限估算；肉蛋海鲜充分煮熟。",substitutions:[r.sub],image:""}));
 // TheMealDB educational test endpoint: only send recognized ingredient names, not free text.
 if(cuisine==="不限" && preference==="随心吃") try {
 const keys=Object.keys(aliases).filter(k=>/^[a-z]+$/.test(k)&&have.has(aliases[k])).slice(0,2);
 const lists=await Promise.all(keys.map(async k=>{const res=await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(k)}`,{signal:AbortSignal.timeout(3500)});return (await res.json()).meals||[];}));
 const ids=Array.from(new Set<string>(lists.flat().map((m:any)=>String(m.idMeal)))).slice(0,2);
 const meals=await Promise.all(ids.map(async id=>{const res=await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`,{signal:AbortSignal.timeout(3500)});return (await res.json()).meals?.[0];}));
 for(const m of meals.filter(Boolean)){const food=Array.from({length:20},(_,i)=>({name:String(m[`strIngredient${i+1}`]||"").trim(),amount:String(m[`strMeasure${i+1}`]||"").trim()})).filter(x=>x.name);if(!m.strInstructions||!food.length)continue;result.push({name:m.strMeal,intro:"【TheMealDB 国际菜谱】英文原文",time:"未提供",difficulty:"未提供",servings:"原始份量",ingredients:food,steps:String(m.strInstructions).split(/\r?\n/).filter((x:string)=>x.trim()),tips:"外部菜谱未提供标准人数，保留原始用量。来源：TheMealDB。",substitutions:[],image:m.strMealThumb||""});}
 }catch{}
 return {mode:"database",detectedIngredients:[],recipes:result};
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
            recipes: data.recipes.map((r:any)=>({...r,intro:"【AI实时生成】"+r.intro})),
            mode: "ai"
          });
        }
      } catch (error) {
        console.error("AI unavailable, using fallback");
      }
    }

    return NextResponse.json(
      await fallbackRecipes(
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
