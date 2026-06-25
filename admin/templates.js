import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../../lib/supabase";
import Layout from "../../components/Layout";

const P="#714B67",PL="#f3eef1",G="#1D9E75",GL="#e1f5ee",A="#EF9F27",AL="#faeeda",R="#E24B4A";
const BORDER="#e5e3ee",TXT="#2c1a3a",TXT2="#888",TXT3="#bbb",BG="#f0f0f7",CARD="#fff";

const CAT_OPTIONS=["Protein","Carbs","Dairy","Fruits","Veggies","Snacks","Beverages","Grains","Custom"];
const CONDITION_OPTIONS=["Diabetes","High BP","Thyroid","Weight Loss","Weight Gain","General Healthy","Obesity","Digestive"];

const EMPTY_FOOD={name:"",calories:"",protein:"",carbs:"",fat:"",category:"Protein"};

export default function AdminTemplates(){
  const router=useRouter();
  const [profile,setProfile]=useState(null);
  const [templates,setTemplates]=useState([]);
  const [loading,setLoading]=useState(true);
  const [view,setView]=useState("list"); // list | create | edit | foods
  const [activeTemplate,setActiveTemplate]=useState(null);
  const [foods,setFoods]=useState([]);
  const [foodsLoading,setFoodsLoading]=useState(false);
  const [toast,setToast]=useState(null);

  // New template form
  const [tForm,setTForm]=useState({name:"",conditions:[]});
  const [tSaving,setTSaving]=useState(false);
  const [tErr,setTErr]=useState("");

  // Add food form
  const [fForm,setFForm]=useState(EMPTY_FOOD);
  const [fSaving,setFSaving]=useState(false);
  const [fErr,setFErr]=useState("");
  const [showFoodForm,setShowFoodForm]=useState(false);
  const [editFood,setEditFood]=useState(null);

  // Search
  const [search,setSearch]=useState("");

  useEffect(()=>{
    async function init(){
      const sb=getSupabase();
      const{data:{session}}=await sb.auth.getSession();
      if(!session){router.push("/login");return;}
      const{data:p}=await sb.from("profiles").select("*").eq("id",session.user.id).single();
      if(!p||p.role!=="admin"){router.push("/dashboard");return;}
      setProfile(p);
      await loadTemplates(sb);
    }
    init();
  },[]);

  async function loadTemplates(sb){
    setLoading(true);
    const sbClient=sb||getSupabase();
    const{data}=await sbClient.from("meal_templates").select("*").order("created_at",{ascending:false});
    // Get food counts per template
    const{data:counts}=await sbClient.from("template_food_items").select("template_id");
    const countMap={};
    (counts||[]).forEach(r=>{countMap[r.template_id]=(countMap[r.template_id]||0)+1;});
    setTemplates((data||[]).map(t=>({...t,food_count:countMap[t.id]||0})));
    setLoading(false);
  }

  async function loadFoods(templateId){
    setFoodsLoading(true);
    const{data}=await getSupabase().from("template_food_items").select("*")
      .eq("template_id",templateId).order("category").order("name");
    setFoods(data||[]);
    setFoodsLoading(false);
  }

  function showToast(m){setToast(m);setTimeout(()=>setToast(null),2000);}

  // ─── CREATE / EDIT TEMPLATE ───────────────────────────────────────────────
  async function saveTemplate(){
    if(!tForm.name.trim()){setTErr("Template name is required");return;}
    setTSaving(true);setTErr("");
    const sb=getSupabase();
    const payload={
      name:tForm.name.trim(),
      conditions:tForm.conditions,
    };
    let error;
    if(view==="edit"&&activeTemplate){
      ({error}=await sb.from("meal_templates").update(payload).eq("id",activeTemplate.id));
    } else {
      ({error}=await sb.from("meal_templates").insert(payload));
    }
    setTSaving(false);
    if(error){setTErr(error.message);return;}
    showToast(view==="edit"?"Template updated ✓":"Template created ✓");
    setTForm({name:"",conditions:[]});
    setView("list");
    await loadTemplates();
  }

  async function deleteTemplate(t){
    if(!confirm(`Delete "${t.name}" and all its ${t.food_count} food items? This cannot be undone.`)) return;
    const sb=getSupabase();
    await sb.from("template_food_items").delete().eq("template_id",t.id);
    await sb.from("meal_templates").delete().eq("id",t.id);
    showToast("Template deleted");
    await loadTemplates();
  }

  // ─── SAVE FOOD ITEM ───────────────────────────────────────────────────────
  async function saveFood(){
    if(!fForm.name.trim()){setFErr("Food name is required");return;}
    if(!fForm.calories||isNaN(fForm.calories)){setFErr("Valid calories required");return;}
    setFSaving(true);setFErr("");
    const sb=getSupabase();
    const payload={
      template_id:activeTemplate.id,
      name:fForm.name.trim(),
      calories:parseFloat(fForm.calories)||0,
      protein:parseFloat(fForm.protein)||0,
      carbs:parseFloat(fForm.carbs)||0,
      fat:parseFloat(fForm.fat)||0,
      category:fForm.category||"Protein",
    };
    let error;
    if(editFood){
      ({error}=await sb.from("template_food_items").update(payload).eq("id",editFood.id));
    } else {
      ({error}=await sb.from("template_food_items").insert(payload));
    }
    setFSaving(false);
    if(error){setFErr(error.message);return;}
    showToast(editFood?"Food updated ✓":"Food added ✓");
    setFForm(EMPTY_FOOD);setShowFoodForm(false);setEditFood(null);
    await loadFoods(activeTemplate.id);
    await loadTemplates();
  }

  async function deleteFood(food){
    if(!confirm(`Remove "${food.name}"?`)) return;
    await getSupabase().from("template_food_items").delete().eq("id",food.id);
    showToast("Food removed");
    await loadFoods(activeTemplate.id);
    await loadTemplates();
  }

  // ─── FILTERED FOODS ───────────────────────────────────────────────────────
  const filteredFoods=foods.filter(f=>
    !search||f.name.toLowerCase().includes(search.toLowerCase())||f.category?.toLowerCase().includes(search.toLowerCase())
  );
  const groupedFoods=CAT_OPTIONS.reduce((acc,cat)=>{
    const items=filteredFoods.filter(f=>(f.category||"Custom")===cat);
    if(items.length) acc.push({cat,items});
    return acc;
  },[]);
  // Any uncovered categories
  const knownCats=new Set(CAT_OPTIONS);
  const otherCats=[...new Set(filteredFoods.map(f=>f.category||"Custom").filter(c=>!knownCats.has(c)))];
  otherCats.forEach(cat=>{
    const items=filteredFoods.filter(f=>(f.category||"Custom")===cat);
    if(items.length) groupedFoods.push({cat,items});
  });

  if(!profile)return(
    <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div className="ht-spinner"/>
    </div>
  );

  return(
    <>
      <Head><title>Templates — MyHealth Admin</title></Head>
      <style>{`
        .card{background:${CARD};border-radius:13px;border:1px solid ${BORDER};padding:16px;margin-bottom:12px}
        .ctitle{font-size:11px;font-weight:700;color:${TXT2};text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}
        .btn{padding:9px 18px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .15s;display:inline-flex;align-items:center;gap:6px}
        .btn-p{background:${P};color:#fff}.btn-p:hover{background:#5a3a53}
        .btn-g{background:${G};color:#fff}.btn-g:hover{background:#178a64}
        .btn-r{background:#fff;color:${R};border:1px solid ${R}}.btn-r:hover{background:#fff0f0}
        .btn-ghost{background:transparent;color:${TXT2};border:1px solid ${BORDER}}.btn-ghost:hover{border-color:${P};color:${P}}
        .inp{width:100%;padding:9px 12px;border:1.5px solid ${BORDER};border-radius:9px;font-size:13px;color:${TXT};outline:none;font-family:inherit;background:${CARD}}
        .inp:focus{border-color:${P}}
        .lbl{font-size:11px;font-weight:600;color:${TXT2};margin-bottom:5px;display:block}
        .fwrap{margin-bottom:14px}
        .tcard{background:${CARD};border-radius:12px;border:1.5px solid ${BORDER};padding:16px 18px;margin-bottom:10px;display:flex;align-items:center;gap:14px;transition:border-color .15s;cursor:pointer}
        .tcard:hover{border-color:${P}}
        .ticon{width:44px;height:44px;border-radius:12px;background:${PL};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
        .badge{display:inline-flex;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:600}
        .cond-chips{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}
        .cond-chip{padding:3px 10px;border-radius:20px;border:1.5px solid ${BORDER};font-size:11px;font-weight:600;color:${TXT2};background:transparent;cursor:pointer;font-family:inherit}
        .cond-chip.on{border-color:${P};background:${PL};color:${P}}
        .food-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;border:1px solid ${BORDER};margin-bottom:6px;background:${CARD}}
        .food-row:hover{border-color:${P};background:${PL}}
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
        .stat-box{background:${BG};border-radius:10px;padding:12px;text-align:center}
        @media(max-width:600px){.grid2,.grid3{grid-template-columns:1fr}}
      `}</style>

      {toast&&<div className="ht-toast">{toast}</div>}

      <Layout title="Templates" profile={profile}>

        {/* ── LIST VIEW ── */}
        {view==="list"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
              <div>
                <div style={{fontSize:20,fontWeight:700,marginBottom:2}}>Meal Templates</div>
                <div style={{fontSize:12,color:TXT2}}>Create and manage diet plan templates for users</div>
              </div>
              <button className="btn btn-p" onClick={()=>{setTForm({name:"",conditions:[]});setTErr("");setView("create");}}>
                ＋ New Template
              </button>
            </div>

            {loading&&<div style={{textAlign:"center",padding:"40px",color:TXT2}}>Loading templates…</div>}

            {!loading&&templates.length===0&&(
              <div style={{textAlign:"center",padding:"48px 20px",background:CARD,borderRadius:13,border:`1px solid ${BORDER}`}}>
                <div style={{fontSize:40,marginBottom:12}}>🥗</div>
                <div style={{fontWeight:600,fontSize:15,marginBottom:8}}>No templates yet</div>
                <div style={{fontSize:12,color:TXT2,marginBottom:20}}>Create your first meal template to assign to users</div>
                <button className="btn btn-p" onClick={()=>{setTForm({name:"",conditions:[]});setView("create");}}>＋ Create First Template</button>
              </div>
            )}

            {!loading&&templates.map(t=>(
              <div key={t.id} className="tcard" onClick={()=>{setActiveTemplate(t);loadFoods(t.id);setView("foods");}}>
                <div className="ticon">🥗</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:TXT}}>{t.name}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:5}}>
                    {(t.conditions||[]).map(c=>(
                      <span key={c} className="badge" style={{background:PL,color:P}}>{c}</span>
                    ))}
                    {(!t.conditions||t.conditions.length===0)&&<span style={{fontSize:11,color:TXT3}}>No conditions tagged</span>}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:700,color:G}}>{t.food_count}</div>
                  <div style={{fontSize:10,color:TXT2}}>food items</div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                  <button className="btn btn-ghost" style={{padding:"6px 12px",fontSize:12}} onClick={()=>{
                    setActiveTemplate(t);
                    setTForm({name:t.name,conditions:t.conditions||[]});
                    setTErr("");setView("edit");
                  }}>Edit</button>
                  <button className="btn btn-r" style={{padding:"6px 12px",fontSize:12}} onClick={()=>deleteTemplate(t)}>Delete</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── CREATE / EDIT TEMPLATE ── */}
        {(view==="create"||view==="edit")&&(
          <>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <button className="btn btn-ghost" style={{padding:"7px 14px"}} onClick={()=>setView("list")}>← Back</button>
              <div>
                <div style={{fontSize:18,fontWeight:700}}>{view==="edit"?"Edit Template":"New Template"}</div>
                <div style={{fontSize:12,color:TXT2}}>{view==="edit"?`Editing: ${activeTemplate?.name}`:"Fill in template details"}</div>
              </div>
            </div>

            <div className="card">
              <div className="fwrap">
                <label className="lbl">Template Name *</label>
                <input className="inp" placeholder="e.g. Diabetic + High BP Plan" value={tForm.name} onChange={e=>setTForm(f=>({...f,name:e.target.value}))}/>
              </div>

              <div className="fwrap">
                <label className="lbl">Conditions / Tags (select all that apply)</label>
                <div className="cond-chips">
                  {CONDITION_OPTIONS.map(c=>(
                    <button key={c} className={`cond-chip${tForm.conditions.includes(c)?" on":""}`}
                      onClick={()=>setTForm(f=>({...f,conditions:f.conditions.includes(c)?f.conditions.filter(x=>x!==c):[...f.conditions,c]}))}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {tErr&&<div style={{color:R,fontSize:12,padding:"6px 10px",background:"#fff5f5",borderRadius:8,marginBottom:12}}>{tErr}</div>}

              <div style={{display:"flex",gap:10}}>
                <button className="btn btn-p" disabled={tSaving} onClick={saveTemplate}>
                  {tSaving?"Saving…":view==="edit"?"Save Changes":"Create Template"}
                </button>
                <button className="btn btn-ghost" onClick={()=>setView("list")}>Cancel</button>
              </div>
            </div>
          </>
        )}

        {/* ── FOODS VIEW ── */}
        {view==="foods"&&activeTemplate&&(
          <>
            {/* Header */}
            <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:16,flexWrap:"wrap"}}>
              <button className="btn btn-ghost" style={{padding:"7px 14px",flexShrink:0}} onClick={()=>{setView("list");setSearch("");setShowFoodForm(false);}}>← Templates</button>
              <div style={{flex:1}}>
                <div style={{fontSize:18,fontWeight:700}}>{activeTemplate.name}</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:4}}>
                  {(activeTemplate.conditions||[]).map(c=>(
                    <span key={c} className="badge" style={{background:PL,color:P}}>{c}</span>
                  ))}
                </div>
              </div>
              <button className="btn btn-p" style={{flexShrink:0}} onClick={()=>{setFForm(EMPTY_FOOD);setEditFood(null);setFErr("");setShowFoodForm(true);}}>
                ＋ Add Food
              </button>
            </div>

            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8,marginBottom:14}}>
              <div className="stat-box">
                <div style={{fontSize:20,fontWeight:700,color:P}}>{foods.length}</div>
                <div style={{fontSize:10,color:TXT2}}>Total foods</div>
              </div>
              <div className="stat-box">
                <div style={{fontSize:20,fontWeight:700,color:G}}>{foods.length>0?Math.round(foods.reduce((s,f)=>s+(f.calories||0),0)/foods.length):0}</div>
                <div style={{fontSize:10,color:TXT2}}>Avg kcal</div>
              </div>
              <div className="stat-box">
                <div style={{fontSize:20,fontWeight:700,color:"#7F77DD"}}>{[...new Set(foods.map(f=>f.category))].length}</div>
                <div style={{fontSize:10,color:TXT2}}>Categories</div>
              </div>
              <div className="stat-box">
                <div style={{fontSize:20,fontWeight:700,color:A}}>{foods.filter(f=>f.added_by_user).length}</div>
                <div style={{fontSize:10,color:TXT2}}>User-added</div>
              </div>
            </div>

            {/* Add/Edit food form */}
            {showFoodForm&&(
              <div className="card" style={{borderColor:editFood?A:G,marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontWeight:700,fontSize:14,color:editFood?A:G}}>{editFood?"Edit Food Item":"Add New Food Item"}</div>
                  <button onClick={()=>{setShowFoodForm(false);setEditFood(null);setFForm(EMPTY_FOOD);}}
                    style={{width:28,height:28,borderRadius:"50%",border:`1px solid ${BORDER}`,background:"transparent",cursor:"pointer",fontSize:16,color:TXT2,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                </div>
                <div className="grid2">
                  <div className="fwrap">
                    <label className="lbl">Food Name *</label>
                    <input className="inp" placeholder="e.g. Boiled Egg 1 whole" value={fForm.name} onChange={e=>setFForm(f=>({...f,name:e.target.value}))}/>
                  </div>
                  <div className="fwrap">
                    <label className="lbl">Category</label>
                    <select className="inp" value={fForm.category} onChange={e=>setFForm(f=>({...f,category:e.target.value}))}>
                      {CAT_OPTIONS.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid3">
                  {[["Calories (kcal) *","calories"],["Protein (g)","protein"],["Carbs (g)","carbs"],["Fat (g)","fat"]].map(([l,k])=>(
                    <div key={k} className="fwrap">
                      <label className="lbl">{l}</label>
                      <input className="inp" type="number" placeholder="0" value={fForm[k]} onChange={e=>setFForm(f=>({...f,[k]:e.target.value}))}/>
                    </div>
                  ))}
                </div>
                {fErr&&<div style={{color:R,fontSize:12,padding:"6px 10px",background:"#fff5f5",borderRadius:8,marginBottom:10}}>{fErr}</div>}
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-p" disabled={fSaving} onClick={saveFood}>{fSaving?"Saving…":editFood?"Update Food":"Add Food"}</button>
                  <button className="btn btn-ghost" onClick={()=>{setShowFoodForm(false);setEditFood(null);setFForm(EMPTY_FOOD);}}>Cancel</button>
                </div>
              </div>
            )}

            {/* Search */}
            <div style={{display:"flex",alignItems:"center",gap:8,background:CARD,borderRadius:10,padding:"8px 14px",border:`1px solid ${BORDER}`,marginBottom:12}}>
              <span style={{color:TXT3}}>🔍</span>
              <input placeholder="Search food items or category…" value={search} onChange={e=>setSearch(e.target.value)}
                style={{flex:1,border:"none",background:"transparent",fontSize:13,color:TXT,outline:"none",fontFamily:"inherit"}}/>
              {search&&<button onClick={()=>setSearch("")} style={{border:"none",background:"transparent",color:TXT3,cursor:"pointer",fontSize:16}}>×</button>}
              <span style={{fontSize:11,color:TXT3,flexShrink:0}}>{filteredFoods.length} items</span>
            </div>

            {foodsLoading&&<div style={{textAlign:"center",padding:"30px",color:TXT2}}>Loading…</div>}

            {!foodsLoading&&foods.length===0&&(
              <div style={{textAlign:"center",padding:"40px",background:CARD,borderRadius:13,border:`1px solid ${BORDER}`}}>
                <div style={{fontSize:32,marginBottom:10}}>🍽️</div>
                <div style={{fontWeight:600,marginBottom:6}}>No food items yet</div>
                <div style={{fontSize:12,color:TXT2,marginBottom:16}}>Add food items to this template</div>
                <button className="btn btn-p" onClick={()=>{setFForm(EMPTY_FOOD);setFErr("");setShowFoodForm(true);}}>＋ Add First Food</button>
              </div>
            )}

            {/* Grouped food items */}
            {!foodsLoading&&groupedFoods.map(({cat,items})=>(
              <div key={cat} style={{marginBottom:16}}>
                <div style={{fontSize:10,fontWeight:800,color:TXT2,textTransform:"uppercase",letterSpacing:".07em",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                  {cat}
                  <span style={{flex:1,height:1,background:BORDER}}/>
                  <span style={{fontWeight:400}}>{items.length} items</span>
                </div>
                {items.map(food=>(
                  <div key={food.id} className="food-row">
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:TXT}}>
                        {food.name}
                        {food.added_by_user&&<span style={{fontSize:9,color:TXT3,marginLeft:5,fontWeight:400}}>· user-added</span>}
                      </div>
                      <div style={{display:"flex",gap:10,marginTop:3,fontSize:11}}>
                        <span style={{color:"#7F77DD",fontWeight:700}}>{food.calories||0} kcal</span>
                        <span style={{color:G}}>{food.protein||0}g P</span>
                        <span style={{color:A}}>{food.carbs||0}g C</span>
                        <span style={{color:"#D85A30"}}>{food.fat||0}g F</span>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                      <button className="btn btn-ghost" style={{padding:"5px 10px",fontSize:11}} onClick={()=>{
                        setEditFood(food);
                        setFForm({name:food.name,calories:food.calories,protein:food.protein,carbs:food.carbs,fat:food.fat,category:food.category||"Protein"});
                        setFErr("");setShowFoodForm(true);
                      }}>Edit</button>
                      <button className="btn btn-r" style={{padding:"5px 10px",fontSize:11}} onClick={()=>deleteFood(food)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

      </Layout>
    </>
  );
}
