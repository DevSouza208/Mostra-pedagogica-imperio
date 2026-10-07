const corsHeaders = {
  "Access-Control-Allow-Origin": "https://mostra-pedagogica-imperio.pages.dev",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

const json = (data,status=200)=>new Response(JSON.stringify(data),{status,headers:corsHeaders});

function bytesToBase64(bytes){
  let binary="";
  for(const byte of bytes) binary+=String.fromCharCode(byte);
  return btoa(binary);
}
function base64ToBytes(value){
  const binary=atob(value);
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
async function hashPassword(password,saltB64){
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits(
    {name:"PBKDF2",hash:"SHA-256",salt:base64ToBytes(saltB64),iterations:100000},
    key,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
}
function safeEqual(a,b){
  if(a.length!==b.length) return false;
  let out=0;
  for(let i=0;i<a.length;i++) out|=a.charCodeAt(i)^b.charCodeAt(i);
  return out===0;
}
function token(){
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function getSession(request,env){
  const auth=request.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer ")) return null;
  const value=auth.slice(7);
  return env.DB.prepare(
    "SELECT s.token,s.expires_at,u.username,u.role FROM staff_sessions s JOIN staff_users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>datetime('now')"
  ).bind(value).first();
}

export default {
  async fetch(request,env){
    if(request.method==="OPTIONS") return new Response(null,{headers:corsHeaders});
    const url=new URL(request.url);

    if(url.pathname==="/auth/login" && request.method==="POST"){
      const {username,password}=await request.json().catch(()=>({}));
      if(!username||!password) return json({error:"Informe usuário e senha."},400);

      const user=await env.DB.prepare(
        "SELECT id,username,role,password_salt,password_hash FROM staff_users WHERE username=? AND active=1"
      ).bind(String(username).toLowerCase()).first();

      if(!user) return json({error:"Usuário ou senha incorretos."},401);
      const candidate=await hashPassword(String(password),user.password_salt);
      if(!safeEqual(candidate,user.password_hash)) return json({error:"Usuário ou senha incorretos."},401);

      const value=token();
      await env.DB.prepare(
        "INSERT INTO staff_sessions(token,user_id,expires_at) VALUES(?,?,datetime('now','+8 hours'))"
      ).bind(value,user.id).run();

      return json({token:value,username:user.username,role:user.role});
    }

    if(url.pathname==="/auth/me" && request.method==="GET"){
      const session=await getSession(request,env);
      if(!session) return json({error:"Sessão inválida."},401);
      return json({username:session.username,role:session.role});
    }

    if(url.pathname==="/auth/logout" && request.method==="POST"){
      const auth=request.headers.get("Authorization")||"";
      if(auth.startsWith("Bearer ")){
        await env.DB.prepare("DELETE FROM staff_sessions WHERE token=?").bind(auth.slice(7)).run();
      }
      return json({ok:true});
    }

    if(url.pathname==="/health") return json({ok:true});
    return json({error:"Not found"},404);
  }
};