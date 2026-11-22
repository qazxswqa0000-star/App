# AppNest – Setup

## Files
index.html (store) · admin.html (admin panel) · css/style.css · js/{config,api,store,admin,three-scene}.js · backend/Code.gs

## 1. Google Sheet backend (admin panel er jonno)
1. Notun Google Sheet banan > Extensions > Apps Script.
2. backend/Code.gs er shob code paste korun. ADMIN_PASSWORD bodle nin.
3. Deploy > New deployment > Web app. Execute as: Me, Who has access: Anyone. Deploy.
4. Web app URL copy kore js/config.js e API_URL e boshan.

## 2. App files GitHub e
Repo > Releases > APK upload korun. Oi link ta admin panel e "Download URL" e din.
Icon/screenshot repo te rekhe raw.githubusercontent.com link din.
Admin panel theke chaile "APK file" field-e 25 MB porjonto `.apk` upload kora jabe; upload hole Google Drive link `download_url` hisebe save hobe. Apps Script deployment-er account-e Drive file create korar permission thakte hobe ebong public link sharing allowed hote hobe. Backend code bodlale web app-ta abar deploy/update korun.

## 3. Host
Ei puro folder GitHub repo te push korun > Settings > Pages. Store: /index.html, Admin: /admin.html
Admin panel e app add/edit/delete korle auto Google Sheet e save hobe, store e sathe sathe dekhabe.
