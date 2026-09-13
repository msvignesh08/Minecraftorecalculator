#!/usr/bin/env python3
"""Build the Android APK without Gradle. Requires Java 17, SDK 34, Python 3.

Use a JDK (javac) or set ECJ_JAR to Eclipse's Java compiler jar.
Set ANDROID_SDK_ROOT to an SDK with platforms;android-34 and build-tools;34.0.0.
The development signing key is retained under .signing for future updates.
"""
import os
import sys
from pathlib import Path
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent
SDK = Path(os.environ['ANDROID_SDK_ROOT']).resolve()
BT = SDK / 'build-tools' / '34.0.0'
ANDROID = SDK / 'platforms' / 'android-34' / 'android.jar'
MAIN = ROOT / 'app' / 'src' / 'main'
OUT = ROOT / 'build'
OUT.mkdir(exist_ok=True)
CLASSES = OUT / 'classes'
if CLASSES.exists():
    shutil.rmtree(CLASSES)
CLASSES.mkdir()

def run(*args):
    subprocess.run([str(a) for a in args], check=True)

# The bundled WebAssembly engines replace JNI libraries.
run(BT/'aapt2', 'compile', '--dir', MAIN/'res', '-o', OUT/'resources.zip')
run(BT/'aapt2', 'link', '-o', OUT/'resources.apk', '--manifest', MAIN/'AndroidManifest.xml',
    '-I', ANDROID, '--min-sdk-version', '26', '--target-sdk-version', '34', OUT/'resources.zip')
compiler = ['javac'] if shutil.which('javac') else ['java', '-jar', os.environ['ECJ_JAR']]
bootclasspath = os.pathsep.join([str(ANDROID), str(BT/'core-lambda-stubs.jar')])
run(*compiler, '-source', '8', '-target', '8', '-bootclasspath', bootclasspath, '-encoding', 'UTF-8',
    '-d', CLASSES, *sorted((MAIN/'java').rglob('*.java')))
with zipfile.ZipFile(OUT/'classes.jar', 'w', zipfile.ZIP_DEFLATED) as z:
    for source in sorted(CLASSES.rglob('*.class')):
        z.write(source, source.relative_to(CLASSES))
DEX = OUT / 'dex'
if DEX.exists():
    shutil.rmtree(DEX)
DEX.mkdir()
run(BT/'d8', '--release', '--min-api', '26', '--lib', ANDROID, '--output', DEX, OUT/'classes.jar')
shutil.copyfile(OUT/'resources.apk', OUT/'unsigned.apk')
with zipfile.ZipFile(OUT/'unsigned.apk', 'a', zipfile.ZIP_DEFLATED) as z:
    for source in sorted(DEX.glob('*.dex')):
        z.write(source, source.name)
    for source in sorted((MAIN/'assets').rglob('*')):
        if source.is_file(): z.write(source, 'assets/'+str(source.relative_to(MAIN/'assets')))
    for source in sorted((OUT/'native').rglob('*.so')):
        z.write(source, 'lib/'+str(source.relative_to(OUT/'native')))
run(BT/'zipalign', '-f', '4', OUT/'unsigned.apk', OUT/'aligned.apk')
KEY = ROOT / '.signing' / 'development.jks'
KEY.parent.mkdir(exist_ok=True)
if not KEY.exists():
    run('keytool', '-genkeypair', '-keystore', KEY, '-storepass', 'android', '-keypass', 'android',
        '-alias', 'orefinder', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
        '-dname', 'CN=Ore Finder Personal Development', '-storetype', 'JKS')
APK = ROOT / 'Ore-Atlas-Blue-Crew.apk'
run(BT/'apksigner', 'sign', '--ks', KEY, '--ks-key-alias', 'orefinder',
    '--ks-pass', 'pass:android', '--key-pass', 'pass:android', '--out', APK, OUT/'aligned.apk')
run(BT/'apksigner', 'verify', '--verbose', APK)
run(BT/'aapt2', 'dump', 'badging', APK)
print('APK:', APK)
