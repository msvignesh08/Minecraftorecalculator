export const versions={java:[['262','26.2'],['261','26.1'],['12111','1.21.11'],['121','1.21.1']],bedrock:[['2645','26.45'],['2620','26.20'],['2630','26.30'],['12160','1.21.60']]};
export const ores=[
 {id:'diamond',name:'Diamond',image:'diamond_ore',color:'#70e4eb',range:[-64,16],peak:-59,dim:0,note:'Deep deepslate layers. Air exposure can remove candidates.'},
 {id:'iron',name:'Iron',image:'iron_ore',color:'#d7c1ae',range:[-64,320],peak:16,dim:0,note:'Underground deposits and high mountains. Large noise veins are not simulated.'},
 {id:'gold',name:'Gold',image:'gold_ore',color:'#f2ce64',range:[-64,256],peak:-16,dim:0,note:'Includes extra badlands placements on Java.'},
 {id:'redstone',name:'Redstone',image:'redstone_ore',color:'#ed6c62',range:[-64,16],peak:-58,dim:0,note:'Most abundant in the deepest layers.'},
 {id:'lapis',name:'Lapis lazuli',image:'lapis_ore',color:'#81a7fa',range:[-64,64],peak:0,dim:0,note:'Includes buried deposits on Java.'},
 {id:'copper',name:'Copper',image:'copper_ore',color:'#dc9a75',range:[-16,112],peak:48,dim:0,note:'Larger deposits in dripstone caves. Large noise veins are not simulated.'},
 {id:'coal',name:'Coal',image:'coal_ore',color:'#b3bec2',range:[0,320],peak:96,dim:0,note:'Look above sea level and in exposed mountains.'},
 {id:'emerald',name:'Emerald',image:'emerald_ore',color:'#6cdf96',range:[-16,320],peak:232,dim:0,note:'Mountain biome deposits. High altitude requires actual terrain.'},
 {id:'ancient_debris',name:'Ancient debris',image:'ancient_debris_side',color:'#c89d89',range:[8,120],peak:15,dim:-1,note:'Nether only. Candidate positions may be rejected by block and air checks.'},
 {id:'nether_quartz',name:'Nether quartz',image:'quartz_ore',color:'#e7dcd6',range:[10,118],peak:32,dim:-1,note:'Netherrack deposits, with a separate basalt-deltas rule.'},
 {id:'nether_gold',name:'Nether gold',image:'nether_gold_ore',color:'#eebf62',range:[10,118],peak:32,dim:-1,note:'Netherrack deposits, with a separate basalt-deltas rule.'}
];
export const structures=['Village','Desert pyramid','Jungle temple','Swamp hut','Igloo','Ocean monument','Woodland mansion','Pillager outpost','Ruined portal','Ancient city','Shipwreck','Ocean ruin','Nether fortress','Bastion','End city'];
export const texture=(name:string)=>`${import.meta.env.BASE_URL}textures/${name}.png`;
export type Target={id:string;oreId:string;x:number;y:number;z:number;distance:number};
export type WorldSettings={seed:string;edition:'java'|'bedrock';version:string;dimension:number};
export type Tile={x:number;z:number;n:number;scale:number;ids:number[];palette:number[];legend:{id:number;name:string;color:string}[];structures:number[];limited:boolean};

export const targetTexture=(id:string,y:number)=>{const o=ores.find(o=>o.id===id);return texture(o?(y<0&&o.dim===0?"deepslate_":"")+o.image:"diamond_ore")};
