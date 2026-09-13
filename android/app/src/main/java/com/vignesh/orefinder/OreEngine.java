package com.vignesh.orefinder;
import java.util.*;
/** Original experimental placement model. Does not simulate terrain or confirm blocks. */
public final class OreEngine {
 public static final class Target {public final int x,y,z,rule;public final String ore;Target(int x,int y,int z,int rule,String ore){this.x=x;this.y=y;this.z=z;this.rule=rule;this.ore=ore;}}
 public static final class Twister {
 private final int[] mt=new int[624];private int at=624;
 public Twister(int s){mt[0]=s;for(int i=1;i<624;i++)mt[i]=1812433253*(mt[i-1]^(mt[i-1]>>>30))+i;}
 public int draw(){if(at==624){for(int i=0;i<624;i++){int v=(mt[i]&0x80000000)|(mt[(i+1)%624]&0x7fffffff);mt[i]=mt[(i+397)%624]^(v>>>1)^((v&1)==0?0:0x9908b0df);}at=0;}int v=mt[at++];v^=v>>>11;v^=(v<<7)&0x9d2c5680;v^=(v<<15)&0xefc60000;return v^(v>>>18);}
 public int bound(int n){return(int)(Integer.toUnsignedLong(draw())%n);}}
 public static final class Xoro {
 private long a,b;public Xoro(long s){long v=s^0x6a09e667f3bcc909L;a=mix(v);b=mix(v+0x9e3779b97f4a7c15L);if((a|b)==0){a=0x9e3779b97f4a7c15L;b=0x6a09e667f3bcc909L;}}
 private static long mix(long v){v=(v^(v>>>30))*0xbf58476d1ce4e5b9L;v=(v^(v>>>27))*0x94d049bb133111ebL;return v^(v>>>31);}
 public long raw(){long out=Long.rotateLeft(a+b,17)+a,t=b^a;a=Long.rotateLeft(a,49)^t^(t<<21);b=Long.rotateLeft(t,28);return out;}
 public int bits(int n){return(int)(raw()>>>(64-n));}public long worldgenLong(){return((long)bits(32)<<32)+bits(32);}public float decimal(){return bits(24)*0x1.0p-24F;}
 public int bound(int n){if((n&(n-1))==0)return(int)((n*(long)bits(31))>>31);int v,r;do{v=bits(31);r=v%n;}while(v-r+n-1<0);return r;}}
 public static long population(long s,int cx,int cz){Xoro r=new Xoro(s);long a=r.worldgenLong()|1,b=r.worldgenLong()|1;return((long)cx*16*a+(long)cz*16*b)^s;}
 private static int hash(String s){long h=0xcbf29ce484222325L;for(int i=0;i<s.length();i++)h=h*0x100000001b3L^s.charAt(i);return(int)h;}
 private static final String[] RULES={"minecraft:overworld_underground_diamond_ore_feature","minecraft:overworld_underground_diamond_ore_feature_square","minecraft:overworld_underground_diamond_ore_large_feature","minecraft:overworld_underground_diamond_ore_buried_feature"};
 public static boolean supported(boolean bed,int ver,int dim){return bed?ver==2620&&dim==0:ver==121&&(dim==0||dim==-1);}
 public static List<Target> search(long seed,boolean bed,int ver,int dim,int centerX,int centerZ,int radius,int minY,int maxY){ArrayList<Target> list=new ArrayList<>();if(!supported(bed,ver,dim))return list;if(radius<1||radius>192)throw new IllegalArgumentException("Radius must be 1 to 192 blocks");Twister base=new Twister((int)seed);int mulX=(base.draw()>>>1)|1,mulZ=(base.draw()>>>1)|1;
 for(int cz=Math.floorDiv(centerZ-radius,16);cz<=Math.floorDiv(centerZ+radius,16);cz++)for(int cx=Math.floorDiv(centerX-radius,16);cx<=Math.floorDiv(centerX+radius,16);cx++){
 if(bed){int cs=(int)seed^(cx*mulX+cz*mulZ);for(int rule=0;rule<4;rule++){Twister r=new Twister(cs^(hash(RULES[rule])+0x9e3779b9+(cs<<6)+(cs>>>2)));if(rule==2&&r.bound(9)!=0)continue;int count=new int[]{7,2,1,4}[rule];for(int i=0;i<count;i++){int z=cz*16+r.bound(16),y=rule==1?-64+r.bound(60):-144+r.bound(81)+r.bound(81),x=cx*16+r.bound(16);if(y>=-64&&y<=16)list.add(new Target(x+8,y,z+8,rule,"diamond"));}}}
 else{long pop=population(seed,cx,cz);if(dim==0){for(int rule=0;rule<4;rule++){Xoro r=new Xoro(pop+60018+rule);if(rule==2&&r.decimal()>=1F/9F)continue;int x=cx*16+r.bound(16),z=cz*16+r.bound(16),y=rule==1?-64+r.bound(61):-144+r.bound(81)+r.bound(81);if(y>=-64&&y<=16)list.add(new Target(x,y,z,rule,"diamond"));}}else for(int pass=0;pass<2;pass++){Xoro r=new Xoro(pop+70021+pass);int x=cx*16+r.bound(16),z=cz*16+r.bound(16),y=pass==0?8+r.bound(9)+r.bound(9):8+r.bound(112);if(r.bound(pass==0?4:3)>0)list.add(new Target(x,y,z,pass,"debris"));}}}
 list.removeIf(t->t.y<minY||t.y>maxY||Math.abs(t.x-centerX)>radius||Math.abs(t.z-centerZ)>radius);list.sort((a,b)->Long.compare(distance(a,centerX,centerZ),distance(b,centerX,centerZ)));return list;}
 private static long distance(Target t,int x,int z){return(long)(t.x-x)*(t.x-x)+(long)(t.z-z)*(t.z-z);}
}
