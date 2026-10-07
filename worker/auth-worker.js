const ALLOWED_ORIGINS = new Set([
  "https://mostra-pedagogica-imperio.pages.dev"
]);

let schemaPromise=null;

function corsHeaders(request,contentType="application/json; charset=UTF-8"){
  const origin=request.headers.get("Origin")||"";
  const allowOrigin=ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://mostra-pedagogica-imperio.pages.dev";

  return {
    "Access-Control-Allow-Origin":allowOrigin,
    "Access-Control-Allow-Headers":"Content-Type, X-Filename",
    "Access-Control-Allow-Methods":"GET, POST, DELETE, OPTIONS",
    "Vary":"Origin",
    ...(contentType?{"Content-Type":contentType}:{})
  };
}

function json(request,data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:corsHeaders(request)
  });
}

async function ensureSchema(env){
  if(!schemaPromise){
    schemaPromise=env.DB.batch([
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          class_name TEXT NOT NULL,
          description TEXT,
          image_keys TEXT NOT NULL DEFAULT '[]',
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS reviews (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          visitor_id TEXT NOT NULL,
          stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
          suggestion TEXT,
          comment TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(project_id, visitor_id)
        )
      `),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_projects_active_created ON projects(active, created_at)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_reviews_project ON reviews(project_id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at)")
    ]).catch(error=>{
      schemaPromise=null;
      throw error;
    });
  }
  return schemaPromise;
}

function base64ToBytes(value){
  const binary=atob(value);
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
}

function bytesToBase64(bytes){
  let binary="";
  for(const byte of bytes) binary+=String.fromCharCode(byte);
  return btoa(binary);
}

async function hashPassword(password,saltB64){
  const key=await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits=await crypto.subtle.deriveBits({
    name:"PBKDF2",
    hash:"SHA-256",
    salt:base64ToBytes(saltB64),
    iterations:100000
  },key,256);

  return bytesToBase64(new Uint8Array(bits));
}

function safeEqual(a,b){
  if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length) return false;
  let diff=0;
  for(let i=0;i<a.length;i++) diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}

async function checkLogin(env,username,password){
  const user=await env.DB.prepare(
    "SELECT username, role, password_salt, password_hash FROM staff_users WHERE username=? AND active=1 LIMIT 1"
  ).bind(String(username).trim().toLowerCase()).first();

  if(!user) return null;

  const candidate=await hashPassword(String(password),user.password_salt);
  if(!safeEqual(candidate,user.password_hash)) return null;

  return {username:user.username,role:user.role};
}

function parseJsonArray(value){
  if(Array.isArray(value)) return value.filter(Boolean);
  try{
    const parsed=JSON.parse(value||"[]");
    return Array.isArray(parsed)?parsed.filter(Boolean):[];
  }catch{
    return [];
  }
}

function imageUrl(origin,key){
  return `${origin}/images/${String(key).split("/").map(encodeURIComponent).join("/")}`;
}

function projectPayload(row,origin){
  const imageKeys=parseJsonArray(row.image_keys);
  const imageUrls=imageKeys.map(key=>imageUrl(origin,key));

  return {
    id:row.id,
    title:row.title,
    class_name:row.class_name,
    description:row.description||"",
    image_keys:imageKeys,
    image_urls:imageUrls,
    image_url:imageUrls[0]||null,
    active:Boolean(row.active),
    created_at:row.created_at
  };
}

function safeFilename(raw){
  let decoded=raw||"image";
  try{decoded=decodeURIComponent(decoded)}catch{}
  const cleaned=decoded
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g,"-")
    .replace(/^-+|-+$/g,"")
    .slice(0,90);
  return cleaned||"image";
}

export default {
  async fetch(request,env){
    if(request.method==="OPTIONS"){
      return new Response(null,{
        status:204,
        headers:corsHeaders(request,null)
      });
    }

    const url=new URL(request.url);

    try{
      await ensureSchema(env);
    }catch(error){
      console.error("schema",error);
      return json(request,{ok:false,error:"Falha ao preparar banco de dados."},500);
    }

    if(url.pathname==="/health"&&request.method==="GET"){
      return json(request,{ok:true});
    }

    if((url.pathname==="/login"||url.pathname==="/auth/login")&&request.method==="POST"){
      const body=await request.json().catch(()=>null);

      if(!body?.username||!body?.password){
        return json(request,{ok:false,error:"Informe usuário e senha."},400);
      }

      const user=await checkLogin(env,body.username,body.password);

      if(!user){
        return json(request,{ok:false,error:"Usuário ou senha incorretos."},401);
      }

      return json(request,{ok:true,username:user.username,role:user.role});
    }

    if(url.pathname==="/projects"&&request.method==="GET"){
      const {results=[]}=await env.DB.prepare(`
        SELECT id,title,class_name,description,image_keys,active,created_at
        FROM projects
        WHERE active=1
        ORDER BY created_at DESC
      `).all();

      return json(request,results.map(row=>projectPayload(row,url.origin)));
    }

    if(url.pathname==="/projects"&&request.method==="POST"){
      const body=await request.json().catch(()=>null);
      const title=String(body?.title||"").trim();
      const className=String(body?.class_name||"").trim();
      const description=String(body?.description||"").trim();
      const imageKeys=Array.isArray(body?.image_keys)?body.image_keys.filter(Boolean).map(String):[];

      if(!title||!className){
        return json(request,{ok:false,error:"Nome do projeto e turma são obrigatórios."},400);
      }

      const id=crypto.randomUUID();

      await env.DB.prepare(`
        INSERT INTO projects (id,title,class_name,description,image_keys,active)
        VALUES (?,?,?,?,?,1)
      `).bind(id,title,className,description,JSON.stringify(imageKeys)).run();

      const row=await env.DB.prepare(`
        SELECT id,title,class_name,description,image_keys,active,created_at
        FROM projects
        WHERE id=?
      `).bind(id).first();

      return json(request,{ok:true,project:projectPayload(row,url.origin)},201);
    }

    const projectDeleteMatch=url.pathname.match(/^\/projects\/([^/]+)$/);
    if(projectDeleteMatch&&request.method==="DELETE"){
      const id=decodeURIComponent(projectDeleteMatch[1]);
      const row=await env.DB.prepare("SELECT image_keys FROM projects WHERE id=? LIMIT 1").bind(id).first();

      if(!row){
        return json(request,{ok:false,error:"Projeto não encontrado."},404);
      }

      const keys=parseJsonArray(row.image_keys);
      if(keys.length){
        await Promise.all(keys.map(key=>env.IMAGES.delete(key)));
      }

      await env.DB.batch([
        env.DB.prepare("DELETE FROM reviews WHERE project_id=?").bind(id),
        env.DB.prepare("DELETE FROM projects WHERE id=?").bind(id)
      ]);

      return json(request,{ok:true});
    }

    if(url.pathname==="/images"&&request.method==="POST"){
      if(!request.body){
        return json(request,{ok:false,error:"Imagem não enviada."},400);
      }

      const contentType=request.headers.get("Content-Type")||"application/octet-stream";
      if(!contentType.startsWith("image/")){
        return json(request,{ok:false,error:"Arquivo precisa ser uma imagem."},400);
      }

      const filename=safeFilename(request.headers.get("X-Filename")||"image");
      const key=`projects/${crypto.randomUUID()}-${filename}`;

      await env.IMAGES.put(key,request.body,{
        httpMetadata:{contentType}
      });

      return json(request,{
        ok:true,
        key,
        url:imageUrl(url.origin,key)
      },201);
    }

    if(url.pathname.startsWith("/images/")&&request.method==="GET"){
      const encodedKey=url.pathname.slice("/images/".length);
      const key=decodeURIComponent(encodedKey);
      const object=await env.IMAGES.get(key);

      if(!object){
        return new Response("Not found",{status:404});
      }

      const headers=new Headers(corsHeaders(request,null));
      object.writeHttpMetadata(headers);
      headers.set("etag",object.httpEtag);
      headers.set("Cache-Control","public, max-age=31536000, immutable");

      return new Response(object.body,{headers});
    }

    if(url.pathname==="/reviews"&&request.method==="POST"){
      const body=await request.json().catch(()=>null);
      const projectId=String(body?.project_id||"").trim();
      const visitorId=String(body?.visitor_id||"").trim();
      const stars=Number(body?.stars);
      const suggestion=body?.suggestion==null?null:String(body.suggestion).trim().slice(0,120);
      const comment=body?.comment==null?null:String(body.comment).trim().slice(0,240);

      if(!projectId||!visitorId||!Number.isInteger(stars)||stars<1||stars>5){
        return json(request,{ok:false,error:"Avaliação inválida."},400);
      }

      const project=await env.DB.prepare("SELECT id FROM projects WHERE id=? AND active=1 LIMIT 1")
        .bind(projectId).first();

      if(!project){
        return json(request,{ok:false,error:"Projeto não encontrado."},404);
      }

      const id=crypto.randomUUID();

      await env.DB.prepare(`
        INSERT INTO reviews (id,project_id,visitor_id,stars,suggestion,comment)
        VALUES (?,?,?,?,?,?)
        ON CONFLICT(project_id,visitor_id) DO UPDATE SET
          stars=excluded.stars,
          suggestion=excluded.suggestion,
          comment=excluded.comment,
          created_at=CURRENT_TIMESTAMP
      `).bind(id,projectId,visitorId,stars,suggestion,comment).run();

      return json(request,{ok:true},201);
    }

    if(url.pathname==="/reviews"&&request.method==="GET"){
      const {results=[]}=await env.DB.prepare(`
        SELECT
          r.id,
          r.project_id,
          r.visitor_id,
          r.stars,
          r.suggestion,
          r.comment,
          r.created_at,
          p.title AS project_title,
          p.class_name AS project_class
        FROM reviews r
        LEFT JOIN projects p ON p.id=r.project_id
        ORDER BY r.created_at DESC
      `).all();

      return json(request,results);
    }

    return json(request,{ok:false,error:"Not found"},404);
  }
};
