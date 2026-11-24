 "use client";

import { useMemo, useState } from "react";

type Recipe = {
  name: string;
  image?: string;
  intro: string;
  time: string;
  difficulty: string;
  servings: string;
  ingredients: { name: string; amount: string }[];
  steps: string[];
  tips: string;
  substitutions: string[];
};

const cuisineOptions = ["不限", "中餐", "韩餐", "日餐", "西餐", "轻食"];
const preferenceOptions = ["随心吃", "15分钟内", "简单易做", "预算友好", "高蛋白", "少油"];

export default function Home() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [entry, setEntry] = useState("");
  const [cuisine, setCuisine] = useState("不限");
  const [preference, setPreference] = useState("随心吃");
  const [servings, setServings] = useState("1–2人");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [history, setHistory] = useState<Recipe[]>([]);

  const add = (text: string) => {
    const items = text.split(/[、,，\s]+/).map(x => x.trim()).filter(Boolean);
    setIngredients(prev => Array.from(new Set([...prev, ...items])));
    setEntry("");
  };
  const remove = (name: string) => setIngredients(prev => prev.filter(x => x !== name));

  async function generate() {
    if (!ingredients.length) { setError("请先添加食材。"); return; }
    setLoading(true); setError(""); setSelected(null);
    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, cuisine, preference, servings }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "生成失败，请稍后重试。");
      setIngredients(prev => Array.from(new Set([...prev, ...(data.detectedIngredients || [])])));
      setRecipes(data.recipes || []);
      if (!data.recipes?.length) setError("没有匹配菜谱，请尝试其他食材或放宽筛选条件。");
      setHistory(prev => [...(data.recipes || []), ...prev].slice(0, 12));
    } catch (e) {
      setError(e instanceof Error ? e.message : "发生未知错误。");
    } finally {
      setLoading(false);
    }
  }

  function toggleSave(recipe: Recipe) {
    setSaved(prev => prev.includes(recipe.name) ? prev.filter(n => n !== recipe.name) : [...prev, recipe.name]);
  }

  return (
    <main className="page-shell">
      <nav className="topbar">
        <a className="brand" href="#"><span className="brand-icon">✦</span><span>冰箱灵感</span></a>
        <span className="top-note">你的 AI 厨房搭档</span>
      </nav>

      <header className="hero">
        <div className="eyebrow"><span className="spark">✧</span> COOK WITH WHAT YOU HAVE</div>
        <h1>冰箱里有什么？<br/><em>今天就吃点不一样的。</em></h1>
        <p>让手边的食材，变成下一顿饭的灵感。</p>
      </header>

      <section className="composer">
        <div className="section-title"><span className="num">01</span><div><h2>告诉我你有什么食材</h2><p>输入手边的食材，寻找适合的菜谱。</p></div></div>
        <div className="ingredient-input">
          <input value={entry} onChange={e => setEntry(e.target.value)} onKeyDown={e => e.key === "Enter" && add(entry)} placeholder="例如：鸡蛋、番茄、剩米饭…" />
          <button className="add-btn" onClick={() => add(entry)}>添加 <span>＋</span></button>
        </div>
        <div className="chips">
          {ingredients.map(item => <button key={item} className="ingredient-chip" onClick={() => remove(item)}>{item}<span>×</span></button>)}
          {!ingredients.length && <span className="empty-chip">食材添加后会显示在这里</span>}
        </div>
        <div className="settings-grid">
          <div className="setting"><div className="setting-title">02 · 今天想吃什么风格？</div><div className="option-list">{cuisineOptions.map(x => <button key={x} className={`option ${cuisine===x?"active":""}`} onClick={() => setCuisine(x)}>{x}</button>)}</div></div>
          <div className="setting"><div className="setting-title">03 · 料理偏好</div><div className="option-list">{preferenceOptions.map(x => <button key={x} className={`option ${preference===x?"active":""}`} onClick={() => setPreference(x)}>{x}</button>)}</div></div>
          <div className="setting servings"><div className="setting-title">用餐人数</div><select value={servings} onChange={e => setServings(e.target.value)}><option>1人</option><option>1–2人</option><option>2–3人</option><option>3–4人</option><option>4人以上</option></select></div>
        </div>
        <button className="generate" onClick={generate} disabled={loading}>{loading ? <><span className="loader"/>正在为你寻找灵感…</> : <>✦　生成我的专属菜谱　→</>}</button>
        {error && <div className="error">{error}</div>}
        <p className="privacy-note">优先使用已配置的 AI；不可用时推荐本地或国际数据库菜谱。</p>
      </section>

      {recipes.length > 0 && <section className="results">
        <div className="results-head"><div><div className="eyebrow">YOUR PERSONAL MENU</div><h2>为你找到这些灵感</h2></div><span className="result-count">{recipes.length} 道推荐</span></div>
        <div className="recipe-grid">
          {recipes.map((r, i) => <article className="recipe-card" key={r.name+i}>
            <div className={`recipe-art art-${i%3}`}>{r.image ? <img src={r.image} alt={r.name} style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}}/> : <span>{["🥘","🍜","🥗"][i%3]}</span>}<div className="art-caption">今日灵感 · {String(i+1).padStart(2,"0")}</div></div>
            <div className="recipe-content"><div className="recipe-meta"><span>◷ {r.time}</span><span>✦ {r.difficulty}</span><span>♧ {r.servings || servings}</span></div><h3>{r.name}</h3><p>{r.intro}</p>
              <div className="card-actions"><button className="open-recipe" onClick={() => setSelected(r)}>查看做法 <span>→</span></button><button className={`save ${saved.includes(r.name)?"saved":""}`} onClick={() => toggleSave(r)}>{saved.includes(r.name)?"♥":"♡"}</button></div>
            </div>
          </article>)}
        </div>
      </section>}

      {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="recipe-modal" onClick={e => e.stopPropagation()}>
        <button className="close-modal" onClick={() => setSelected(null)}>×</button><div className="modal-hero"><span>🍲</span><small>AI 为你定制</small></div>
        <h2>{selected.name}</h2><p className="modal-intro">{selected.intro}</p><div className="modal-stats"><span>◷ {selected.time}</span><span>✦ {selected.difficulty}</span><span>♧ {selected.servings || servings}</span></div>
        <div className="modal-columns"><div><h3>食材准备</h3><ul>{selected.ingredients.map((x,i)=><li key={i}><span>{x.name}</span><b>{x.amount}</b></li>)}</ul></div><div><h3>制作步骤</h3><ol>{selected.steps.map((x,i)=><li key={i}>{x}</li>)}</ol></div></div>
        {selected.tips && <div className="chef-tip"><b>小贴士</b><p>{selected.tips}</p></div>}
        {!!selected.substitutions?.length && <div className="chef-tip"><b>食材替换建议</b><p>{selected.substitutions.join("；")}</p></div>}
        <button className="modal-save" onClick={() => toggleSave(selected)}>{saved.includes(selected.name)?"已收藏 ♥":"收藏这道菜 ♡"}</button>
      </div></div>}

      {saved.length > 0 && <section className="saved-section"><h3>♡ 已收藏的菜谱</h3><div className="saved-list">{saved.map(name=><span key={name}>{name}</span>)}</div></section>}
      <footer>冰箱灵感 <span>·</span> 少一点纠结，多一点好好吃饭</footer>
    </main>
  );
}
