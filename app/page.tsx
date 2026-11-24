 "use client";

import { useMemo, useState } from "react";

type Recipe = {
  name: string;
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
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
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

  const upload = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("请选择图片文件。"); return; }
    if (file.size > 8 * 1024 * 1024) { setError("图片大小请控制在 8MB 以内。"); return; }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  };

  async function generate() {
    if (!ingredients.length && !image) { setError("先添加食材，或上传冰箱照片吧。"); return; }
    setLoading(true); setError(""); setSelected(null);
    try {
      let imageData: string | undefined;
      if (image) {
        imageData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(image);
        });
      }
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, cuisine, preference, servings, imageData }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "生成失败，请稍后重试。");
      setIngredients(prev => Array.from(new Set([...prev, ...(data.detectedIngredients || [])])));
      setRecipes(data.recipes || []);
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
        <div className="section-title"><span className="num">01</span><div><h2>告诉我你有什么食材</h2><p>想到什么就加什么，也可以拍照让 AI 帮你识别。</p></div></div>
        <div className="ingredient-input">
          <input value={entry} onChange={e => setEntry(e.target.value)} onKeyDown={e => e.key === "Enter" && add(entry)} placeholder="例如：鸡蛋、番茄、剩米饭…" />
          <button className="add-btn" onClick={() => add(entry)}>添加 <span>＋</span></button>
        </div>
        <div className="chips">
          {ingredients.map(item => <button key={item} className="ingredient-chip" onClick={() => remove(item)}>{item}<span>×</span></button>)}
          {!ingredients.length && <span className="empty-chip">食材添加后会显示在这里</span>}
        </div>
        <label className="upload-box">
          <input type="file" accept="image/*" capture="environment" onChange={e => upload(e.target.files?.[0])}/>
          <span className="upload-icon">▧</span><span><b>{image ? "更换照片" : "上传冰箱 / 食材照片"}</b><small>AI 视觉识别 · 图片最大 8MB</small></span>
        </label>
        {imagePreview && <div className="preview"><img src={imagePreview} alt="上传预览"/><button onClick={() => {setImage(null);setImagePreview("");}}>移除照片 ×</button></div>}

        <div className="settings-grid">
          <div className="setting"><div className="setting-title">02 · 今天想吃什么风格？</div><div className="option-list">{cuisineOptions.map(x => <button key={x} className={`option ${cuisine===x?"active":""}`} onClick={() => setCuisine(x)}>{x}</button>)}</div></div>
          <div className="setting"><div className="setting-title">03 · 料理偏好</div><div className="option-list">{preferenceOptions.map(x => <button key={x} className={`option ${preference===x?"active":""}`} onClick={() => setPreference(x)}>{x}</button>)}</div></div>
          <div className="setting servings"><div className="setting-title">用餐人数</div><select value={servings} onChange={e => setServings(e.target.value)}><option>1人</option><option>1–2人</option><option>2–3人</option><option>3–4人</option><option>4人以上</option></select></div>
        </div>
        <button className="generate" onClick={generate} disabled={loading}>{loading ? <><span className="loader"/>正在为你寻找灵感…</> : <>✦　生成我的专属菜谱　→</>}</button>
        {error && <div className="error">{error}</div>}
        <p className="privacy-note">照片仅用于本次食材识别和菜谱生成，不会在本网站保存。</p>
      </section>

      {recipes.length > 0 && <section className="results">
        <div className="results-head"><div><div className="eyebrow">YOUR PERSONAL MENU</div><h2>为你找到这些灵感</h2></div><span className="result-count">{recipes.length} 道推荐</span></div>
        <div className="recipe-grid">
          {recipes.map((r, i) => <article className="recipe-card" key={r.name+i}>
            <div className={`recipe-art art-${i%3}`}><span>{["🥘","🍜","🥗"][i%3]}</span><div className="art-caption">今日灵感 · {String(i+1).padStart(2,"0")}</div></div>
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
