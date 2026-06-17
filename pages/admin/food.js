import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../../lib/supabase";
import Layout from "../../components/Layout";

const P="#714B67",PL="#f3eef1",G="#1D9E75",GL="#e1f5ee",A="#EF9F27",AL="#faeeda",R="#E24B4A";
const BORDER="#e5e3ee",TXT="#2c1a3a",TXT2="#888",TXT3="#bbb",BG="#f0f0f7",CARD="#fff";

const CATEGORIES=["Protein","Carbs","Fruits","Dairy","Snacks","Beverages","Morning","Custom"];
const MEAL_SLOTS=["morning","breakfast","midmorning","lunch","evening","dinner"];

export default function AdminFood(){
  const router=useRouter();
  const [me,setMe]=useState(null);
  const [templates,setTemplates]=useState([]);
  const [users,setUsers]=useState([]);
  const [selTemplate,setSelTemplate]=useState(null);
  const [selUser,setSelUser]=useState(null);
  const [foods,setFoods]=useState([]);
  const [tab,setTab]=useState("assign");
  const [toast,setToast]=useState(null);
  const [addForm,setAddForm]=useState({name:"",calories:"",protein:"",carbs:"",fat:"",category:"Protein",meal_slots:[]});
  const [saving,setSaving]=useState(false);
  const [search,setSearch]=useState("");

  useEffect(()=>{
    async function init(){
      const sb=getSupabase();
      const{data:{session}}=await sb.auth.getSession();
      if(!session){router.push("/login");return;}
      const{data:p}=await sb.from("profiles").select("*").eq("id",session.user.id).single();
      if(!p||p.role!=="admin"){router.push("/dashboard");return;}
      setMe(p);
      const[{data:t},{data:u}]=await Promise.all([
        sb.from("meal_templates").select("*").order("name"),
        sb.from("profiles").select("id,full_name,email,active_template_id,conditions").eq("status","approved").neq("role","admin"),
      ]);
      setTemplates(t||[]);
      setUsers(u||[]);
      if(t&&t.length>0){
        setSelTemplate(t[0]);
        loadFoods(t[0].id);
      }
    }
    init();
  },[]);

  async function loadFoods(tmplId){
    const{data}=await getSupabase().from("template_food_items").select("*").eq("template_id",tmplId).order("category");
    setFoods(data||[]);
  }

  function showToast(m){setToast(m);setTimeout(()=>setToast(null),2000);}

  async function addFood(){
    if(!addForm.name||!addForm.calories||!selTemplate)return;
    setSaving(true);
    const{error}=await getSupabase().from("template_food_items").insert({
      template_id:selTemplate.id,
      name:addForm.name,
      calories:+addForm.calories,
      protein:+addForm.protein||0,
      carbs:+addForm.carbs||0,
      fat:+addForm.fat||0,
      category:addForm.category,
      meal_slots:addForm.meal_slots,
    });
    setSaving(false);
    if(!error){
      showToast("Food item added ✓");
      setAddForm({name:"",calories:"",protein:"",carbs:"",fat:"",category:"Protein",meal_slots:[]});
      loadFoods(selTemplate.id);
    } else showToast("Error: "+error.message);
  }

  async function deleteFood(id){
    await getSupabase().from("template_food_items").delete().eq("id",id);
    showToast("Item removed");
    loadFoods(selTemplate.id);
  }

  async function assignTemplate(userId,tmplId){
    await getSupabase().from("profiles").update({active_template_id:tmplId}).eq("id",userId);
    showToast("Template assigned ✓");
    const{data:u}=await getSupabase().from("profiles").select("id,full_name,email,active_template_id,conditions").eq("status","approved").neq("role","admin");
    setUsers(u||[]);
  }

  function toggleSlot(s){
    setAddForm(f=>({...f,meal_slots:f.meal_slots.includes(s)?f.meal_slots.filter(x=>x!==s):[...f.meal_slots,s]}));
  }

  const filtered=foods.filter(f=>!search||f.name.toLowerCase().includes(search.toLowerCase()));
  const byCategory=[...new Set(filtered.map(f=>f.category))];

  if(!me)return(
    <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:36,height:36,border:`3px solid ${BORDER}`,borderTopColor:P,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <>
      <Head><title>Food plans — Health Tracker</title></Head>
      <style>{`
        .card{background:${CARD};border-radius:13px;border:1px solid ${BORDER};padding:14px;margin-bottom:12px}
        .ctitle{font-size:11px;font-weight:700;color:${TXT2};text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}
        .tabs{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap}
        .tab{padding:7px 16px;border-radius:20px;border:1px solid ${BORDER};font-size:12px;font-weight:600;cursor:pointer;background:transparent;color:${TXT2};font-family:inherit}
        .tab.on{border-color:${P};background:${PL};color:${P}}
        .label{display:block;font-size:11px;font-weight:700;color:${TXT2};text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;margin-top:10px}
        .inp{width:100%;padding:9px 12px;border:1.5px solid ${BORDER};border-radius:9px;font-size:13px;color:${TXT};outline:none;background:${CARD};font-family:inherit}
        .inp:focus{border-color:${P}}
        .igrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:4px}
        .slot-btns{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}
        .sbtn{padding:4px 10px;border-radius:20px;border:1px solid ${BORDER};font-size:11px;cursor:pointer;background:transparent;color:${TXT2};font-family:inherit}
        .sbtn.on{border-color:${P};background:${PL};color:${P};font-weight:600}
        .btn-add{padding:10px 20px;background:${P};color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;margin-top:12px}
        .btn-add:hover{background:#5a3a53} .btn-add:disabled{background:#b8a0b0;cursor:not-allowed}
        .fitem{display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid ${BORDER};font-size:12px}
        .fitem:last-child{border-bottom:none}
        .fdel{padding:3px 8px;border-radius:6px;border:1px solid #ffd0d0;background:transparent;color:${R};font-size:11px;cursor:pointer;flex-shrink:0}
        .tmpl-btns{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
        .tbtn{padding:7px 14px;border-radius:20px;border:1px solid ${BORDER};font-size:12px;cursor:pointer;background:transparent;color:${TXT2};font-family:inherit}
        .tbtn.on{border-color:${P};background:${PL};color:${P};font-weight:600}
        .ucard{background:${CARD};border-radius:12px;border:1px solid ${BORDER};padding:13px;margin-bottom:8px}
        .uhdr{display:flex;align-items:center;gap:10px;margin-bottom:10px}
        .uav{width:38px;height:38px;border-radius:10px;background:${PL};display:flex;align-items:center;justify-content:center;font-weight:700;color:${P};font-size:15px;flex-shrink:0}
        .tsel{width:100%;padding:8px 12px;border:1.5px solid ${BORDER};border-radius:9px;font-size:12px;color:${TXT};outline:none;background:${CARD};cursor:pointer}
        .tsel:focus{border-color:${P}}
        @media(max-width:480px){.igrid{grid-template-columns:1fr 1fr}}
      `}</style>

      {toast&&<div className="ht-toast">{toast}</div>}

      <Layout title="Food plans" profile={me}>

        <div style={{fontSize:20,fontWeight:700,marginBottom:4}}>Food plans</div>
        <div style={{fontSize:12,color:TXT2,marginBottom:20}}>Manage meal templates and assign to users</div>

        <div className="tabs">
          {[["assign","Assign to users"],["manage","Manage templates"],["add","Add food items"]].map(([id,lbl])=>(
            <button key={id} className={`tab${tab===id?" on":""}`} onClick={()=>setTab(id)}>{lbl}</button>
          ))}
        </div>

        {/* ── ASSIGN TAB ── */}
        {tab==="assign"&&(
          <>
            {users.length===0&&(
              <div style={{textAlign:"center",padding:"40px 20px",background:CARD,borderRadius:13,border:`1px solid ${BORDER}`,color:TXT2,fontSize:13}}>
                No active users yet. Approve users from the Users panel first.
              </div>
            )}
            {users.map(u=>{
              const assigned=templates.find(t=>t.id===u.active_template_id);
              const conds=Object.keys(u.conditions||{}).filter(k=>k!=="none");
              return(
                <div key={u.id} className="ucard">
                  <div className="uhdr">
                    <div className="uav">{u.full_name?.[0]||"?"}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600}}>{u.full_name}</div>
                      <div style={{fontSize:11,color:TXT2}}>{u.email}</div>
                      {conds.length>0&&<div style={{fontSize:10,color:TXT3,marginTop:2}}>{conds.join(" · ")}</div>}
                    </div>
                    {assigned&&<span className="ht-badge" style={{background:GL,color:G,flexShrink:0}}>✓ Assigned</span>}
                  </div>
                  <label style={{fontSize:11,color:TXT2,display:"block",marginBottom:5}}>Assign meal template</label>
                  <select className="tsel" value={u.active_template_id||""} onChange={e=>assignTemplate(u.id,e.target.value)}>
                    <option value="">— Select a template —</option>
                    {templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {assigned&&<div style={{fontSize:11,color:G,marginTop:6}}>✓ Currently on: <b>{assigned.name}</b> · {foods.length} food items</div>}
                </div>
              );
            })}
          </>
        )}

        {/* ── MANAGE TAB ── */}
        {tab==="manage"&&(
          <>
            <div className="card">
              <div className="ctitle">Select template to view</div>
              <div className="tmpl-btns">
                {templates.map(t=>(
                  <button key={t.id} className={`tbtn${selTemplate?.id===t.id?" on":""}`}
                    onClick={()=>{setSelTemplate(t);loadFoods(t.id);setSearch("");}}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {selTemplate&&(
              <div className="card">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div className="ctitle" style={{margin:0}}>{selTemplate.name} — {foods.length} items</div>
                </div>
                <div style={{fontSize:12,color:TXT2,marginBottom:12,lineHeight:1.5}}>{selTemplate.description}</div>
                <input placeholder="Search food items…" value={search} onChange={e=>setSearch(e.target.value)}
                  style={{width:"100%",padding:"8px 12px",border:`1px solid ${BORDER}`,borderRadius:8,fontSize:12,color:TXT,outline:"none",marginBottom:12,fontFamily:"inherit"}}/>
                {byCategory.map(cat=>(
                  <div key={cat} style={{marginBottom:14}}>
                    <div style={{fontSize:10,fontWeight:700,color:TXT3,textTransform:"uppercase",letterSpacing:".05em",marginBottom:6}}>{cat}</div>
                    {filtered.filter(f=>f.category===cat).map(f=>(
                      <div key={f.id} className="fitem">
                        <div style={{flex:1}}>
                          <div style={{fontWeight:500,color:TXT}}>{f.name}</div>
                          <div style={{fontSize:10,color:TXT3}}>{f.calories} kcal · {f.protein}g P · {f.carbs}g C · {f.fat}g F</div>
                        </div>
                        <button className="fdel" onClick={()=>deleteFood(f.id)}>Remove</button>
                      </div>
                    ))}
                  </div>
                ))}
                {filtered.length===0&&<div style={{textAlign:"center",padding:"20px 0",color:TXT3,fontSize:12}}>No items found</div>}
              </div>
            )}
          </>
        )}

        {/* ── ADD FOOD TAB ── */}
        {tab==="add"&&(
          <div className="card">
            <div className="ctitle">Add food item to template</div>

            <label className="label">Select template</label>
            <select className="inp" value={selTemplate?.id||""} onChange={e=>{const t=templates.find(x=>x.id===e.target.value);setSelTemplate(t);if(t)loadFoods(t.id);}}>
              {templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            <label className="label">Food name</label>
            <input className="inp" placeholder="e.g. Grilled chicken (150g)" value={addForm.name} onChange={e=>setAddForm(f=>({...f,name:e.target.value}))}/>

            <label className="label">Nutrition per serving</label>
            <div className="igrid">
              <div>
                <div style={{fontSize:10,color:TXT2,marginBottom:3}}>Calories</div>
                <input className="inp" type="number" placeholder="kcal" value={addForm.calories} onChange={e=>setAddForm(f=>({...f,calories:e.target.value}))}/>
              </div>
              <div>
                <div style={{fontSize:10,color:TXT2,marginBottom:3}}>Protein (g)</div>
                <input className="inp" type="number" placeholder="g" value={addForm.protein} onChange={e=>setAddForm(f=>({...f,protein:e.target.value}))}/>
              </div>
              <div>
                <div style={{fontSize:10,color:TXT2,marginBottom:3}}>Carbs (g)</div>
                <input className="inp" type="number" placeholder="g" value={addForm.carbs} onChange={e=>setAddForm(f=>({...f,carbs:e.target.value}))}/>
              </div>
              <div>
                <div style={{fontSize:10,color:TXT2,marginBottom:3}}>Fat (g)</div>
                <input className="inp" type="number" placeholder="g" value={addForm.fat} onChange={e=>setAddForm(f=>({...f,fat:e.target.value}))}/>
              </div>
            </div>

            <label className="label">Category</label>
            <select className="inp" value={addForm.category} onChange={e=>setAddForm(f=>({...f,category:e.target.value}))}>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>

            <label className="label">Meal slots (when this food appears)</label>
            <div className="slot-btns">
              {MEAL_SLOTS.map(s=>(
                <button key={s} className={`sbtn${addForm.meal_slots.includes(s)?" on":""}`} onClick={()=>toggleSlot(s)}>{s}</button>
              ))}
            </div>

            <div style={{background:PL,border:`1px solid ${P}`,borderRadius:9,padding:"10px 13px",marginTop:14,fontSize:12,color:P}}>
              Adding to: <b>{selTemplate?.name||"—"}</b> · Currently {foods.length} items
            </div>

            <button className="btn-add" onClick={addFood} disabled={saving||!addForm.name||!addForm.calories}>
              {saving?"Adding…":"+ Add food item"}
            </button>
          </div>
        )}

      </Layout>
    </>
  );
}
