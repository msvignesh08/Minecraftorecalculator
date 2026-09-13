#include <stdlib.h>
#include <stdint.h>
#include <math.h>
#include "generator.h"
#include "finders.h"
#include "util.h"
#ifndef BEDROCK
#include "features/ore.h"
#endif
typedef struct {Generator g;SurfaceNoise sn;int mc,dim;} World;
int atlasVersion(int v){
#ifdef BEDROCK
switch(v){case 2645:return MC_26_40;case 2620:return MC_26_20;case 2630:return MC_26_30;case 12160:return MC_1_21_60;case 12150:return MC_1_21_50;case 121:return MC_1_21;default:return 0;}
#else
switch(v){case 262:return MC_26_2;case 261:return MC_26_1;case 12111:return MC_1_21_11;case 121:return MC_1_21_1;default:return 0;}
#endif
}
World* atlasCreate(int v,int dim,uint32_t lo,uint32_t hi){int mc=atlasVersion(v);if(!mc||dim< -1||dim>1)return NULL;World*w=malloc(sizeof(World));if(!w)return NULL;w->mc=mc;w->dim=dim;uint64_t seed=((uint64_t)hi<<32)|lo;setupGenerator(&w->g,mc,0);applySeed(&w->g,dim,seed);initSurfaceNoise(&w->sn,dim,seed);return w;}
void atlasDestroy(World*w){free(w);}
int atlasBiomes(World*w,int x,int z,int n,int scale,int y,int*out){if(!w||n<1||n>192)return -1;Range r={scale,x,z,n,n,scale==1?y:(int)floor(y/4.0),1};int*buf=allocCache(&w->g,r);if(!buf)return -2;int rc=genBiomes(&w->g,buf,r);if(!rc)for(int i=0;i<n*n;i++)out[i]=buf[i];free(buf);return rc;}
void atlasPalette(int*out){unsigned char p[256][3];initBiomeColors(p);for(int i=0;i<256;i++)out[i]=(p[i][0]<<16)|(p[i][1]<<8)|p[i][2];}
const char* atlasBiomeName(World*w,int id){const char*s=biome2str(w->mc,id);return s?s:"unknown";}
int atlasBiomeAt(World*w,int x,int y,int z){return getBiomeAt(&w->g,1,x,y,z);}
static int structs[]={Village,Desert_Pyramid,Jungle_Temple,Swamp_Hut,Igloo,Monument,Mansion,Outpost,Ruined_Portal,Ancient_City,Shipwreck,Ocean_Ruin,Fortress,Bastion,End_City};
int atlasStructures(World*w,int lx,int lz,int hx,int hz,int mask,int*out,int cap){if(!w||hx<lx||hz<lz||hx-lx>32768||hz-lz>32768)return -1;int n=0;for(int t=0;t<15&&n<cap;t++){StructureConfig sc;if(!(mask&(1<<t))||!getStructureConfig(structs[t],w->mc,&sc)||sc.dim!=w->dim)continue;int b=sc.regionSize*16;if(b<=0)continue;int x0=floor((double)lx/b),x1=floor((double)hx/b),z0=floor((double)lz/b),z1=floor((double)hz/b);if((x1-x0+1)*(z1-z0+1)>4096)continue;for(int z=z0;z<=z1&&n<cap;z++)for(int x=x0;x<=x1&&n<cap;x++){Pos p;if(!getStructurePos(structs[t],w->mc,w->g.seed,x,z,&p)||p.x<lx||p.x>hx||p.z<lz||p.z>hz)continue;if(!isViableStructurePos(structs[t],&w->g,p.x,p.z,0)||!isViableStructureTerrain(structs[t],&w->g,p.x,p.z))continue;out[3*n]=t;out[3*n+1]=p.x;out[3*n+2]=p.z;n++;}}return n;}
int atlasOres(World*w,int group,int cx,int cz,int*out,int cap){
#ifdef BEDROCK
return -1;
#else
static const int groups[11][5]={{DiamondOre,MediumDiamondOre,LargeDiamondOre,BuriedDiamondOre,-1},{UpperIronOre,MiddleIronOre,SmallIronOre,-1},{GoldOre,LowerGoldOre,ExtraGoldOre,-1},{RedstoneOre,LowerRedstoneOre,-1},{LapisOre,BuriedLapisOre,-1},{CopperOre,LargeCopperOre,-1},{UpperCoalOre,LowerCoalOre,-1},{EmeraldOre,-1},{LargeDebrisOre,SmallDebrisOre,-1},{NetherQuartzOre,DeltasQuartzOre,-1},{NetherGoldOre,DeltasGoldOre,-1}};
if(!w||group<0||group>10)return -1;int n=0;for(int i=0;i<5&&groups[group][i]!=-1;i++){OreConfig conf;if(!getOreConfig(groups[group][i],w->mc,0,&conf)||conf.dim!=w->dim)continue;/* generateOres performs its own per-placement biome check. */Pos3List list=generateOres(&w->g,&w->sn,conf,cx,cz);for(int j=0;j<list.size;j++){if(n<cap){out[3*n]=list.pos3s[j].x;out[3*n+1]=list.pos3s[j].y;out[3*n+2]=list.pos3s[j].z;}n++;}freePos3List(&list);}return n;
#endif
}
