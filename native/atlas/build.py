"""EMCC=/path/to/emcc.py JAVA_SOURCE=... BEDROCK_SOURCE=... python3 native/atlas/build.py"""
import os,subprocess,pathlib,json
r=pathlib.Path(__file__).resolve().parents[2];exports=['atlasVersion','atlasCreate','atlasDestroy','atlasBiomes','atlasPalette','atlasBiomeName','atlasBiomeAt','atlasStructures','atlasOres','malloc','free'];common=['noise','biomes','layers','biomenoise','generator','finders','util','quadbase']
for e in ['java','bedrock']:
 s=pathlib.Path(os.environ[e.upper()+'_SOURCE']);files=common+(['terrainnoise','carver','features/ore','features/end_city','features/fortress','features/stronghold']if e=='java'else ['mt','cave']);args=['python3',os.environ['EMCC'],str(r/'native/atlas/shim.c')]+[str(s/(f+'.c'))for f in files]+['-I'+str(s),'-O2','-fwrapv','-sMODULARIZE=1','-sEXPORT_ES6=1','-sENVIRONMENT=web,worker,node','-sALLOW_MEMORY_GROWTH=1','-sINITIAL_MEMORY=33554432','-sMAXIMUM_MEMORY=134217728','-sSTACK_SIZE=1048576','-sEXPORTED_FUNCTIONS='+json.dumps(['_'+x for x in exports]),'-sEXPORTED_RUNTIME_METHODS=["HEAP32","UTF8ToString"]','-o',str(r/'public/engine'/('atlas-'+e+'.js'))]+(['-DBEDROCK']if e=='bedrock'else[])
 subprocess.run(args,check=True)
