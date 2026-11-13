# Orvaluna — Astros & Números del Alma

Carta natal + estudio numerológico profundo, en ES / EN / DE / PT, con exportación a PDF y música ambiental.
Una sola app web (`www/`) empaquetada de forma nativa para **Android** (`android/`) e **iOS** (`ios/`).

```
www/                     App (HTML/CSS/JS, motor astrológico y numerológico, textos 4 idiomas)
android/                 Contenedor Android (Java + WebView) y build.sh → APK
ios/                     Contenedor iOS (Swift + WKWebView), proyecto XcodeGen (project.yml)
.github/workflows/ios.yml  Compilación iOS en la nube, firma y subida a App Store Connect
appstore/                Ficha de la App Store en 4 idiomas y capturas 1320×2868
docs/privacy.html        Política de privacidad (publicable con GitHub Pages)
```

---

## Publicar en el App Store desde Windows (sin Mac)

Apple solo permite compilar apps iOS en macOS. Este repositorio usa un **Mac en la nube de GitHub Actions**:
tú subes el código a GitHub y el flujo `iOS` compila, firma y envía la app a App Store Connect.

### 1. Cuenta de Apple Developer (una vez)
1. Inscríbete en el **Apple Developer Program** (99 USD/año): <https://developer.apple.com/programs/enroll/>
2. Anota tu **Team ID** (10 caracteres) en *developer.apple.com → Account → Membership details*.

### 2. Identificador y ficha de la app (una vez)
1. *developer.apple.com → Certificates, IDs & Profiles → Identifiers → +* → **App IDs → App**.
   Bundle ID explícito, p. ej. `com.orvaluna.app` (si ya está tomado usa otro, p. ej. `com.jamesalvis.orvaluna`).
2. *appstoreconnect.apple.com → Apps → + → Nueva app*: plataforma iOS, nombre **Orvaluna: Astros y Números**,
   idioma principal Español, el Bundle ID anterior y un SKU (p. ej. `ORVALUNA001`).

### 3. Clave de API de App Store Connect (una vez)
*App Store Connect → Usuarios y acceso → Integraciones → App Store Connect API → Claves del equipo → +*
- Nombre: `GitHub CI` · Acceso: **Admin** (necesario para que Apple gestione los certificados en la nube).
- Descarga el archivo `AuthKey_XXXXXXXXXX.p8` (solo se puede descargar una vez) y anota el **Key ID** y el **Issuer ID**.

### 4. Subir el código a GitHub
1. Crea un repositorio en <https://github.com/new> (puede ser privado; ver nota de minutos abajo).
2. Sube el contenido de esta carpeta: con **GitHub Desktop** (Add local repository → Publish) o
   desde la web con *Add file → Upload files* (arrastra todas las carpetas, incluida `.github`).

### 5. Secretos del repositorio
*Repositorio → Settings → Secrets and variables → Actions*
| Tipo | Nombre | Valor |
|---|---|---|
| Secret | `APPLE_TEAM_ID` | Tu Team ID |
| Secret | `ASC_KEY_ID` | Key ID de la clave |
| Secret | `ASC_ISSUER_ID` | Issuer ID |
| Secret | `ASC_KEY_P8_BASE64` | El `.p8` en Base64 (o su texto tal cual, con BEGIN y END) |
| Variable | `IOS_BUNDLE_ID` | Solo si usaste un Bundle ID distinto de `com.orvaluna.app` |

### 6. Compilar y subir
*Repositorio → Actions → iOS → Run workflow* (con "Subir el build" marcado).
En ~10–15 min el build aparece en *App Store Connect → TestFlight*. El `.ipa` también queda como artefacto del flujo.
Cada push a `main` que toque `www/` o `ios/` genera un build nuevo (número de build = número de ejecución).

### 7. Enviar a revisión
1. En App Store Connect completa la ficha con los textos de `appstore/listing.md` (4 idiomas).
2. Sube las capturas de `appstore/screenshots/` (tamaño 6,9" = 1320×2868) en cada idioma.
3. **Privacidad de la app:** "No se recopilan datos". **URL de privacidad:** activa GitHub Pages
   (*Settings → Pages → Deploy from branch → main → /docs*) y usa `https://TU-USUARIO.github.io/REPO/privacy.html`.
   Antes, cambia el correo de contacto en `docs/privacy.html`.
4. Selecciona el build de TestFlight, responde "No" a cifrado (ya declarado en Info.plist) y pulsa **Enviar para revisión**.

> **Minutos de GitHub:** en repositorios públicos los runners macOS son gratuitos. En privados, el plan gratuito
> incluye 2 000 min/mes y los de macOS cuentan ×10 (≈200 min reales ≈ 12–15 builds al mes).

> **Aviso sobre la revisión de Apple:** la guía 4.3 de Apple considera "saturada" la categoría de adivinación/horóscopos.
> Orvaluna se presenta como estudio de autoconocimiento (carta natal calculada, numerología completa, síntesis y PDF),
> sin predicciones; la nota para el revisor en `appstore/listing.md` lo explica. Si Apple pidiera cambios, responde
> desde el Centro de resoluciones destacando estas funciones.

---

## Si tienes acceso a un Mac
```bash
brew install xcodegen
cd ios && xcodegen generate && open Orvaluna.xcodeproj
```
En Xcode: *Signing & Capabilities* → tu equipo, Bundle ID → *Product → Archive → Distribute App*.

## Android
```bash
cd android && ./build.sh    # genera build/Orvaluna.apk firmado
```
