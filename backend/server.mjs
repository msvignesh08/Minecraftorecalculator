import http from'node:http';import{randomBytes,createHash}from'node:crypto';import fs from'node:fs';import path from'node:path';import{fileURLToPath}from'node:url';
const token=()=>randomBytes(24).toString('base64url'),hash=s=>createHash('sha256').update(s).digest('hex');
export function createCrewServer({file=process.env.DATA_FILE||'data/rooms.json',maxRooms=1000}={}){
 let rooms={};if(fs.existsSync(file))rooms=JSON.parse(fs.readFileSync(file,'utf8'));const rates=new Map();const now=()=>Date.now();
 const save=()=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(rooms),{mode:0o600});fs.renameSync(file+'.tmp',file)};
 const fail=(status,message)=>{throw Object.assign(Error(message),{status})};
 const name=v=>{if(typeof v!=='string'||!v.trim()||v.trim().length>24)fail(400,'Enter a player name of 1–24 characters.');return v.trim()};
 const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
 const setup=v=>{const versions={java:['262','261','12111','121'],bedrock:['2645','2620','2630','12160']};const dims={diamond:0,iron:0,gold:0,redstone:0,lapis:0,copper:0,coal:0,emerald:0,ancient_debris:-1,nether_quartz:-1,nether_gold:-1};if(!v||!versions[v.edition]?.includes(v.version)||!Object.hasOwn(dims,v.oreId)||dims[v.oreId]!==v.dimension||typeof v.seed!=='string'||! /^-?\d{1,20}$/.test(v.seed)||BigInt(v.seed)<-(1n<<63n)||BigInt(v.seed)>(1n<<63n)-1n||!integer(v.x,-29900000,29900000)||!integer(v.z,-29900000,29900000)||!integer(v.radius,16,128)||!integer(v.minY,-64,319)||!integer(v.maxY,-64,319)||v.minY>v.maxY)fail(400,'Invalid expedition settings.');return Object.fromEntries(['seed','edition','version','dimension','oreId','x','z','radius','minY','maxY'].map(k=>[k,v[k]]))};
 const snapshot=r=>({id:r.id,setup:r.setup,players:Object.values(r.players).map(p=>({id:p.id,name:p.name,online:now()-p.lastSeen<30000})),pins:r.pins,updated:r.updated});
 const member=(r,n)=>{for(const[k,p]of Object.entries(r.players))if(now()-p.lastSeen>12*3600000)delete r.players[k];if(Object.keys(r.players).length>=24)fail(409,'Room is full (24 players).');const session=token(),p={id:token().slice(0,12),name:name(n),lastSeen:now()};r.players[hash(session)]=p;return{session,playerId:p.id}};
 const server=http.createServer(async(req,res)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','authorization, content-type');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}try{
 const url=new URL(req.url,'http://localhost');if(req.method==='GET'&&url.pathname==='/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({service:'ore-atlas-crew',version:1}));return;}
 const ip=req.socket.remoteAddress;const rate=rates.get(ip)||{start:now(),n:0};if(now()-rate.start>60000){rate.start=now();rate.n=0;}rate.n++;rates.set(ip,rate);if(rate.n>1200)fail(429,'Too many requests. Retry in a minute.');if(rates.size>5000)for(const[k,v]of rates)if(now()-v.start>60000)rates.delete(k);
 if(req.method!=='POST')fail(405,'Use POST.');let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>16384)fail(413,'Request too large.');}let b;try{b=JSON.parse(body||'{}')}catch{fail(400,'Invalid JSON.')}if(!b||typeof b!=='object'||Array.isArray(b))fail(400,'Invalid request.');
 for(const[id,r]of Object.entries(rooms))if(now()-r.updated>7*86400000)delete rooms[id];let result;
 if(url.pathname==='/v1/rooms'){
 if(Object.keys(rooms).length>=maxRooms)fail(503,'Server room capacity reached.');const s=setup(b.setup),n=name(b.name),invite=token(),id=token().slice(0,12);const r={id,inviteHash:hash(invite),setup:s,players:{},pins:[],updated:now()};const m=member(r,n);rooms[id]=r;result={...m,invite,...snapshot(r)};
 }else{const match=url.pathname.match(/^\/v1\/rooms\/([\w-]{12})\/(join|poll|pin|remove-pin|leave)$/);if(!match)fail(404,'Unknown endpoint.');const r=rooms[match[1]];if(!r)fail(404,'Room expired or not found.');const action=match[2];
 if(action==='join'){if(typeof b.invite!=='string'||hash(b.invite)!==r.inviteHash)fail(403,'Invalid invitation.');result={...member(r,b.name),...snapshot(r)};
 }else{const auth=req.headers.authorization||'';if(!auth.startsWith('Bearer ')||auth.length>200)fail(401,'Sign in to the room again.');const key=hash(auth.slice(7)),p=r.players[key];if(!p)fail(401,'Room session expired.');
 if(action==='pin'){if(r.pins.length>=500)fail(409,'Room pin limit reached.');if(!integer(b.x,-29900000,29900000)||!integer(b.z,-29900000,29900000)||!integer(b.y,-64,319)||typeof b.label!=='string'||b.label.length>64)fail(400,'Invalid pin.');r.pins.push({id:token().slice(0,12),x:b.x,y:b.y,z:b.z,label:b.label,owner:p.id,by:p.name});}
 if(action==='remove-pin'){const pin=r.pins.find(t=>t.id===b.id);if(!pin)fail(404,'Pin not found.');if(pin.owner!==p.id)fail(403,'Only the creator can delete this pin.');r.pins=r.pins.filter(t=>t.id!==b.id);}
 if(action==='leave')delete r.players[key];else p.lastSeen=now();result=snapshot(r);}
 r.updated=now();}
 save();res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
 }catch(e){res.writeHead(e.status||500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.status?e.message:'Server error.'}));}});server.requestTimeout=10000;server.headersTimeout=10000;return server;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){const server=createCrewServer();server.listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log('Ore Atlas Crew listening'));}
