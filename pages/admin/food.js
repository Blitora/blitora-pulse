import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../../lib/supabase";
import Layout from "../../components/Layout";

const P="#714B67",PL="#f3eef1",G="#1D9E75",GL="#e1f5ee",A="#EF9F27",AL="#faeeda",R="#E24B4A",RL="#fcebeb";
const BORDER="#e5e3ee",TXT="#2c1a3a",TXT2="#888",TXT3="#bbb",BG="#f0f0f7",CARD="#fff";
const CATEGORIES=["Protein","Carbs","Fruits","Dairy","Snacks","Beverages","Morning","Vegetables","Condiments","Custom"];
const MEAL_SLOTS=["morning","breakfast","midmorning","lunch","evening","dinner"];

export default function AdminFood(){
  const router=useRouter();
  const [me,setMe]=useState(null);
  const [templates,setTemplates]=useState([]);
  const [users,setUsers]=useState([]);
  const [selTemplate,setSelTemplate]=useState(null);
  const [foods,setFoods]=useState([]);
  const [tab,setTab]=useState("users");
  const [toast,setToast]=useState(null);
  const [selUser,setSelUser]=useState(null);
  const [selFood,setSelFood]=useState(null);
  const [catFilter,setCatFilter]=useState("All");
  const [search,setSearch]=useState("");
  const [saving,setSaving]=useState(false);
  const [addForm,setAddForm]=useState({name:"",calories:"",protein:"",carbs:"",fat:"",category:"Protein",meal_slots:[]});
  const [editForm,setEditForm]=useState(null);

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
        sb.from("profiles").select("id,full_name,email,active_template_id,conditions,weight_current,weight_target,status").neq("role","admin").order("created_at",{ascending:false}),
      ]);
      setTemplates(t||[]);
      setUsers(u||[]);
      if(t&&t.length>0){setSelTemplate(t[0]);loadFoods(t[0].id);}
    }
    init();
  },[]);

  async function loadFoods(tmplId){
    const{data}=await getSupabase().from("template_food_items").select("*").eq("template_id",tmplId).order("category");
    setFoods(data||[]);
  }

  function showToast(m){setToast(m);setTimeout(()=>setToast(null),2000);}

  async function assignTemplate(userId,tmplId){
    await getSupabase().from("profiles").update({active_template_id:tmplId}).eq("id",userId);
    showToast("Template assigned ✓");
    const{data:u}=await getSupabase().from("profiles").select("id,full_name,email,active_template_id,conditions,weight_current,weight_target,status").neq("role","admin").order("created_at",{ascending:false});
    setUsers(u||[]);
    if(selUser){const updated=u?.find(x=>x.id===selUser.id);if(updated)setSelUser(updated);}
  }

  async function addFood(){
    if(!addForm.name||!addForm.calories||!selTemplate)return;
    setSaving(true);
    const{error}=await getSupabase().from("template_food_items").insert({
      template_id:selTemplate.id,name:addForm.name,calories:+addForm.calories,
      protein:+addForm.protein||0,carbs:+addForm.carbs||0,fat:+addForm.fat||0,
      category:addForm.category,meal_slots:addForm.meal_slots,
    });
    setSaving(false);
    if(!error){showToast("Food added ✓");setAddForm({name:"",calories:"",protein:"",carbs:"",fat:"",category:"Protein",meal_slots:[]});loadFoods(selTemplate.id);}
    else showToast("Error: "+error.message);
  }

  async function saveEdit(){
    if(!editForm)return;
    setSaving(true);
    await getSupabase().from("template_food_items").update({
      name:editForm.name,calories:+editForm.calories,protein:+editForm.protein,
      carbs:+editForm.carbs,fat:+editForm.fat,category:editForm.category,meal_slots:editForm.meal_slots,
    }).eq("id",editForm.id);
    setSaving(false);showToast("Food updated ✓");setSelFood(null);setEditForm(null);loadFoods(selTemplate.id);
  }

  async function deleteFood(id){
    if(!confirm("Remove this food item?"))return;
    await getSupabase().from("template_food_items").delete().eq("id",id);
    showToast("Removed");setSelFood(null);setEditForm(null);loadFoods(selTemplate.id);
  }

  function toggleSlot(s,form,setForm){
    setForm(f=>({...f,meal_slots:f.meal_slots?.includes(s)?f.meal_slots.filter(x=>x!==s):[...(f.meal_slots||[]),s]}));
  }

  const cats=["All",...new Set(foods.map(f=>f.category).filter(Boolean))];
  const filtered=foods.filter(f=>
    (catFilter==="All"||f.category===catFilter)&&
    (!search||f.name.toLowerCase().includes(search.toLowerCase()))
  );

  if(!me)return(
    <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:36,height:36,border:`3px solid ${BORDER}`,borderTopColor:P,borderRadius:"50%",animation:"s .7s linear infinite"}}/>
      <style>{`@keyframes s{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <>
      <Head><title>Food plans — Health Tracker</title></Head>
      <style>{`
        .card{background:${CARD};border-radius:13px;border:1px solid ${BORDER};padding:14px;margin-bottom:12px}
        .ctitle{font-size:11px;font-weight:700;color:${TXT2};text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}
        .tabs{display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap}
        .tab{padding:8px 18px;border-radius:20px;border:1px solid ${BORDER};font-size:12px;font-weight:600;cursor:pointer;background:transparent;color:${TXT2};font-family:inherit;transition:all .15s}
        .tab.on{border-color:${P};background:${PL};color:${P}}
        .ugrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;margin-bottom:12px}
        .ucard{background:${CARD};border-radius:12px;border:1px solid ${BORDER};padding:14px;cursor:pointer;transition:all .2s}
        .ucard:hover{border-color:${P};transform:translateY(-1px);box-shadow:0 4px 12px rgba(113,75,103,.1)}
        .ucard.sel{border-color:${P};background:${PL}}
        .uav{width:42px;height:42px;border-radius:11px;background:${PL};display:flex;align-items:center;justify-content:center;font-weight:700;color:${P};font-size:17px;flex-shrink:0;margin-bottom:10px}
        .fgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px}
        .fcard{background:${CARD};border-radius:10px;border:1px solid ${BORDER};padding:11px;cursor:pointer;transition:all .15s;position:relative}
        .fcard:hover{border-color:${P};transform:translateY(-1px)}
        .fcard.sel{border-color:${P};background:${PL}}
        .fdel-btn{position:absolute;top:8px;right:8px;width:22px;height:22px;border-radius:50%;border:1px solid ${RL};background:#fff;color:${R};font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700;opacity:0;transition:opacity .15s}
        .fcard:hover .fdel-btn{opacity:1}
        .label{display:block;font-size:11px;font-weight:700;color:${TXT2};text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;margin-top:12px}
        .inp{width:100%;padding:9px 12px;border:1.5px solid ${BORDER};border-radius:9px;font-size:13px;color:${TXT};outline:none;background:${CARD};font-family:inherit;transition:border-color .2s}
        .inp:focus{border-color:${P}}
        .igrid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .igrid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px}
        .sbtn{padding:4px 10px;border-radius:20px;border:1px solid ${BORDER};font-size:11px;cursor:pointer;background:transparent;color:${TXT2};font-family:inherit;transition:all .15s}
        .sbtn.on{border-color:${P};background:${PL};color:${P};font-weight:600}
        .btn-p{padding:10px 20px;background:${P};color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .2s}
        .btn-p:hover{background:#5a3a53} .btn-p:disabled{background:#b8a0b0;cursor:not-allowed}
        .btn-r{padding:10px 16px;background:#fff;color:${R};border:1.5px solid ${RL};border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
        .btn-o{padding:10px 16px;background:#fff;color:${TXT2};border:1.5px solid ${BORDER};border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
        .tmpl-btns{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
        .tbtn{padding:7px 14px;border-radius:20px;border:1px solid ${BORDER};font-size:12px;cursor:pointer;background:transparent;color:${TXT2};font-family:inherit;transition:all .15s}
        .tbtn.on{border-color:${P};background:${PL};color:${P};font-weight:600}
        .detail-panel{background:${CARD};border-radius:13px;border:1px solid ${BORDER};padding:16px;margin-bottom:12px}
        .back-btn{display:flex;align-items:center;gap:6px;font-size:12px;color:${TXT2};cursor:pointer;border:none;background:none;font-family:inherit;margin-bottom:14px;padding:0}
        .back-btn:hover{color:${P}}
        .badge{display:inline-flex;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:600}
        .cat-btns{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px}
        .catbtn{padding:3px 10px;border-radius:20px;border:1px solid ${BORDER};font-size:10px;font-weight:600;color:${TXT2};background:transparent;cursor:pointer;transition:all .15s}
        .catbtn.on{border-color:${P};background:${PL};color:${P}}
        .sinp{width:100%;padding:8px 12px;border-radius:8px;border:1px solid ${BORDER};font-size:12px;color:${TXT};outline:none;margin-bottom:10px;font-family:inherit}
        .sinp:focus{border-color:${P}}
        .tsel{width:100%;padding:9px 12px;border:1.5px solid ${BORDER};border-radius:9px;font-size:13px;color:${TXT};outline:none;background:${CARD};cursor:pointer;font-family:inherit}
        .tsel:focus{border-color:${P}}
        .section-hdr{font-size:12px;font-weight:700;color:${TXT};margin-bottom:10px;margin-top:20px;display:flex;align-items:center;gap:8px}
        @media(max-width:480px){.fgrid{grid-template-columns:repeat(2,1fr)}.igrid4{grid-template-columns:1fr 1fr}}
      `}</style>

      {toast&&<div className="ht-toast">{toast}</div>}

      <Layout title="Food plans" profile={me}>

        <div style={{fontSize:20,fontWeight:700,marginBottom:4}}>Food plans</div>
        <div style={{fontSize:12,color:TXT2,marginBottom:20}}>Manage templates, assign to users, add or remove food items</div>

        <div className="tabs">
          {[["users","👥 Users"],["templates","🥗 Templates"],["add","➕ Add food"]].map(([id,lbl])=>(
            <button key={id} className={`tab${tab===id?" on":""}`} onClick={()=>{setTab(id);setSelUser(null);setSelFood(null);}}>
              {lbl}
            </button>
          ))}
        </div>

        {/* ══ USERS TAB ══ */}
        {tab==="users"&&!selUser&&(
          <>
            <div style={{fontSize:13,fontWeight:600,color:TXT2,marginBottom:12}}>
              {users.length} user{users.length!==1?"s":""} — click to manage
            </div>
            {users.length===0&&(
              <div style={{textAlign:"center",padding:"48px",background:CARD,borderRadius:13,border:`1px solid ${BORDER}`,color:TXT2}}>
                No users yet. Users appear here after they register.
              </div>
            )}
            <div className="ugrid">
              {users.map(u=>{
                const assigned=templates.find(t=>t.id===u.active_template_id);
                const conds=Object.keys(u.conditions||{}).filter(k=>k!=="none");
                const statusColor=u.status==="approved"?G:u.status==="pending"?A:R;
                const statusBg=u.status==="approved"?GL:u.status==="pending"?AL:RL;
                return(
                  <div key={u.id} className="ucard" onClick={()=>setSelUser(u)}>
                    <div className="uav">{u.full_name?.[0]||"?"}</div>
                    <div style={{fontSize:14,fontWeight:700,marginBottom:2}}>{u.full_name||"Unknown"}</div>
                    <div style={{fontSize:11,color:TXT2,marginBottom:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
                      <span className="badge" style={{background:statusBg,color:statusColor}}>{u.status}</span>
                      {assigned&&<span className="badge" style={{background:GL,color:G}}>✓ Plan assigned</span>}
                      {!assigned&&u.status==="approved"&&<span className="badge" style={{background:AL,color:A}}>⚠ No plan</span>}
                    </div>
                    {conds.length>0&&<div style={{fontSize:10,color:TXT3}}>{conds.slice(0,3).join(" · ")}{conds.length>3?"…":""}</div>}
                    {assigned&&<div style={{fontSize:11,color:P,marginTop:4,fontWeight:500}}>📋 {assigned.name}</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* USER DETAIL VIEW */}
        {tab==="users"&&selUser&&(()=>{
          const assigned=templates.find(t=>t.id===selUser.active_template_id);
          const conds=Object.keys(selUser.conditions||{}).filter(k=>k!=="none");
          return(
            <>
              <button className="back-btn" onClick={()=>setSelUser(null)}>← Back to users</button>
              <div className="detail-panel">
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
                  <div style={{width:48,height:48,borderRadius:12,background:PL,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:P,fontSize:20,flexShrink:0}}>{selUser.full_name?.[0]||"?"}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:700}}>{selUser.full_name}</div>
                    <div style={{fontSize:12,color:TXT2}}>{selUser.email}</div>
                    {conds.length>0&&<div style={{fontSize:11,color:TXT3,marginTop:2}}>{conds.join(" · ")}</div>}
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {selUser.weight_current&&<div style={{textAlign:"center",background:BG,borderRadius:8,padding:"6px 12px"}}><div style={{fontSize:14,fontWeight:700}}>{selUser.weight_current}kg</div><div style={{fontSize:10,color:TXT2}}>Current</div></div>}
                    {selUser.weight_target&&<div style={{textAlign:"center",background:BG,borderRadius:8,padding:"6px 12px"}}><div style={{fontSize:14,fontWeight:700,color:P}}>{selUser.weight_target}kg</div><div style={{fontSize:10,color:TXT2}}>Target</div></div>}
                  </div>
                </div>

                <label className="label" style={{marginTop:0}}>Assign meal template</label>
                <select className="tsel" value={selUser.active_template_id||""} onChange={e=>{assignTemplate(selUser.id,e.target.value);setSelUser({...selUser,active_template_id:e.target.value});}}>
                  <option value="">— Select a template —</option>
                  {templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {assigned&&(
                  <div style={{background:GL,border:`1px solid ${G}`,borderRadius:9,padding:"10px 13px",marginTop:10,fontSize:12,color:G}}>
                    ✓ Currently on: <b>{assigned.name}</b>
                    <br/><span style={{fontSize:11,color:TXT2}}>Food items in this template appear in the user's meal log.</span>
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {/* ══ TEMPLATES TAB ══ */}
        {tab==="templates"&&!selFood&&(
          <>
            <div className="tmpl-btns">
              {templates.map(t=>(
                <button key={t.id} className={`tbtn${selTemplate?.id===t.id?" on":""}`}
                  onClick={()=>{setSelTemplate(t);loadFoods(t.id);setSearch("");setCatFilter("All");}}>
                  {t.name}
                </button>
              ))}
            </div>

            {selTemplate&&(
              <div className="card">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,color:TXT}}>{selTemplate.name}</div>
                    <div style={{fontSize:12,color:TXT2,marginTop:2}}>{selTemplate.description}</div>
                  </div>
                  <span className="badge" style={{background:PL,color:P}}>{foods.length} items</span>
                </div>

                <input className="sinp" placeholder="Search food items…" value={search} onChange={e=>setSearch(e.target.value)}/>
                <div className="cat-btns">
                  {cats.map(c=><button key={c} className={`catbtn${catFilter===c?" on":""}`} onClick={()=>setCatFilter(c)}>{c}</button>)}
                </div>

                <div style={{fontSize:12,color:TXT2,marginBottom:10}}>{filtered.length} items{catFilter!=="All"?` in ${catFilter}`:""} — click to edit</div>

                <div className="fgrid">
                  {filtered.map(f=>(
                    <div key={f.id} className="fcard" onClick={()=>{setSelFood(f);setEditForm({...f});}}>
                      <button className="fdel-btn" onClick={e=>{e.stopPropagation();deleteFood(f.id);}}>×</button>
                      <div style={{fontSize:12,fontWeight:600,color:TXT,marginBottom:4,paddingRight:20,lineHeight:1.3}}>{f.name}</div>
                      <div style={{fontSize:10,color:TXT3,marginBottom:6}}>{f.category}</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:11,fontWeight:700,color:"#7F77DD"}}>{f.calories} kcal</span>
                        <span style={{fontSize:11,color:G}}>{f.protein}g P</span>
                        <span style={{fontSize:11,color:A}}>{f.carbs}g C</span>
                      </div>
                      {f.meal_slots?.length>0&&<div style={{fontSize:9,color:TXT3,marginTop:5}}>{f.meal_slots.join(" · ")}</div>}
                    </div>
                  ))}
                </div>

                {filtered.length===0&&<div style={{textAlign:"center",padding:"32px",color:TXT3,fontSize:13}}>No items found</div>}
              </div>
            )}
          </>
        )}

        {/* FOOD DETAIL / EDIT VIEW */}
        {tab==="templates"&&selFood&&editForm&&(
          <>
            <button className="back-btn" onClick={()=>{setSelFood(null);setEditForm(null);}}>← Back to {selTemplate?.name}</button>
            <div className="detail-panel">
              <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>Edit food item</div>

              <label className="label" style={{marginTop:0}}>Food name</label>
              <input className="inp" value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}/>

              <label className="label">Nutrition per serving</label>
              <div className="igrid4" style={{marginBottom:0}}>
                {[["calories","Calories (kcal)"],["protein","Protein (g)"],["carbs","Carbs (g)"],["fat","Fat (g)"]].map(([k,l])=>(
                  <div key={k}>
                    <div style={{fontSize:10,color:TXT2,marginBottom:3}}>{l}</div>
                    <input className="inp" type="number" value={editForm[k]||""} onChange={e=>setEditForm(f=>({...f,[k]:e.target.value}))}/>
                  </div>
                ))}
              </div>

              <label className="label">Category</label>
              <select className="inp" value={editForm.category||""} onChange={e=>setEditForm(f=>({...f,category:e.target.value}))}>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>

              <label className="label">Meal slots</label>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:16}}>
                {MEAL_SLOTS.map(s=>(
                  <button key={s} className={`sbtn${editForm.meal_slots?.includes(s)?" on":""}`} onClick={()=>toggleSlot(s,editForm,setEditForm)}>{s}</button>
                ))}
              </div>

              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <button className="btn-p" disabled={saving} onClick={saveEdit}>{saving?"Saving…":"Save changes"}</button>
                <button className="btn-o" onClick={()=>{setSelFood(null);setEditForm(null);}}>Cancel</button>
                <button className="btn-r" onClick={()=>deleteFood(editForm.id)}>Remove item</button>
              </div>
            </div>
          </>
        )}

        {/* ══ ADD FOOD TAB ══ */}
        {tab==="add"&&(
          <>
            {/* ADD FORM */}
            <div className="card">
              <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>Add food item</div>

              <label className="label" style={{marginTop:0}}>Select template</label>
              <select className="tsel" value={selTemplate?.id||""} onChange={e=>{const t=templates.find(x=>x.id===e.target.value);setSelTemplate(t);if(t)loadFoods(t.id);}}>
                {templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              <div className="igrid2" style={{marginTop:0}}>
                <div>
                  <label className="label" style={{marginTop:12}}>Food name</label>
                  <input className="inp" placeholder="e.g. Grilled chicken 150g" value={addForm.name} onChange={e=>setAddForm(f=>({...f,name:e.target.value}))}/>
                </div>
                <div>
                  <label className="label" style={{marginTop:12}}>Category</label>
                  <select className="inp" value={addForm.category} onChange={e=>setAddForm(f=>({...f,category:e.target.value}))}>
                    {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <label className="label">Nutrition per serving</label>
              <div className="igrid4">
                {[["calories","Calories"],["protein","Protein g"],["carbs","Carbs g"],["fat","Fat g"]].map(([k,l])=>(
                  <div key={k}>
                    <div style={{fontSize:10,color:TXT2,marginBottom:3}}>{l}</div>
                    <input className="inp" type="number" placeholder="0" value={addForm[k]} onChange={e=>setAddForm(f=>({...f,[k]:e.target.value}))}/>
                  </div>
                ))}
              </div>

              <label className="label">Appears in meal slots</label>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14}}>
                {MEAL_SLOTS.map(s=>(
                  <button key={s} className={`sbtn${addForm.meal_slots.includes(s)?" on":""}`} onClick={()=>toggleSlot(s,addForm,setAddForm)}>{s}</button>
                ))}
              </div>

              <div style={{background:PL,border:`1px solid ${P}`,borderRadius:9,padding:"9px 13px",marginBottom:14,fontSize:12,color:P}}>
                Adding to: <b>{selTemplate?.name||"—"}</b> · {foods.length} items currently
              </div>
              <button className="btn-p" onClick={addFood} disabled={saving||!addForm.name||!addForm.calories}>
                {saving?"Adding…":"+ Add food item"}
              </button>
            </div>

            {/* ALL FOODS GRID BELOW */}
            {selTemplate&&(
              <>
                <div className="section-hdr">
                  All items in {selTemplate.name}
                  <span className="badge" style={{background:PL,color:P}}>{foods.length}</span>
                </div>
                <input className="sinp" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
                <div className="cat-btns">
                  {cats.map(c=><button key={c} className={`catbtn${catFilter===c?" on":""}`} onClick={()=>setCatFilter(c)}>{c}</button>)}
                </div>
                <div className="fgrid">
                  {filtered.map(f=>(
                    <div key={f.id} className="fcard" onClick={()=>{setTab("templates");setSelFood(f);setEditForm({...f});}}>
                      <button className="fdel-btn" onClick={e=>{e.stopPropagation();deleteFood(f.id);}}>×</button>
                      <div style={{fontSize:12,fontWeight:600,color:TXT,marginBottom:4,paddingRight:20,lineHeight:1.3}}>{f.name}</div>
                      <div style={{fontSize:10,color:TXT3,marginBottom:6}}>{f.category}</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:11,fontWeight:700,color:"#7F77DD"}}>{f.calories} kcal</span>
                        <span style={{fontSize:11,color:G}}>{f.protein}g P</span>
                        <span style={{fontSize:11,color:A}}>{f.carbs}g C</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

      </Layout>
    </>
  );
}
