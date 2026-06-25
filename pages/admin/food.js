import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../../lib/supabase";
import Layout from "../../components/Layout";

const P="#714B67",PL="#f3eef1",G="#1D9E75",GL="#e1f5ee",A="#EF9F27",AL="#faeeda",R="#E24B4A",RL="#fcebeb";
const BORDER="#e5e3ee",TXT="#2c1a3a",TXT2="#888",TXT3="#bbb",BG="#f0f0f7",CARD="#fff";

const CATEGORIES=["Protein","Carbs","Fruits","Dairy","Snacks","Beverages","Morning","Vegetables","Condiments","Custom"];
const MEAL_SLOTS=["morning","breakfast","midmorning","lunch","evening","dinner"];
const CONDITION_OPTIONS=["Diabetes","High BP","Thyroid","Weight Loss","Weight Gain","General Healthy","Obesity","Digestive"];

const USER_COLS_DEFAULT=[
  {key:"full_name",   label:"Name",       visible:true,  width:160},
  {key:"email",       label:"Email",      visible:true,  width:200},
  {key:"status",      label:"Status",     visible:true,  width:90},
  {key:"template",    label:"Template",   visible:true,  width:160},
  {key:"conditions",  label:"Conditions", visible:true,  width:180},
  {key:"weight_current",label:"Weight",   visible:true,  width:80},
  {key:"weight_target", label:"Target",   visible:false, width:80},
  {key:"diet_type",   label:"Diet",       visible:false, width:100},
  {key:"created_at",  label:"Joined",     visible:false, width:100},
];

const FOOD_COLS_DEFAULT=[
  {key:"name",      label:"Food item",   visible:true,  width:220},
  {key:"category",  label:"Category",    visible:true,  width:110},
  {key:"calories",  label:"Cal (kcal)",  visible:true,  width:90},
  {key:"protein",   label:"Protein (g)", visible:true,  width:90},
  {key:"carbs",     label:"Carbs (g)",   visible:true,  width:90},
  {key:"fat",       label:"Fat (g)",     visible:false, width:80},
  {key:"meal_slots",label:"Meal slots",  visible:true,  width:200},
  {key:"template",  label:"Template",    visible:false, width:150},
];

// ── CONFIGURABLE DATA GRID ────────────────────────────────────
function DataGrid({gridKey,colsDef,rows,onRowClick,onDeleteRow,renderCell,userId,extraActions}){
  const [cols,setCols]=useState(colsDef);
  const [showColMgr,setShowColMgr]=useState(false);
  const [search,setSearch]=useState("");
  const [sortKey,setSortKey]=useState(null);
  const [sortDir,setSortDir]=useState("asc");
  const [dragIdx,setDragIdx]=useState(null);
  const [dragOverIdx,setDragOverIdx]=useState(null);
  const [saved,setSaved]=useState(false);
  const colMgrRef=useRef(null);

  useEffect(()=>{
    if(!userId)return;
    getSupabase().from("grid_preferences").select("columns").eq("user_id",userId).eq("grid_key",gridKey).single()
      .then(({data})=>{
        if(data?.columns?.length>0){
          const merged=colsDef.map(def=>{const s=data.columns.find(c=>c.key===def.key);return s?{...def,...s}:def;});
          data.columns.forEach(s=>{if(!merged.find(m=>m.key===s.key))merged.push(s);});
          setCols(merged);setSaved(true);
        }
      });
  },[userId,gridKey]);

  async function savePrefs(newCols){
    if(!userId)return;
    await getSupabase().from("grid_preferences").upsert({user_id:userId,grid_key:gridKey,columns:newCols},{onConflict:"user_id,grid_key"});
    setSaved(true);
  }

  function toggleCol(key){const next=cols.map(c=>c.key===key?{...c,visible:!c.visible}:c);setCols(next);savePrefs(next);}
  function handleSort(key){if(sortKey===key)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortKey(key);setSortDir("asc");}}
  function onDragStart(i){setDragIdx(i);}
  function onDragOver(e,i){e.preventDefault();setDragOverIdx(i);}
  function onDrop(i){
    if(dragIdx===null||dragIdx===i)return;
    const next=[...cols];const[moved]=next.splice(dragIdx,1);next.splice(i,0,moved);
    setCols(next);savePrefs(next);setDragIdx(null);setDragOverIdx(null);
  }

  const visibleCols=cols.filter(c=>c.visible);
  const filtered=rows.filter(r=>{
    if(!search)return true;
    return visibleCols.some(c=>{const v=renderCell(r,c.key,true);return v&&String(v).toLowerCase().includes(search.toLowerCase());});
  });
  const sorted=[...filtered].sort((a,b)=>{
    if(!sortKey)return 0;
    const av=renderCell(a,sortKey,true)||"",bv=renderCell(b,sortKey,true)||"";
    return sortDir==="asc"?String(av).localeCompare(String(bv)):String(bv).localeCompare(String(av));
  });

  return(
    <div>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
          style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${BORDER}`,fontSize:12,color:TXT,outline:"none",flex:1,minWidth:160,fontFamily:"inherit"}}/>
        <span style={{fontSize:12,color:TXT2}}>{sorted.length} records</span>
        {extraActions}
        <div style={{position:"relative"}} ref={colMgrRef}>
          <button onClick={()=>setShowColMgr(v=>!v)} style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${showColMgr?P:BORDER}`,background:showColMgr?PL:CARD,color:showColMgr?P:TXT2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
            ⚙ Columns {saved&&<span style={{width:6,height:6,borderRadius:"50%",background:G,display:"inline-block"}}/>}
          </button>
          {showColMgr&&(
            <div style={{position:"absolute",right:0,top:"calc(100% + 4px)",background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,padding:12,zIndex:50,minWidth:220,boxShadow:"0 4px 20px rgba(0,0,0,.1)"}}>
              <div style={{fontSize:11,fontWeight:700,color:TXT2,marginBottom:8,textTransform:"uppercase",letterSpacing:".04em"}}>Columns — drag to reorder</div>
              {cols.map((c,i)=>(
                <div key={c.key} draggable onDragStart={()=>onDragStart(i)} onDragOver={e=>onDragOver(e,i)} onDrop={()=>onDrop(i)}
                  style={{display:"flex",alignItems:"center",gap:8,padding:"6px 4px",borderRadius:6,cursor:"grab",background:dragOverIdx===i?"#f0f0f7":"transparent",borderBottom:`1px solid ${BORDER}`,opacity:dragIdx===i?.4:1}}>
                  <span style={{color:TXT3,fontSize:14,userSelect:"none"}}>⠿</span>
                  <span style={{flex:1,fontSize:12,color:TXT}}>{c.label}</span>
                  <button onClick={()=>toggleCol(c.key)} style={{width:32,height:18,borderRadius:9,border:"none",cursor:"pointer",background:c.visible?P:BORDER,transition:"background .2s",position:"relative",flexShrink:0}}>
                    <span style={{position:"absolute",top:2,left:c.visible?14:2,width:14,height:14,borderRadius:7,background:"#fff",transition:"left .2s"}}/>
                  </button>
                </div>
              ))}
              <button onClick={()=>{setCols(colsDef);savePrefs(colsDef);}} style={{marginTop:10,width:"100%",padding:"6px",border:`1px solid ${BORDER}`,borderRadius:7,background:"transparent",color:TXT2,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Reset to defaults</button>
            </div>
          )}
        </div>
      </div>
      <div style={{overflowX:"auto",borderRadius:12,border:`1px solid ${BORDER}`,background:CARD}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:visibleCols.reduce((s,c)=>s+c.width,0)}}>
          <thead>
            <tr style={{background:"#faf9fd",borderBottom:`1px solid ${BORDER}`}}>
              {visibleCols.map(c=>(
                <th key={c.key} onClick={()=>handleSort(c.key)}
                  style={{padding:"10px 12px",textAlign:"left",color:TXT2,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em",whiteSpace:"nowrap",cursor:"pointer",userSelect:"none",minWidth:c.width,borderBottom:sortKey===c.key?`2px solid ${P}`:"2px solid transparent"}}>
                  {c.label} {sortKey===c.key?(sortDir==="asc"?"↑":"↓"):""}
                </th>
              ))}
              <th style={{padding:"10px 12px",width:60}}/>
            </tr>
          </thead>
          <tbody>
            {sorted.length===0&&<tr><td colSpan={visibleCols.length+1} style={{padding:"40px",textAlign:"center",color:TXT3}}>No records found</td></tr>}
            {sorted.map((row,i)=>(
              <tr key={row.id||i} onClick={()=>onRowClick&&onRowClick(row)}
                style={{borderBottom:`1px solid ${BORDER}`,cursor:onRowClick?"pointer":"default",transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#faf9fd"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                {visibleCols.map(c=>(
                  <td key={c.key} style={{padding:"10px 12px",whiteSpace:c.key==="conditions"||c.key==="meal_slots"?"normal":"nowrap",maxWidth:c.width+40}}>
                    {renderCell(row,c.key,false)}
                  </td>
                ))}
                <td style={{padding:"10px 12px",textAlign:"right"}} onClick={e=>e.stopPropagation()}>
                  {onDeleteRow&&<button onClick={()=>onDeleteRow(row)} style={{padding:"3px 8px",border:`1px solid ${RL}`,borderRadius:6,background:CARD,color:R,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✕</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function AdminFood(){
  const router=useRouter();
  const [me,setMe]=useState(null);
  const [templates,setTemplates]=useState([]);
  const [users,setUsers]=useState([]);
  const [allFoods,setAllFoods]=useState([]);
  const [tab,setTab]=useState("users");
  const [toast,setToast]=useState(null);
  const [detail,setDetail]=useState(null);
  const [addFoodForm,setAddFoodForm]=useState({name:"",calories:"",protein:"",carbs:"",fat:"",category:"Protein",meal_slots:[],template_id:""});
  const [saving,setSaving]=useState(false);
  const [selTemplateId,setSelTemplateId]=useState("");

  // ── Template management state ────────────────────────────────
  const [tmplView,setTmplView]=useState("list");       // list | create | edit | foods
  const [activeTmpl,setActiveTmpl]=useState(null);
  const [tmplForm,setTmplForm]=useState({name:"",conditions:[]});
  const [tmplSaving,setTmplSaving]=useState(false);
  const [tmplErr,setTmplErr]=useState("");
  const [tmplFoods,setTmplFoods]=useState([]);
  const [tmplFoodsLoading,setTmplFoodsLoading]=useState(false);
  const [showFoodForm,setShowFoodForm]=useState(false);
  const [editFoodItem,setEditFoodItem]=useState(null);
  const [fForm,setFForm]=useState({name:"",calories:"",protein:"",carbs:"",fat:"",category:"Protein"});
  const [fSaving,setFSaving]=useState(false);
  const [fErr,setFErr]=useState("");
  const [tmplSearch,setTmplSearch]=useState("");

  useEffect(()=>{
    async function init(){
      const sb=getSupabase();
      const{data:{session}}=await sb.auth.getSession();
      if(!session){router.push("/login");return;}
      const{data:p}=await sb.from("profiles").select("*").eq("id",session.user.id).single();
      if(!p||p.role!=="admin"){router.push("/dashboard");return;}
      setMe(p);
      await loadAll(sb);
    }
    init();
  },[]);

  async function loadAll(sb){
    const s=sb||getSupabase();
    const[{data:t},{data:u},{data:f}]=await Promise.all([
      s.from("meal_templates").select("*").order("name"),
      s.from("profiles").select("*").neq("role","admin").order("created_at",{ascending:false}),
      s.from("template_food_items").select("*,meal_templates(name)").order("category"),
    ]);
    setTemplates(t||[]);
    setUsers(u||[]);
    setAllFoods(f||[]);
    if(t&&t.length>0&&!selTemplateId)setSelTemplateId(t[0].id);
  }

  function showToast(m){setToast(m);setTimeout(()=>setToast(null),2000);}

  async function assignTemplate(userId,tmplId){
    await getSupabase().from("profiles").update({active_template_id:tmplId}).eq("id",userId);
    showToast("Template assigned ✓");await loadAll();
    if(detail?.type==="user"){const{data:u}=await getSupabase().from("profiles").select("*").eq("id",userId).single();setDetail({type:"user",data:u});}
  }

  async function addFood(){
    if(!addFoodForm.name||!addFoodForm.calories||!addFoodForm.template_id)return;
    setSaving(true);
    const{error}=await getSupabase().from("template_food_items").insert({
      template_id:addFoodForm.template_id,name:addFoodForm.name,calories:+addFoodForm.calories,
      protein:+addFoodForm.protein||0,carbs:+addFoodForm.carbs||0,fat:+addFoodForm.fat||0,
      category:addFoodForm.category,meal_slots:addFoodForm.meal_slots,
    });
    setSaving(false);
    if(!error){showToast("Food added ✓");setAddFoodForm(f=>({...f,name:"",calories:"",protein:"",carbs:"",fat:""}));await loadAll();}
    else showToast("Error: "+error.message);
  }

  async function saveFood(f){
    setSaving(true);
    await getSupabase().from("template_food_items").update({name:f.name,calories:+f.calories,protein:+f.protein,carbs:+f.carbs,fat:+f.fat,category:f.category,meal_slots:f.meal_slots}).eq("id",f.id);
    setSaving(false);showToast("Saved ✓");await loadAll();setDetail(null);
  }

  async function deleteFood(row){
    if(!confirm(`Remove "${row.name}"?`))return;
    await getSupabase().from("template_food_items").delete().eq("id",row.id);
    showToast("Removed");await loadAll();if(detail?.type==="food")setDetail(null);
  }

  async function approveUser(id){await getSupabase().from("profiles").update({status:"approved"}).eq("id",id);showToast("User approved ✓");await loadAll();}
  async function blockUser(id){await getSupabase().from("profiles").update({status:"blocked"}).eq("id",id);showToast("User blocked");await loadAll();}

  function toggleSlot(s,form,setForm){
    setForm(f=>({...f,meal_slots:f.meal_slots?.includes(s)?f.meal_slots.filter(x=>x!==s):[...(f.meal_slots||[]),s]}));
  }

  // ── Template CRUD ────────────────────────────────────────────
  async function loadTmplFoods(tmplId){
    setTmplFoodsLoading(true);
    const{data}=await getSupabase().from("template_food_items").select("*").eq("template_id",tmplId).order("category").order("name");
    setTmplFoods(data||[]);
    setTmplFoodsLoading(false);
  }

  async function saveTmpl(){
    if(!tmplForm.name.trim()){setTmplErr("Template name is required");return;}
    setTmplSaving(true);setTmplErr("");
    const payload={name:tmplForm.name.trim(),conditions:tmplForm.conditions};
    let error;
    if(tmplView==="edit"&&activeTmpl){
      ({error}=await getSupabase().from("meal_templates").update(payload).eq("id",activeTmpl.id));
    } else {
      ({error}=await getSupabase().from("meal_templates").insert(payload));
    }
    setTmplSaving(false);
    if(error){setTmplErr(error.message);return;}
    showToast(tmplView==="edit"?"Template updated ✓":"Template created ✓");
    setTmplForm({name:"",conditions:[]});setTmplView("list");await loadAll();
  }

  async function deleteTmpl(t){
    if(!confirm(`Delete "${t.name}" and all ${allFoods.filter(f=>f.template_id===t.id).length} food items? Cannot be undone.`))return;
    await getSupabase().from("template_food_items").delete().eq("template_id",t.id);
    await getSupabase().from("meal_templates").delete().eq("id",t.id);
    showToast("Template deleted");await loadAll();
  }

  async function saveFoodItem(){
    if(!fForm.name.trim()){setFErr("Food name is required");return;}
    if(!fForm.calories||isNaN(fForm.calories)){setFErr("Valid calories required");return;}
    setFSaving(true);setFErr("");
    const payload={template_id:activeTmpl.id,name:fForm.name.trim(),calories:parseFloat(fForm.calories)||0,protein:parseFloat(fForm.protein)||0,carbs:parseFloat(fForm.carbs)||0,fat:parseFloat(fForm.fat)||0,category:fForm.category||"Protein"};
    let error;
    if(editFoodItem){({error}=await getSupabase().from("template_food_items").update(payload).eq("id",editFoodItem.id));}
    else{({error}=await getSupabase().from("template_food_items").insert(payload));}
    setFSaving(false);
    if(error){setFErr(error.message);return;}
    showToast(editFoodItem?"Food updated ✓":"Food added ✓");
    setFForm({name:"",calories:"",protein:"",carbs:"",fat:"",category:"Protein"});setShowFoodForm(false);setEditFoodItem(null);
    await loadTmplFoods(activeTmpl.id);await loadAll();
  }

  async function deleteFoodItem(food){
    if(!confirm(`Remove "${food.name}"?`))return;
    await getSupabase().from("template_food_items").delete().eq("id",food.id);
    showToast("Food removed");await loadTmplFoods(activeTmpl.id);await loadAll();
  }

  // ── Render cells ─────────────────────────────────────────────
  function renderUserCell(row,key,raw){
    const tmpl=templates.find(t=>t.id===row.active_template_id);
    switch(key){
      case"full_name":return raw?row.full_name:<b>{row.full_name||"—"}</b>;
      case"email":return row.email||"—";
      case"status":if(raw)return row.status;
        return<span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600,background:row.status==="approved"?GL:row.status==="pending"?AL:RL,color:row.status==="approved"?G:row.status==="pending"?A:R}}>{row.status}</span>;
      case"template":return raw?tmpl?.name||"":<span style={{fontSize:11,color:tmpl?P:TXT3}}>{tmpl?.name||"Not assigned"}</span>;
      case"conditions":if(raw)return Object.keys(row.conditions||{}).filter(k=>k!=="none").join(", ");
        return<span style={{fontSize:11,color:TXT2}}>{Object.keys(row.conditions||{}).filter(k=>k!=="none").join(", ")||"—"}</span>;
      case"weight_current":return row.weight_current?`${row.weight_current}kg`:"—";
      case"weight_target":return row.weight_target?`${row.weight_target}kg`:"—";
      case"diet_type":return row.diet_type||"—";
      case"created_at":return row.created_at?new Date(row.created_at).toLocaleDateString("en-IN"):"—";
      default:return row[key]||"—";
    }
  }

  function renderFoodCell(row,key,raw){
    switch(key){
      case"name":return raw?row.name:<b style={{fontSize:12}}>{row.name}</b>;
      case"category":if(raw)return row.category||"";
        return<span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600,background:PL,color:P}}>{row.category||"—"}</span>;
      case"calories":return raw?row.calories:<b style={{color:"#7F77DD"}}>{row.calories}</b>;
      case"protein":return raw?row.protein:<span style={{color:G,fontWeight:600}}>{row.protein}g</span>;
      case"carbs":return raw?row.carbs:<span style={{color:A,fontWeight:600}}>{row.carbs}g</span>;
      case"fat":return`${row.fat||0}g`;
      case"meal_slots":if(raw)return(row.meal_slots||[]).join(", ");
        return<span style={{fontSize:11,color:TXT2}}>{(row.meal_slots||[]).join(" · ")||"—"}</span>;
      case"template":return raw?(row.meal_templates?.name||""):<span style={{fontSize:11,color:TXT2}}>{row.meal_templates?.name||"—"}</span>;
      default:return row[key]||"—";
    }
  }

  // ── Detail panels ─────────────────────────────────────────────
  function UserDetail({u,onClose}){
    const tmpl=templates.find(t=>t.id===u.active_template_id);
    const conds=Object.keys(u.conditions||{}).filter(k=>k!=="none");
    const tmplUsers=u.active_template_id?users.filter(x=>x.active_template_id===u.active_template_id&&x.id!==u.id):[];
    const tmplFoodsForUser=u.active_template_id?allFoods.filter(f=>f.template_id===u.active_template_id):[];
    return(
      <div>
        <button onClick={onClose} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:TXT2,cursor:"pointer",border:"none",background:"none",fontFamily:"inherit",marginBottom:16,padding:0}}>← Back to users</button>
        <div style={{background:CARD,borderRadius:13,border:`1px solid ${BORDER}`,padding:16,marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
            <div style={{width:48,height:48,borderRadius:12,background:PL,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:P,fontSize:20,flexShrink:0}}>{u.full_name?.[0]||"?"}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:700}}>{u.full_name}</div>
              <div style={{fontSize:12,color:TXT2}}>{u.email}</div>
              {conds.length>0&&<div style={{fontSize:11,color:TXT3,marginTop:2}}>{conds.join(" · ")}</div>}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {u.status==="pending"&&<button onClick={()=>approveUser(u.id)} style={{padding:"6px 14px",background:P,color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>✓ Approve</button>}
              {u.status==="approved"&&<button onClick={()=>blockUser(u.id)} style={{padding:"6px 14px",background:CARD,color:R,border:`1px solid ${RL}`,borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Block</button>}
              {u.status==="blocked"&&<button onClick={()=>approveUser(u.id)} style={{padding:"6px 14px",background:GL,color:G,border:`1px solid ${G}`,borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Restore</button>}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,marginBottom:16}}>
            {[{l:"Status",v:u.status},{l:"Weight",v:u.weight_current?`${u.weight_current}kg`:"—"},{l:"Target",v:u.weight_target?`${u.weight_target}kg`:"—"},{l:"Diet",v:u.diet_type||"—"},{l:"Activity",v:u.activity_level||"—"},{l:"Meals/day",v:u.meals_per_day||"—"}].map((s,i)=>(
              <div key={i} style={{background:BG,borderRadius:8,padding:"8px 10px"}}><div style={{fontSize:10,color:TXT2}}>{s.l}</div><div style={{fontSize:13,fontWeight:600}}>{s.v}</div></div>
            ))}
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:TXT2,textTransform:"uppercase",letterSpacing:".04em",marginBottom:6}}>Assign meal template</div>
            <select value={u.active_template_id||""} onChange={e=>assignTemplate(u.id,e.target.value)}
              style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${BORDER}`,borderRadius:9,fontSize:13,color:TXT,outline:"none",background:CARD,cursor:"pointer",fontFamily:"inherit"}}>
              <option value="">— Select template —</option>
              {templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {tmpl&&<div style={{background:GL,border:`1px solid ${G}`,borderRadius:9,padding:"10px 13px",fontSize:12,color:G,marginBottom:12}}>
            ✓ On <b>{tmpl.name}</b> · {tmplFoodsForUser.length} food items · {tmplUsers.length} other user{tmplUsers.length!==1?"s":""} on this template
          </div>}
        </div>
        {tmplFoodsForUser.length>0&&(
          <div style={{background:CARD,borderRadius:13,border:`1px solid ${BORDER}`,padding:14}}>
            <div style={{fontSize:11,fontWeight:700,color:TXT2,textTransform:"uppercase",letterSpacing:".04em",marginBottom:10}}>Food items in {tmpl?.name} ({tmplFoodsForUser.length})</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{tmplFoodsForUser.map(f=><span key={f.id} style={{padding:"3px 10px",borderRadius:20,background:BG,border:`1px solid ${BORDER}`,fontSize:11,color:TXT2}}>{f.name}</span>)}</div>
          </div>
        )}
      </div>
    );
  }

  function FoodDetail({f,onClose}){
    const [form,setForm]=useState({...f});
    const tmpl=templates.find(t=>t.id===f.template_id);
    const tmplUsers=users.filter(u=>u.active_template_id===f.template_id);
    return(
      <div>
        <button onClick={onClose} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:TXT2,cursor:"pointer",border:"none",background:"none",fontFamily:"inherit",marginBottom:16,padding:0}}>← Back to food items</button>
        <div style={{background:CARD,borderRadius:13,border:`1px solid ${BORDER}`,padding:16,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:8}}>
            <div><div style={{fontSize:16,fontWeight:700}}>{f.name}</div><div style={{fontSize:12,color:TXT2,marginTop:2}}>In: {tmpl?.name||"Unknown"} · {tmplUsers.length} user{tmplUsers.length!==1?"s":""} on this template</div></div>
            <button onClick={()=>deleteFood(f)} style={{padding:"6px 14px",background:CARD,color:R,border:`1px solid ${RL}`,borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Remove item</button>
          </div>
          {tmplUsers.length>0&&<div style={{background:PL,border:`1px solid ${P}`,borderRadius:9,padding:"9px 13px",fontSize:12,color:P,marginBottom:14}}>Affects: {tmplUsers.map(u=>u.full_name).join(", ")}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr",gap:10}}>
            <div>
              <div style={{fontSize:11,color:TXT2,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em",marginBottom:6}}>Food name</div>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${BORDER}`,borderRadius:9,fontSize:13,color:TXT,outline:"none",fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor=BORDER}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {[["calories","Calories","#7F77DD"],["protein","Protein g",G],["carbs","Carbs g",A],["fat","Fat g","#D85A30"]].map(([k,l,c])=>(
                <div key={k}><div style={{fontSize:10,color:TXT2,marginBottom:4}}>{l}</div>
                  <input type="number" value={form[k]||""} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
                    style={{width:"100%",padding:"8px",border:`1.5px solid ${BORDER}`,borderRadius:8,fontSize:13,color:c,fontWeight:600,outline:"none",textAlign:"center",fontFamily:"inherit"}}
                    onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor=BORDER}/></div>
              ))}
            </div>
            <div><div style={{fontSize:11,color:TXT2,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em",marginBottom:6}}>Category</div>
              <select value={form.category||""} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${BORDER}`,borderRadius:9,fontSize:13,color:TXT,outline:"none",background:CARD,fontFamily:"inherit"}}>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select></div>
            <div><div style={{fontSize:11,color:TXT2,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em",marginBottom:6}}>Meal slots</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {MEAL_SLOTS.map(s=>(
                  <button key={s} onClick={()=>toggleSlot(s,form,setForm)}
                    style={{padding:"4px 10px",borderRadius:20,border:`1px solid ${form.meal_slots?.includes(s)?P:BORDER}`,fontSize:11,cursor:"pointer",background:form.meal_slots?.includes(s)?PL:CARD,color:form.meal_slots?.includes(s)?P:TXT2,fontFamily:"inherit",fontWeight:form.meal_slots?.includes(s)?600:400}}>
                    {s}
                  </button>
                ))}
              </div></div>
            <div><div style={{fontSize:11,color:TXT2,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em",marginBottom:6}}>Move to template</div>
              <select value={form.template_id||""} onChange={e=>setForm(f=>({...f,template_id:e.target.value}))}
                style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${BORDER}`,borderRadius:9,fontSize:13,color:TXT,outline:"none",background:CARD,fontFamily:"inherit"}}>
                {templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </select></div>
          </div>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button disabled={saving} onClick={()=>saveFood(form)} style={{padding:"10px 20px",background:P,color:"#fff",border:"none",borderRadius:9,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving?.6:1}}>{saving?"Saving…":"Save changes"}</button>
            <button onClick={onClose} style={{padding:"10px 16px",background:CARD,color:TXT2,border:`1px solid ${BORDER}`,borderRadius:9,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Template management sub-views ────────────────────────────
  function TemplatesView(){
    // Stats per template
    const tmplStats=templates.map(t=>({
      ...t,
      foodCount:allFoods.filter(f=>f.template_id===t.id).length,
      userCount:users.filter(u=>u.active_template_id===t.id).length,
    }));

    // Filter foods for selected template in foods sub-view
    const filteredTmplFoods=tmplFoods.filter(f=>
      !tmplSearch||f.name.toLowerCase().includes(tmplSearch.toLowerCase())||f.category?.toLowerCase().includes(tmplSearch.toLowerCase())
    );
    const FOOD_CATS=[...new Set(CATEGORIES)];
    const groupedTmplFoods=FOOD_CATS.reduce((acc,cat)=>{
      const items=filteredTmplFoods.filter(f=>(f.category||"Custom")===cat);
      if(items.length) acc.push({cat,items});
      return acc;
    },[]);
    const knownCats=new Set(FOOD_CATS);
    const otherCats=[...new Set(filteredTmplFoods.map(f=>f.category||"Custom").filter(c=>!knownCats.has(c)))];
    otherCats.forEach(cat=>{
      const items=filteredTmplFoods.filter(f=>(f.category||"Custom")===cat);
      if(items.length) groupedTmplFoods.push({cat,items});
    });

    // ── List all templates ──────────────────────────────────────
    if(tmplView==="list") return(
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontSize:15,fontWeight:700}}>Meal Templates</div>
            <div style={{fontSize:12,color:TXT2}}>Create diet plan templates and assign to users</div>
          </div>
          <button onClick={()=>{setTmplForm({name:"",conditions:[]});setTmplErr("");setTmplView("create");}}
            style={{padding:"9px 18px",background:P,color:"#fff",border:"none",borderRadius:9,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            ＋ New Template
          </button>
        </div>

        {tmplStats.length===0&&(
          <div style={{textAlign:"center",padding:"48px 20px",background:CARD,borderRadius:13,border:`1px solid ${BORDER}`}}>
            <div style={{fontSize:36,marginBottom:12}}>🥗</div>
            <div style={{fontWeight:600,fontSize:15,marginBottom:8}}>No templates yet</div>
            <div style={{fontSize:12,color:TXT2,marginBottom:20}}>Create your first template to assign to users</div>
            <button onClick={()=>{setTmplForm({name:"",conditions:[]});setTmplView("create");}} style={{padding:"9px 20px",background:P,color:"#fff",border:"none",borderRadius:9,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>＋ Create First Template</button>
          </div>
        )}

        {tmplStats.map(t=>(
          <div key={t.id} style={{background:CARD,borderRadius:12,border:`1.5px solid ${BORDER}`,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",cursor:"pointer",transition:"border-color .15s"}}
            onClick={()=>{setActiveTmpl(t);loadTmplFoods(t.id);setTmplSearch("");setShowFoodForm(false);setTmplView("foods");}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=P}
            onMouseLeave={e=>e.currentTarget.style.borderColor=BORDER}>
            <div style={{width:44,height:44,borderRadius:12,background:PL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🥗</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:700,color:TXT}}>{t.name}</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:5}}>
                {(t.conditions||[]).map(c=><span key={c} style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600,background:PL,color:P}}>{c}</span>)}
                {(!t.conditions||t.conditions.length===0)&&<span style={{fontSize:11,color:TXT3}}>No conditions tagged</span>}
              </div>
            </div>
            <div style={{display:"flex",gap:16,flexShrink:0}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:700,color:G}}>{t.foodCount}</div>
                <div style={{fontSize:10,color:TXT2}}>foods</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:700,color:P}}>{t.userCount}</div>
                <div style={{fontSize:10,color:TXT2}}>users</div>
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
              <button onClick={()=>{setActiveTmpl(t);setTmplForm({name:t.name,conditions:t.conditions||[]});setTmplErr("");setTmplView("edit");}}
                style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${BORDER}`,background:CARD,color:TXT2,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>
              <button onClick={()=>deleteTmpl(t)}
                style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${RL}`,background:CARD,color:R,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    );

    // ── Create / Edit template form ─────────────────────────────
    if(tmplView==="create"||tmplView==="edit") return(
      <div>
        <button onClick={()=>setTmplView("list")} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:TXT2,cursor:"pointer",border:"none",background:"none",fontFamily:"inherit",marginBottom:16,padding:0}}>← Back to templates</button>
        <div style={{background:CARD,borderRadius:13,border:`1px solid ${BORDER}`,padding:18}}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>{tmplView==="edit"?"Edit Template":"New Template"}</div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:700,color:TXT2,textTransform:"uppercase",letterSpacing:".04em",display:"block",marginBottom:5}}>Template Name *</label>
            <input value={tmplForm.name} onChange={e=>setTmplForm(f=>({...f,name:e.target.value}))}
              placeholder="e.g. Diabetic + High BP Plan"
              style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${BORDER}`,borderRadius:9,fontSize:13,color:TXT,outline:"none",fontFamily:"inherit"}}
              onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor=BORDER}/>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:700,color:TXT2,textTransform:"uppercase",letterSpacing:".04em",display:"block",marginBottom:8}}>Conditions / Tags</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {CONDITION_OPTIONS.map(c=>(
                <button key={c} onClick={()=>setTmplForm(f=>({...f,conditions:f.conditions.includes(c)?f.conditions.filter(x=>x!==c):[...f.conditions,c]}))}
                  style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${tmplForm.conditions.includes(c)?P:BORDER}`,fontSize:12,cursor:"pointer",background:tmplForm.conditions.includes(c)?PL:CARD,color:tmplForm.conditions.includes(c)?P:TXT2,fontFamily:"inherit",fontWeight:tmplForm.conditions.includes(c)?600:400,transition:"all .15s"}}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          {tmplErr&&<div style={{color:R,fontSize:12,padding:"6px 10px",background:"#fff5f5",borderRadius:8,marginBottom:12}}>{tmplErr}</div>}
          <div style={{display:"flex",gap:10}}>
            <button disabled={tmplSaving} onClick={saveTmpl}
              style={{padding:"10px 22px",background:P,color:"#fff",border:"none",borderRadius:9,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:tmplSaving?.6:1}}>
              {tmplSaving?"Saving…":tmplView==="edit"?"Save Changes":"Create Template"}
            </button>
            <button onClick={()=>setTmplView("list")} style={{padding:"10px 16px",background:CARD,color:TXT2,border:`1px solid ${BORDER}`,borderRadius:9,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          </div>
        </div>
      </div>
    );

    // ── Foods inside a template ─────────────────────────────────
    if(tmplView==="foods"&&activeTmpl) return(
      <div>
        <button onClick={()=>{setTmplView("list");setShowFoodForm(false);}} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:TXT2,cursor:"pointer",border:"none",background:"none",fontFamily:"inherit",marginBottom:14,padding:0}}>← All templates</button>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14,gap:10,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:16,fontWeight:700}}>{activeTmpl.name}</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:4}}>
              {(activeTmpl.conditions||[]).map(c=><span key={c} style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600,background:PL,color:P}}>{c}</span>)}
            </div>
          </div>
          <button onClick={()=>{setFForm({name:"",calories:"",protein:"",carbs:"",fat:"",category:"Protein"});setEditFoodItem(null);setFErr("");setShowFoodForm(true);}}
            style={{padding:"9px 18px",background:G,color:"#fff",border:"none",borderRadius:9,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
            ＋ Add Food
          </button>
        </div>

        {/* Stats row */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:8,marginBottom:14}}>
          {[{l:"Total foods",v:tmplFoods.length,c:P},{l:"Avg calories",v:tmplFoods.length?Math.round(tmplFoods.reduce((s,f)=>s+(f.calories||0),0)/tmplFoods.length):0,c:"#7F77DD"},{l:"Categories",v:[...new Set(tmplFoods.map(f=>f.category))].length,c:G},{l:"Users on plan",v:users.filter(u=>u.active_template_id===activeTmpl.id).length,c:A}].map((s,i)=>(
            <div key={i} style={{background:BG,borderRadius:10,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:18,fontWeight:700,color:s.c}}>{s.v}</div><div style={{fontSize:10,color:TXT2,marginTop:2}}>{s.l}</div></div>
          ))}
        </div>

        {/* Add/Edit food inline form */}
        {showFoodForm&&(
          <div style={{background:CARD,borderRadius:12,border:`1.5px solid ${editFoodItem?A:G}`,padding:16,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:13,color:editFoodItem?A:G}}>{editFoodItem?"Edit Food":"Add New Food"}</div>
              <button onClick={()=>{setShowFoodForm(false);setEditFoodItem(null);setFForm({name:"",calories:"",protein:"",carbs:"",fat:"",category:"Protein"});}}
                style={{width:26,height:26,borderRadius:"50%",border:`1px solid ${BORDER}`,background:"transparent",cursor:"pointer",fontSize:15,color:TXT2,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div><label style={{fontSize:10,color:TXT2,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:4}}>Food Name *</label>
                <input value={fForm.name} onChange={e=>setFForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Boiled Egg 1 whole"
                  style={{width:"100%",padding:"8px 11px",border:`1.5px solid ${BORDER}`,borderRadius:8,fontSize:13,color:TXT,outline:"none",fontFamily:"inherit"}}
                  onFocus={e=>e.target.style.borderColor=G} onBlur={e=>e.target.style.borderColor=BORDER}/></div>
              <div><label style={{fontSize:10,color:TXT2,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:4}}>Category</label>
                <select value={fForm.category} onChange={e=>setFForm(f=>({...f,category:e.target.value}))}
                  style={{width:"100%",padding:"8px 11px",border:`1.5px solid ${BORDER}`,borderRadius:8,fontSize:13,color:TXT,outline:"none",background:CARD,fontFamily:"inherit"}}>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:10}}>
              {[["Calories *","calories","#7F77DD"],["Protein g","protein",G],["Carbs g","carbs",A],["Fat g","fat","#D85A30"]].map(([l,k,c])=>(
                <div key={k}><label style={{fontSize:10,color:TXT2,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:4}}>{l}</label>
                  <input type="number" placeholder="0" value={fForm[k]} onChange={e=>setFForm(f=>({...f,[k]:e.target.value}))}
                    style={{width:"100%",padding:"8px",border:`1.5px solid ${BORDER}`,borderRadius:8,fontSize:13,color:c,fontWeight:600,outline:"none",textAlign:"center",fontFamily:"inherit"}}
                    onFocus={e=>e.target.style.borderColor=G} onBlur={e=>e.target.style.borderColor=BORDER}/></div>
              ))}
            </div>
            {fErr&&<div style={{color:R,fontSize:12,padding:"5px 9px",background:"#fff5f5",borderRadius:7,marginBottom:8}}>{fErr}</div>}
            <div style={{display:"flex",gap:8}}>
              <button disabled={fSaving} onClick={saveFoodItem}
                style={{padding:"8px 18px",background:G,color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:fSaving?.6:1}}>
                {fSaving?"Saving…":editFoodItem?"Update":"Add Food"}
              </button>
              <button onClick={()=>{setShowFoodForm(false);setEditFoodItem(null);}} style={{padding:"8px 14px",border:`1px solid ${BORDER}`,borderRadius:8,background:CARD,color:TXT2,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{display:"flex",alignItems:"center",gap:8,background:CARD,borderRadius:10,padding:"8px 12px",border:`1px solid ${BORDER}`,marginBottom:12}}>
          <span style={{color:TXT3}}>🔍</span>
          <input placeholder="Search foods or category…" value={tmplSearch} onChange={e=>setTmplSearch(e.target.value)}
            style={{flex:1,border:"none",background:"transparent",fontSize:12,color:TXT,outline:"none",fontFamily:"inherit"}}/>
          {tmplSearch&&<button onClick={()=>setTmplSearch("")} style={{border:"none",background:"transparent",color:TXT3,cursor:"pointer",fontSize:14}}>×</button>}
          <span style={{fontSize:11,color:TXT3,flexShrink:0}}>{filteredTmplFoods.length} items</span>
        </div>

        {tmplFoodsLoading&&<div style={{textAlign:"center",padding:"30px",color:TXT2}}>Loading…</div>}

        {!tmplFoodsLoading&&tmplFoods.length===0&&(
          <div style={{textAlign:"center",padding:"40px",background:CARD,borderRadius:12,border:`1px solid ${BORDER}`}}>
            <div style={{fontSize:30,marginBottom:10}}>🍽️</div>
            <div style={{fontWeight:600,marginBottom:6}}>No food items yet</div>
            <div style={{fontSize:12,color:TXT2,marginBottom:14}}>Add food items to this template</div>
            <button onClick={()=>{setFForm({name:"",calories:"",protein:"",carbs:"",fat:"",category:"Protein"});setFErr("");setShowFoodForm(true);}}
              style={{padding:"9px 18px",background:G,color:"#fff",border:"none",borderRadius:9,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>＋ Add First Food</button>
          </div>
        )}

        {!tmplFoodsLoading&&groupedTmplFoods.map(({cat,items})=>(
          <div key={cat} style={{marginBottom:14}}>
            <div style={{fontSize:9,fontWeight:800,color:TXT2,textTransform:"uppercase",letterSpacing:".07em",marginBottom:7,display:"flex",alignItems:"center",gap:6}}>
              {cat}<span style={{flex:1,height:1,background:BORDER}}/><span style={{fontWeight:400}}>{items.length}</span>
            </div>
            {items.map(food=>(
              <div key={food.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:9,border:`1px solid ${BORDER}`,marginBottom:5,background:CARD,transition:"border-color .15s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=P} onMouseLeave={e=>e.currentTarget.style.borderColor=BORDER}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:TXT}}>{food.name}{food.added_by_user&&<span style={{fontSize:9,color:TXT3,marginLeft:4}}>· user-added</span>}</div>
                  <div style={{display:"flex",gap:8,marginTop:2,fontSize:11}}>
                    <span style={{color:"#7F77DD",fontWeight:700}}>{food.calories||0} kcal</span>
                    <span style={{color:G}}>{food.protein||0}g P</span>
                    <span style={{color:A}}>{food.carbs||0}g C</span>
                    <span style={{color:"#D85A30"}}>{food.fat||0}g F</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:5,flexShrink:0}}>
                  <button onClick={()=>{setEditFoodItem(food);setFForm({name:food.name,calories:food.calories||"",protein:food.protein||"",carbs:food.carbs||"",fat:food.fat||"",category:food.category||"Protein"});setFErr("");setShowFoodForm(true);}}
                    style={{padding:"5px 10px",border:`1px solid ${BORDER}`,borderRadius:7,background:CARD,color:TXT2,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>
                  <button onClick={()=>deleteFoodItem(food)}
                    style={{padding:"5px 10px",border:`1px solid ${RL}`,borderRadius:7,background:CARD,color:R,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );

    return null;
  }

  if(!me)return(
    <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:36,height:36,border:`3px solid ${BORDER}`,borderTopColor:P,borderRadius:"50%",animation:"s .7s linear infinite"}}/>
      <style>{`@keyframes s{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const tmplFoodsFiltered=selTemplateId?allFoods.filter(f=>f.template_id===selTemplateId):allFoods;

  return(
    <>
      <Head><title>Food plans — MyHealth</title></Head>
      <style>{`
        .tabs{display:flex;gap:6px;margin-bottom:18px;flex-wrap:wrap}
        .tab{padding:8px 18px;border-radius:20px;border:1px solid ${BORDER};font-size:12px;font-weight:600;cursor:pointer;background:transparent;color:${TXT2};font-family:inherit;transition:all .15s}
        .tab.on{border-color:${P};background:${PL};color:${P}}
        .inp{width:100%;padding:9px 12px;border:1.5px solid ${BORDER};border-radius:9px;font-size:13px;color:${TXT};outline:none;background:${CARD};font-family:inherit}
        .inp:focus{border-color:${P}}
        .igrid4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
        .sbtn{padding:4px 10px;border-radius:20px;border:1px solid ${BORDER};font-size:11px;cursor:pointer;background:transparent;color:${TXT2};font-family:inherit}
        .sbtn.on{border-color:${P};background:${PL};color:${P};font-weight:600}
        .label{font-size:11px;font-weight:700;color:${TXT2};text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:5px;margin-top:12px}
        .card{background:${CARD};border-radius:13px;border:1px solid ${BORDER};padding:14px;margin-bottom:12px}
        .tmpl-btns{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
        .tbtn{padding:7px 14px;border-radius:20px;border:1px solid ${BORDER};font-size:12px;cursor:pointer;background:transparent;color:${TXT2};font-family:inherit}
        .tbtn.on{border-color:${P};background:${PL};color:${P};font-weight:600}
        @media(max-width:600px){.igrid4{grid-template-columns:1fr 1fr}}
      `}</style>

      {toast&&<div className="ht-toast">{toast}</div>}

      <Layout title="Food plans" profile={me}>
        <div style={{fontSize:20,fontWeight:700,marginBottom:4}}>Food plans</div>
        <div style={{fontSize:12,color:TXT2,marginBottom:20}}>Configurable data tables — customise columns, drag to reorder, click any row to open detail</div>

        {/* ── TABS ── */}
        <div className="tabs">
          {[["users",`👥 Users (${users.length})`],["foods",`🥗 Food items (${allFoods.length})`],["templates",`📋 Templates (${templates.length})`],["add","➕ Add food"]].map(([id,lbl])=>(
            <button key={id} className={`tab${tab===id?" on":""}`} onClick={()=>{setTab(id);setDetail(null);if(id==="templates"){setTmplView("list");}}}>
              {lbl}
            </button>
          ))}
        </div>

        {/* ── USERS TAB ── */}
        {tab==="users"&&(detail?.type==="user"
          ?{UserDetail({u:detail.data, onClose:()=>setDetail(null)})}
          :<DataGrid gridKey="admin_users" colsDef={USER_COLS_DEFAULT} rows={users} userId={me.id}
              onRowClick={row=>setDetail({type:"user",data:row})} renderCell={renderUserCell}
              extraActions={<span style={{fontSize:11,color:TXT2}}>Click row to open · Sort by clicking column header</span>}/>
        )}

        {/* ── FOODS TAB ── */}
        {tab==="foods"&&(detail?.type==="food"
          ?{FoodDetail({f:detail.data, onClose:()=>setDetail(null)})}
          :<>
            <div className="tmpl-btns">
              <button className={`tbtn${!selTemplateId?" on":""}`} onClick={()=>setSelTemplateId("")}>All templates</button>
              {templates.map(t=>(
                <button key={t.id} className={`tbtn${selTemplateId===t.id?" on":""}`} onClick={()=>setSelTemplateId(t.id)}>
                  {t.name} ({allFoods.filter(f=>f.template_id===t.id).length})
                </button>
              ))}
            </div>
            <DataGrid gridKey="admin_foods" colsDef={FOOD_COLS_DEFAULT} rows={tmplFoodsFiltered} userId={me.id}
              onRowClick={row=>setDetail({type:"food",data:row})} onDeleteRow={deleteFood} renderCell={renderFoodCell}
              extraActions={
                <button onClick={()=>setTab("add")} style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${P}`,background:PL,color:P,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Add food</button>
              }/>
          </>
        )}

        {/* ── TEMPLATES TAB ── */}
        {tab==="templates"&&TemplatesView()}

        {/* ── ADD FOOD TAB ── */}
        {tab==="add"&&(
          <div className="card">
            <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>Add new food item</div>
            <label className="label" style={{marginTop:0}}>Template</label>
            <select className="inp" value={addFoodForm.template_id} onChange={e=>setAddFoodForm(f=>({...f,template_id:e.target.value}))}>
              <option value="">— Select template —</option>
              {templates.map(t=><option key={t.id} value={t.id}>{t.name} ({allFoods.filter(f=>f.template_id===t.id).length} items)</option>)}
            </select>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:0}}>
              <div><label className="label">Food name</label>
                <input className="inp" placeholder="e.g. Grilled chicken 150g" value={addFoodForm.name} onChange={e=>setAddFoodForm(f=>({...f,name:e.target.value}))}/></div>
              <div><label className="label">Category</label>
                <select className="inp" value={addFoodForm.category} onChange={e=>setAddFoodForm(f=>({...f,category:e.target.value}))}>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select></div>
            </div>
            <label className="label">Nutrition per serving</label>
            <div className="igrid4">
              {[["calories","Calories (kcal)"],["protein","Protein (g)"],["carbs","Carbs (g)"],["fat","Fat (g)"]].map(([k,l])=>(
                <div key={k}><div style={{fontSize:10,color:TXT2,marginBottom:3}}>{l}</div>
                  <input className="inp" type="number" placeholder="0" value={addFoodForm[k]} onChange={e=>setAddFoodForm(f=>({...f,[k]:e.target.value}))}/></div>
              ))}
            </div>
            <label className="label">Meal slots</label>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:16}}>
              {MEAL_SLOTS.map(s=>(
                <button key={s} className={`sbtn${addFoodForm.meal_slots.includes(s)?" on":""}`} onClick={()=>toggleSlot(s,addFoodForm,setAddFoodForm)}>{s}</button>
              ))}
            </div>
            {addFoodForm.template_id&&(
              <div style={{background:PL,border:`1px solid ${P}`,borderRadius:9,padding:"9px 13px",marginBottom:14,fontSize:12,color:P}}>
                Adding to: <b>{templates.find(t=>t.id===addFoodForm.template_id)?.name}</b>{" · "}Affects <b>{users.filter(u=>u.active_template_id===addFoodForm.template_id).length}</b> user(s)
              </div>
            )}
            <button onClick={addFood} disabled={saving||!addFoodForm.name||!addFoodForm.calories||!addFoodForm.template_id}
              style={{padding:"11px 24px",background:P,color:"#fff",border:"none",borderRadius:9,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving?.6:1}}>
              {saving?"Adding…":"+ Add food item"}
            </button>
          </div>
        )}
      </Layout>
    </>
  );
}
