#!/usr/bin/env python3
"""Firma iOS en CI sin Mac propio ni dispositivos registrados.

Usa la API de App Store Connect para crear un certificado «Apple Distribution»
temporal y un perfil de App Store, los instala en el llavero del runner y, al
final, los elimina (revocar un certificado de distribución no afecta a las
apps ya subidas a la App Store ni a TestFlight).

  python3 asc_signing.py setup     # crea e instala; escribe variables en $GITHUB_ENV
  python3 asc_signing.py cleanup   # revoca el certificado y borra el perfil

Variables de entorno: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH, BUNDLE_ID,
KEYCHAIN (opcional, por defecto build.keychain), GITHUB_RUN_NUMBER.
"""
import base64, json, os, plistlib, subprocess, sys, time, urllib.error, urllib.parse, urllib.request

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID

API = "https://api.appstoreconnect.apple.com/v1"
WORK = os.path.join(os.environ.get("RUNNER_TEMP", "/tmp"), "orv-signing")
STATE = os.path.join(WORK, "state.json")


def b64url(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def token():
    key = serialization.load_pem_private_key(open(os.environ["ASC_KEY_PATH"], "rb").read(), None)
    head = {"alg": "ES256", "kid": os.environ["ASC_KEY_ID"], "typ": "JWT"}
    now = int(time.time())
    body = {"iss": os.environ["ASC_ISSUER_ID"], "iat": now, "exp": now + 1100, "aud": "appstoreconnect-v1"}
    msg = (b64url(json.dumps(head).encode()) + "." + b64url(json.dumps(body).encode())).encode()
    r, s = decode_dss_signature(key.sign(msg, ec.ECDSA(hashes.SHA256())))
    return msg.decode() + "." + b64url(r.to_bytes(32, "big") + s.to_bytes(32, "big"))


def api(method, path, data=None):
    req = urllib.request.Request(API + path, method=method,
                                 data=json.dumps(data).encode() if data is not None else None,
                                 headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        raise SystemExit(f"::error::API de Apple {method} {path} → HTTP {e.code}: {detail}")


def run(*cmd):
    subprocess.run(cmd, check=True)


def setup():
    os.makedirs(WORK, exist_ok=True)
    bundle = os.environ["BUNDLE_ID"]
    keychain = os.environ.get("KEYCHAIN", "build.keychain")

    # 1. Clave privada + CSR propios
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    csr = (x509.CertificateSigningRequestBuilder()
           .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Orvaluna CI"),
                                    x509.NameAttribute(NameOID.COUNTRY_NAME, "PE")]))
           .sign(key, hashes.SHA256()))
    csr_pem = csr.public_bytes(serialization.Encoding.PEM).decode()

    # 2. Certificado Apple Distribution
    res = api("POST", "/certificates", {"data": {"type": "certificates", "attributes": {
        "certificateType": "DISTRIBUTION", "csrContent": csr_pem}}})
    cert_id = res["data"]["id"]
    json.dump({"cert_id": cert_id}, open(STATE, "w"))
    cert = x509.load_der_x509_certificate(base64.b64decode(res["data"]["attributes"]["certificateContent"]))
    print(f"Certificado creado: {cert.subject.rfc4514_string()}")

    # 3. Identificador de la app (se crea si no existe)
    found = api("GET", "/bundleIds?filter%5Bidentifier%5D=" + urllib.parse.quote(bundle) + "&limit=200")["data"]
    found = [b for b in found if b["attributes"]["identifier"] == bundle]
    if found:
        bundle_ref = found[0]["id"]
    else:
        bundle_ref = api("POST", "/bundleIds", {"data": {"type": "bundleIds", "attributes": {
            "identifier": bundle, "name": "Orvaluna", "platform": "IOS"}}})["data"]["id"]
        print(f"Bundle ID registrado: {bundle}")

    # 4. Perfil de App Store
    name = f"Orvaluna CI {os.environ.get('GITHUB_RUN_NUMBER', int(time.time()))}"
    prof = api("POST", "/profiles", {"data": {"type": "profiles",
        "attributes": {"name": name, "profileType": "IOS_APP_STORE"},
        "relationships": {"bundleId": {"data": {"type": "bundleIds", "id": bundle_ref}},
                          "certificates": {"data": [{"type": "certificates", "id": cert_id}]}}}})
    prof_id = prof["data"]["id"]
    content = base64.b64decode(prof["data"]["attributes"]["profileContent"])
    json.dump({"cert_id": cert_id, "profile_id": prof_id}, open(STATE, "w"))
    start = content.find(b"<?xml"); end = content.find(b"</plist>") + len(b"</plist>")
    uuid = plistlib.loads(content[start:end])["UUID"]
    for d in ["~/Library/MobileDevice/Provisioning Profiles", "~/Library/Developer/Xcode/UserData/Provisioning Profiles"]:
        d = os.path.expanduser(d); os.makedirs(d, exist_ok=True)
        open(os.path.join(d, uuid + ".mobileprovision"), "wb").write(content)
    print(f"Perfil creado: {name} ({uuid})")

    # 5. Certificado + clave en el llavero (p12 con cifrado compatible con macOS)
    pw = b"orvaluna-ci"
    enc = (serialization.PrivateFormat.PKCS12.encryption_builder().kdf_rounds(50000)
           .key_cert_algorithm(pkcs12.PBES.PBESv1SHA1And3KeyTripleDESCBC).hmac_hash(hashes.SHA1()).build(pw))
    p12 = os.path.join(WORK, "dist.p12")
    open(p12, "wb").write(pkcs12.serialize_key_and_certificates(b"Orvaluna CI", key, cert, None, enc))
    run("security", "import", p12, "-k", keychain, "-P", pw.decode(), "-T", "/usr/bin/codesign", "-T", "/usr/bin/security")
    run("security", "set-key-partition-list", "-S", "apple-tool:,apple:,codesign:", "-s", "-k", "ci", keychain)
    run("security", "find-identity", "-v", "-p", "codesigning", keychain)

    with open(os.environ["GITHUB_ENV"], "a") as f:
        f.write(f"PROFILE_NAME={name}\nPROFILE_UUID={uuid}\n")


def cleanup():
    if not os.path.exists(STATE):
        print("Nada que limpiar."); return
    st = json.load(open(STATE))
    if st.get("profile_id"):
        api("DELETE", "/profiles/" + st["profile_id"]); print("Perfil temporal eliminado.")
    if st.get("cert_id"):
        api("DELETE", "/certificates/" + st["cert_id"]); print("Certificado temporal revocado.")


if __name__ == "__main__":
    {"setup": setup, "cleanup": cleanup}[sys.argv[1]]()
