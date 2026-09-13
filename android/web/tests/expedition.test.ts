import assert from'node:assert/strict';import QRCode from'qrcode';import jsQR from'jsqr';import{encodeExpedition,decodeExpedition,Expedition}from'../src/expedition';
const base:Expedition={seed:'-9223372036854775808',edition:'bedrock',version:'2645',dimension:0,oreId:'diamond',x:-29900000,z:29900000,radius:128,minY:-64,maxY:319};
for(const e of [base,{...base,seed:'9223372036854775807',edition:'java' as const,version:'262',dimension:-1,oreId:'ancient_debris'}]){
 const link=encodeExpedition(e);assert.deepEqual(decodeExpedition(link),e);const code=QRCode.create(link,{errorCorrectionLevel:'M'});const scale=5,side=(code.modules.size+8)*scale;const pixels=new Uint8ClampedArray(side*side*4);pixels.fill(255);for(let y=0;y<code.modules.size;y++)for(let x=0;x<code.modules.size;x++)if(code.modules.get(y,x))for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++){const i=(((y+4)*scale+yy)*side+(x+4)*scale+xx)*4;pixels[i]=16;pixels[i+1]=32;pixels[i+2]=24;}assert.equal(jsQR(pixels,side,side)?.data,link);console.log('QR image decoded:',e.edition,e.oreId);
}
for(const bad of ['javascript:alert(1)','https://example.com','oreatlas://expedition?v=2&data={}'])assert.throws(()=>decodeExpedition(bad));
for(const patch of [{seed:'9223372036854775808'},{seed:'1e4'},{radius:129},{x:1.2},{minY:50,maxY:20},{oreId:'ancient_debris'},{edition:'bad'},{version:'999'}])assert.throws(()=>encodeExpedition({...base,...patch}as Expedition));
console.log('PASS: signed 64-bit seeds, QR raster decoding, invalid links, ranges and ore/dimension gates.');
const {roomLink,parseRoom,serverURL}=await import('../src/rooms');
const invitation={server:'https://crew.example.com',id:'AbCdEf123456',invite:'a'.repeat(32)};
assert.deepEqual(parseRoom(roomLink(invitation)),invitation);
for(const bad of ['http://crew.example.com','https://user:pass@crew.example.com','https://crew.example.com/path','https://crew.example.com/?secret=yes'])assert.throws(()=>serverURL(bad));
assert.throws(()=>parseRoom('oreatlas://room?v=1&server=https://crew.example.com&id=123&invite=123'));
const q=QRCode.create(roomLink(invitation),{errorCorrectionLevel:'M'}),size=(q.modules.size+8)*5,rgba=new Uint8ClampedArray(size*size*4);rgba.fill(255);for(let y=0;y<q.modules.size;y++)for(let x=0;x<q.modules.size;x++)if(q.modules.get(y,x))for(let a=0;a<5;a++)for(let b=0;b<5;b++){const i=(((y+4)*5+a)*size+(x+4)*5+b)*4;rgba[i]=rgba[i+1]=rgba[i+2]=0;}assert.equal(jsQR(rgba,size,size)?.data,roomLink(invitation));console.log('PASS: live room QR decoding, invitation round trip and HTTPS endpoint validation.');
