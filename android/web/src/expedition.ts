import{ores,versions,WorldSettings}from'./atlasCatalog';
export type Expedition=WorldSettings&{oreId:string;x:number;z:number;radius:number;minY:number;maxY:number};
export function validateExpedition(v:unknown):Expedition{
 if(!v||typeof v!=='object')throw Error('This is not an Ore Atlas expedition.');const a=v as Expedition;
 if(a.edition!=='java'&&a.edition!=='bedrock')throw Error('Unknown Minecraft edition.');
 if(!versions[a.edition].some(([n])=>n===a.version))throw Error('This game version is not supported by this app.');
 if(typeof a.seed!=='string'||! /^-?\d{1,20}$/.test(a.seed)||BigInt(a.seed)<-(1n<<63n)||BigInt(a.seed)>(1n<<63n)-1n)throw Error('Invalid world seed.');
 const ore=ores.find(o=>o.id===a.oreId);if(!ore||ore.dim!==a.dimension)throw Error('Choose an ore in the selected dimension.');
 for(const [k,min,max]of [['x',-29900000,29900000],['z',-29900000,29900000],['radius',16,128],['minY',-64,319],['maxY',-64,319]]as const)if(!Number.isInteger(a[k])||a[k]<min||a[k]>max)throw Error('Invalid search coordinates or range.');
 if(a.minY>a.maxY)throw Error('Invalid Y range.');
 return{seed:BigInt(a.seed).toString(),edition:a.edition,version:a.version,dimension:a.dimension,oreId:a.oreId,x:a.x,z:a.z,radius:a.radius,minY:a.minY,maxY:a.maxY};
}
export function encodeExpedition(value:Expedition){const e=validateExpedition(value);return 'oreatlas://expedition?v=1&data='+encodeURIComponent(JSON.stringify(e));}
export function decodeExpedition(s:string){if(s.length>4096)throw Error('That expedition link is too long.');let u:URL;try{u=new URL(s.trim())}catch{throw Error('Paste a complete Ore Atlas expedition link.')}if(u.protocol!=='oreatlas:'||u.hostname!=='expedition'||u.searchParams.get('v')!=='1')throw Error('This QR code is not a supported Ore Atlas expedition.');try{return validateExpedition(JSON.parse(u.searchParams.get('data')||''))}catch(e){throw Error(e instanceof SyntaxError?'The expedition link is incomplete.':(e as Error).message)}}
