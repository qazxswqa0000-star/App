import { CONFIG } from "./config.js";
import { getApps, call } from "./api.js";
const $ = s => document.querySelector(s), esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const F = ["name", "developer", "category", "version", "size", "rating", "downloads", "featured", "tagline", "description", "icon_url", "screenshots", "download_url"];
let pw = sessionStorage.getItem("an_pw") || "", apps = [], editId = "", toastTimer = null;
const toast = m => { const t = $("#t"); t.textContent = m; t.classList.add("on"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("on"), 3000) };
function toLh3Url(raw) {
  const u = String(raw || "").trim();
  if (!u) return "";
  if (u.includes("lh3.googleusercontent.com/d/")) return u;

  const fileMatch = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${fileMatch[1]}`;
  }

  try {
    const parsed = new URL(u);
    const idParam = parsed.searchParams.get("id");
    if (parsed.hostname.includes("drive.google.com") && idParam) {
      return `https://lh3.googleusercontent.com/d/${idParam}`;
    }
  } catch (_) {
    return u;
  }

  return u;
}
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error("Unable to read APK file"));
    reader.readAsDataURL(file);
  });
}
async function login() {
  if (!CONFIG.API_URL) return $("#root").innerHTML = `<div class="panel"><h2>Setup needed</h2><p class="desc">Set API_URL in js/config.js (see README) to enable the admin panel.</p></div>`;
  if (!pw) return loginUI();
  const r = await call("login", pw).catch(() => ({})); if (!r.ok) { sessionStorage.removeItem("an_pw"); pw = ""; return loginUI(r.error) } show();
}
function loginUI(err) { $("#root").innerHTML = `<div class="panel" style="max-width:420px"><h2>Admin login</h2><label>Password</label><input id="pw" type="password" autofocus><p style="color:#ff7b8a;margin-top:10px">${esc(err || "")}</p><button class="btn" id="go">Sign in</button></div>`;
  $("#go").onclick = () => { pw = $("#pw").value; sessionStorage.setItem("an_pw", pw); login() } }
async function show() {
  apps = await getApps();
  $("#root").innerHTML = `<div class="panel"><h2 id="ft">Add new app</h2><div class="two"><div><label>Name *</label><input id="f-name"></div><div><label>Developer</label><input id="f-developer"></div><div><label>Category</label><input id="f-category" placeholder="Games, Tools..."></div><div><label>Version</label><input id="f-version" value="1.0"></div><div><label>Size</label><input id="f-size" placeholder="Auto-filled if APK uploaded"></div><div><label>Rating</label><input id="f-rating" placeholder="4.7"></div><div><label>Downloads</label><input id="f-downloads" placeholder="10K+"></div><div><label>Featured on hero?</label><select id="f-featured"><option>FALSE</option><option>TRUE</option></select></div></div>
  <label>Tagline</label><input id="f-tagline"><label>Description</label><textarea id="f-description" rows="4"></textarea><label>Icon URL (GitHub raw / any image link)</label><input id="f-icon_url"><label>Screenshot URLs (separate with | )</label><input id="f-screenshots"><label>Upload APK to Google Drive (optional, max 25 MB)</label><input id="f-apk_file" type="file" accept=".apk"><label>Download URL (required if no APK is uploaded)</label><input id="f-download_url" placeholder="Auto-filled when APK is uploaded">
  <div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap"><button class="btn" id="save" style="margin:0">Save to sheet</button><button class="btn ghost" id="clr" style="margin:0">Clear</button><button class="btn ghost" id="out" style="margin:0 0 0 auto">Logout</button></div></div>
  <div class="panel"><h2>Your apps (${apps.length})</h2>${apps.map(a => `<div class="arow"><div><b>${esc(a.name)}</b><small>${esc(a.category)} · v${esc(a.version)}</small></div><button class="btn ghost" data-e="${esc(a.id)}" style="margin:0;padding:8px 16px">Edit</button><button class="btn red" data-d="${esc(a.id)}">Delete</button></div>`).join("") || "<p class='desc'>No apps yet.</p>"}</div>`;
  $("#save").onclick = save; $("#clr").onclick = () => { editId = ""; show() }; $("#out").onclick = () => { sessionStorage.clear(); pw = ""; login() };
  document.querySelectorAll("[data-e]").forEach(b => b.onclick = () => { const a = apps.find(x => String(x.id) === String(b.dataset.e)); if (!a) return; editId = a.id; F.forEach(k => $("#f-" + k).value = a[k] || ""); $("#ft").textContent = "Edit: " + a.name; scrollTo(0, 0) });
  document.querySelectorAll("[data-d]").forEach(b => b.onclick = async () => { if (!confirm("Delete this app?")) return; const r = await call("delete", pw, { id: b.dataset.d }).catch(() => ({ error: "Network error" })); if (r.ok) { toast("Deleted"); show() } else toast(r.error || "Delete failed") });
}
async function save() {
  const a = {}; F.forEach(k => a[k] = $("#f-" + k).value.trim());
  const apkInput = $("#f-apk_file");
  const apkFile = apkInput && apkInput.files && apkInput.files[0];
  if (!a.name || (!a.download_url && !apkFile)) return toast("Name and either a download URL or APK file are required");
  if (apkFile && !apkFile.name.toLowerCase().endsWith(".apk")) return toast("Please select a valid .apk file");
  if (apkFile && !apkFile.size) return toast("The selected APK file is empty");
  if (apkFile && apkFile.size > 25 * 1024 * 1024) return toast("APK is too large for Apps Script upload (>25MB). Use GitHub upload/release.");
  if (a.icon_url) a.icon_url = toLh3Url(a.icon_url);
  if (a.screenshots) {
    a.screenshots = a.screenshots
      .split("|")
      .map(s => toLh3Url(s))
      .filter(Boolean)
      .join(" | ");
  }
  const b = $("#save"); const prevLabel = b.textContent; b.disabled = true;
  try {
    if (apkFile) {
      b.textContent = "Uploading APK to Google Drive...";
      a.apk_filename = apkFile.name;
      a.apk_base64 = await readFileAsBase64(apkFile);
      if (!a.size) a.size = `${(apkFile.size / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      b.textContent = "Saving...";
    }
    if (editId) a.id = editId;
    const r = await call(editId ? "update" : "add", pw, a);
    if (r.ok) {
      toast("Saved & published ✓");
      editId = "";
      show();
    } else {
      toast(r.error || "Save failed");
    }
  } catch (_) {
    toast("Network or upload error");
  } finally {
    b.disabled = false;
    b.textContent = prevLabel;
  }
}
login();
