const ALLOWED_ORIGINS = new Set([
  "https://mostra-pedagogica-imperio.pages.dev"
]);

function corsHeaders(request){
  const origin=request.headers.get("Origin")||"";
  const allowOrigin=ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://mostra-pedagogica-imperio.pages.dev";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=UTF-8"
  };
}

function json(request,data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:corsHeaders(request)
  });
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

  return {
    username:user.username,
    role:user.role
  };
}

export default {
  async fetch(request,env){
    if(request.method==="OPTIONS"){
      return new Response(null,{
        status:204,
        headers:corsHeaders(request)
      });
    }

    const url=new URL(request.url);

    if(url.pathname==="/health"&&request.method==="GET"){
      return json(request,{ok:true});
    }

    if((url.pathname==="/login"||url.pathname==="/auth/login")&&request.method==="POST"){
      const body=await request.json().catch(()=>null);

      if(!body?.username||!body?.password){
        return json(request,{
          ok:false,
          error:"Informe usuário e senha."
        },400);
      }

      const user=await checkLogin(env,body.username,body.password);

      if(!user){
        return json(request,{
          ok:false,
          error:"Usuário ou senha incorretos."
        },401);
      }

      return json(request,{
        ok:true,
        username:user.username,
        role:user.role
      });
    }

    return json(request,{ok:false,error:"Not found"},404);
  }
};
