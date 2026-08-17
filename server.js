// Servidor sem dependências externas: Node.js 22+ (inclui node:sqlite).
const http=require("node:http"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {DatabaseSync}=require("node:sqlite");
const PORT=Number(process.env.PORT||3000),ROOT=__dirname,OWNER_EMAIL="lf1105111@gmail.com";
const sql=new DatabaseSync(path.join(ROOT,"rng-provas.db"));
sql.exec(`CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'membro', level INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL, last_login TEXT, login_count INTEGER NOT NULL DEFAULT 0
)`);
const json=(res,status,value)=>{res.writeHead(status,{"Content-Type":"application/json; charset=utf-8"});res.end(JSON.stringify(value))};
const hash=pass=>crypto.scryptSync(pass,"rng-provas-password-v1",64).toString("hex");
const clean=row=>row&&({id:row.id,name:row.name,email:row.email,role:row.role,level:row.level,createdAt:row.created_at,lastLogin:row.last_login,loginCount:row.login_count});
const role=r=>["membro","treinador","dono"].includes(String(r).toLowerCase())?String(r).toLowerCase():"membro";
const userById=id=>sql.prepare("SELECT * FROM users WHERE id=?").get(id);
const userByEmail=email=>sql.prepare("SELECT * FROM users WHERE lower(email)=lower(?)").get(email);
function body(req){return new Promise((resolve,reject)=>{let text="";req.on("data",c=>{text+=c;if(text.length>1e6)req.destroy()});req.on("end",()=>{try{resolve(text?JSON.parse(text):{})}catch{reject()}})})}
function saveUser({id=crypto.randomUUID(),name,email,pass,level=1,role:requested="membro",createdAt=new Date().toISOString(),lastLogin=null,loginCount=0}){
 const owner=String(email).toLowerCase()===OWNER_EMAIL,existing=userByEmail(email),userRole=owner?"dono":role(requested);
 if(existing)return clean(existing);
 sql.prepare("INSERT INTO users (id,name,email,password_hash,role,level,created_at,last_login,login_count) VALUES (?,?,?,?,?,?,?,?,?)").run(id,name,email.toLowerCase(),hash(pass),userRole,owner?100:Number(level)||1,createdAt,lastLogin,Number(loginCount)||0);
 return clean(userById(id));
}
async function api(req,res,url){
 let data;try{data=await body(req)}catch{return json(res,400,{error:"Dados inválidos."})}
 if(req.method==="POST"&&url.pathname==="/api/auth/register"){
   const name=String(data.name||"").trim(),email=String(data.email||"").trim().toLowerCase(),pass=String(data.pass||"");
   if(!name||!/^\S+@\S+\.\S+$/.test(email)||pass.length<4)return json(res,400,{error:"Preencha nome, e-mail e senha válida."});
   if(userByEmail(email))return json(res,409,{error:"E-mail já cadastrado."});
   return json(res,201,{user:saveUser({name,email,pass,lastLogin:new Date().toISOString(),loginCount:1})});
 }
 if(req.method==="POST"&&url.pathname==="/api/auth/login"){
   const login=String(data.login||"").trim(),pass=String(data.pass||"");
   const row=sql.prepare("SELECT * FROM users WHERE lower(email)=lower(?) OR lower(name)=lower(?) LIMIT 1").get(login,login);
   if(!row||!crypto.timingSafeEqual(Buffer.from(row.password_hash,"hex"),Buffer.from(hash(pass),"hex")))return json(res,401,{error:"Usuário/e-mail ou senha incorretos."});
   const now=new Date().toISOString();sql.prepare("UPDATE users SET last_login=?, login_count=login_count+1 WHERE id=?").run(now,row.id);
   return json(res,200,{user:clean(userById(row.id))});
 }
 if(req.method==="POST"&&url.pathname==="/api/users/import"){
   for(const u of Array.isArray(data.users)?data.users:[]){
     if(u&&u.name&&u.email&&u.pass&&!userByEmail(String(u.email).toLowerCase()))saveUser(u);
   }
   return json(res,200,{ok:true});
 }
 if(req.method==="GET"&&url.pathname==="/api/users"){
   const actor=userById(url.searchParams.get("actorId"));if(!actor||!["treinador","dono"].includes(actor.role))return json(res,403,{error:"Acesso restrito."});
   const rows=sql.prepare("SELECT * FROM users ORDER BY name COLLATE NOCASE").all().map(clean);return json(res,200,{users:rows});
 }
 const match=url.pathname.match(/^\/api\/users\/([^/]+)\/role$/);
 if(req.method==="PUT"&&match){
   const actor=userById(data.actorId),target=userById(match[1]),next=role(data.role);
   if(!actor||!target||!["treinador","dono"].includes(actor.role))return json(res,403,{error:"Acesso restrito."});
   if(String(target.email).toLowerCase()===OWNER_EMAIL)return json(res,403,{error:"O Dono Principal não pode ter o cargo alterado."});
   if(actor.role!=="dono"&&(next!=="treinador"||target.role==="dono"))return json(res,403,{error:"Treinadores só podem conceder Treinador e não alteram Donos."});
   sql.prepare("UPDATE users SET role=?, level=CASE WHEN ?='dono' THEN 100 ELSE level END WHERE id=?").run(next,next,target.id);
   return json(res,200,{user:clean(userById(target.id))});
 }
 return json(res,404,{error:"Rota não encontrada."});
}
const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8"};
http.createServer((req,res)=>{const url=new URL(req.url,`http://${req.headers.host}`);if(url.pathname.startsWith("/api/"))return api(req,res,url);const file=path.resolve(ROOT,url.pathname==="/"?"index.html":"."+url.pathname);if(!file.startsWith(ROOT)||!fs.existsSync(file))return res.writeHead(404).end("Não encontrado");res.writeHead(200,{"Content-Type":types[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res)}).listen(PORT,()=>console.log(`RNG disponível em http://localhost:${PORT}`));
