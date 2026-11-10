#!/bin/bash
# Orvaluna APK build — aapt2 + javac + dx + zipalign(py) + apksigner
set -euo pipefail
T=/home/claude/tools
cd "$(dirname "$0")"
B=build; rm -rf $B; mkdir -p $B/gen $B/classes $B/assets
cp -r ../www $B/assets/www
export JAVA_TOOL_OPTIONS=

$T/aapt2 compile --dir res -o $B/res.zip
$T/aapt2 link -o $B/base.apk -I $T/android.jar --manifest AndroidManifest.xml \
  -A $B/assets --java $B/gen --min-sdk-version 24 --target-sdk-version 34 \
  --version-code 3 --version-name 1.0.2 -0 mp3 -0 ogg -0 woff2 -0 png --auto-add-overlay $B/res.zip

javac -nowarn -Xlint:-options -source 8 -target 8 -encoding UTF-8 -bootclasspath $T/android.jar \
  -d $B/classes $(find src $B/gen -name '*.java') 2>&1 | grep -v JAVA_TOOL || true
java -cp $T/dx.jar com.android.dx.command.Main --dex --min-sdk-version=24 --output=$B/classes.dex $B/classes

python3 - "$B" <<'PY'
import zipfile, sys
b=sys.argv[1]
src=zipfile.ZipFile(f'{b}/base.apk')
out=open(f'{b}/aligned.apk','wb')
zout=zipfile.ZipFile(out,'w')
items=[(i,src.read(i.filename)) for i in src.infolist()]
items.append((zipfile.ZipInfo('classes.dex',(2026,11,10,0,0,0)),open(f'{b}/classes.dex','rb').read()))
for info,data in items:
    zi=zipfile.ZipInfo(info.filename,(2026,1,1,0,0,0))
    store = info.filename=='resources.arsc' or info.compress_type==zipfile.ZIP_STORED and info.filename!='classes.dex'
    zi.compress_type=zipfile.ZIP_STORED if store else zipfile.ZIP_DEFLATED
    if store:
        # header = 30 + name + extra; pad extra so data offset is 4-aligned (so files 4096 not needed)
        off=out.tell()+30+len(zi.filename.encode())
        pad=(-off)%4
        zi.extra=b'\x00'*pad
    zout.writestr(zi,data)
zout.close(); out.close()
PY

if [ ! -f orvaluna.keystore ]; then
  keytool -genkeypair -keystore orvaluna.keystore -storepass orvaluna2026 -keypass orvaluna2026 \
    -alias orvaluna -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Orvaluna, OU=Mobile, O=Orvaluna, L=Lima, C=PE" 2>&1 | grep -v JAVA_TOOL || true
fi
java -jar $T/apksigner.jar sign --ks orvaluna.keystore --ks-pass pass:orvaluna2026 --key-pass pass:orvaluna2026 \
  --min-sdk-version 24 --out $B/Orvaluna.apk $B/aligned.apk
java -jar $T/apksigner.jar verify -v --min-sdk-version 24 $B/Orvaluna.apk | head -5
ls -la $B/Orvaluna.apk
