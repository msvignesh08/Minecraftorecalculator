package com.vignesh.orefinder;
public final class JavaEngine {static {System.loadLibrary("seedjava");} public static native int[] biomes(long seed,int ver,int dim,int x,int z,int w,int h,int scale,int y);public static native int[] colors();public static native String name(int version,int id);public static native int[] structures(long seed,int ver,int dim,int lx,int lz,int hx,int hz,int mask);}
