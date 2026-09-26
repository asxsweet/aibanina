# Наше созвездие — деплой нұсқаулығы (Render + Vercel)

Бұл жоба екі бөліктен тұрады, сондықтан екі бөлек платформаға шығарамыз:

- **Backend** (`server.ts`) — Express + MongoDB (Mongoose) API сервері. Тек прогрессті (стрик, күндер, тема) сақтау/оқу үшін керек. → **Render**-ге шығарамыз.
- **Frontend** (`src/`) — React + Vite статикалық сайт. → **Vercel**-ге шығарамыз.

Екеуі бір-бірімен REST API арқылы сөйлеседі (`/api/progress`), сондықтан **бэкенд бірінші деплой болу керек** — оның URL-і фронтендке керек болады.

---

## 0-қадам. Дайындық (бір рет жасалады)

1. Жобаны GitHub-қа жүкте (Render мен Vercel екеуі де GitHub репозиторийінен тікелей деплой жасайды).
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<сенің-юзернейм>/<репо-аты>.git
   git push -u origin main
   ```
2. MongoDB Atlas-та тегін кластер жасап ал (егер әлі жоқ болса): https://www.mongodb.com/cloud/atlas/register
   - Database Access → жаңа пайдаланушы жасап, пароль қой.
   - Network Access → **Allow access from anywhere** (`0.0.0.0/0`) — Render-нің IP-і тұрақты болмайтындықтан осылай қою керек.
   - Cluster → **Connect** → **Drivers** түймесін бас, `mongodb+srv://...` форматындағы connection string-ті көшіріп ал. Бұл кейін `MONGODB_URI` болады.

Код жағынан ешнәрсе қосымша істеудің қажеті жоқ — жобада бэкенд пен фронтенд қазірдің өзінде бөлек жұмыс істейтіндей етіп бөлінген (`npm run build` — тек фронтенд, `npm run build:server` — тек бэкенд).

---

## 1-қадам. Backend-ті Render-ге шығару

1. https://dashboard.render.com → **New +** → **Web Service**.
2. GitHub репозиторийіңді байлан (тұңғыш рет байласаң, Render GitHub-қа рұқсат сұрайды — рұқсат бер).
3. Репозиторийді таңда, келесі баптауларды енгіз:

   | Өріс | Мән |
   |---|---|
   | **Name** | `nashe-sozvezdie-api` (немесе өз атың) |
   | **Region** | өзіңе жақынын таңда |
   | **Branch** | `main` |
   | **Root Directory** | (бос қалдыр — жоба түбірінде) |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install && npm run build:server` |
   | **Start Command** | `npm start` |
   | **Instance Type** | `Free` (сынау үшін жеткілікті) |

4. **Environment Variables** бөліміне төмендегілерді қос (Add Environment Variable):

   | Key | Value |
   |---|---|
   | `MONGODB_URI` | Atlas-тан алған connection string (0-қадамда) |
   | `CORS_ORIGIN` | әзірге `*` қой — Vercel-ге деплой болғаннан кейін нақты доменге ауыстырамыз (3-қадамды қара) |
   | `NODE_ENV` | `production` |

5. **Create Web Service** түймесін бас. Render автоматты түрде `npm install && npm run build:server` жіберіп, `npm start`-пен серверді іске қосады. Логтарда мынау шығуы керек:
   ```
   ✅ Успешное подключение к базе данных MongoDB!
   🚀 API-сервер (backend) запущен на http://localhost:10000
   ```
6. Деплой аяқталған соң Render саған мына түрдегі URL береді:
   ```
   https://nashe-sozvezdie-api.onrender.com
   ```
   **Осы URL-ді сақтап қой** — 2-қадамда керек болады.
7. Тексеру: браузерде `https://nashe-sozvezdie-api.onrender.com/api/health` ашсаң, мынадай JSON көрінуі керек:
   ```json
   {"status":"ok","mongoConnected":true,"timestamp":"..."}
   ```
   `mongoConnected: false` болса — `MONGODB_URI` дұрыс қойылмаған немесе Atlas-тың Network Access баптауын тексер.

> ⚠️ **Ескерту (Free жоспар туралы):** Render-нің тегін жоспарында сервер 15 минут белсенді болмаса "ұйықтап қалады" және келесі сұраныста 30-50 секундқа дейін қайта оянуы мүмкін. Бұл девушкаң сайтты ашқанда алғашқы жүктелу сәл баяу болуы мүмкін дегенді білдіреді — қалыпты жағдай, қате емес.

---

## 2-қадам. Frontend-ті Vercel-ге шығару

1. https://vercel.com/new → GitHub репозиторийіңді таңда → **Import**.
2. Vercel Vite жобасын автоматты түрде таниды, дегенмен тексеріп қой:

   | Өріс | Мән |
   |---|---|
   | **Framework Preset** | `Vite` (автоматты анықталады) |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |
   | **Install Command** | `npm install` |

3. **Environment Variables** бөліміне қос:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | 1-қадамда алған Render URL-і, мысалы `https://nashe-sozvezdie-api.onrender.com` (соңында `/` **қоймай**) |

4. **Deploy** түймесін бас. Бірнеше минуттан кейін Vercel саған домен береді:
   ```
   https://nashe-sozvezdie.vercel.app
   ```

---

## 3-қадам. CORS-ты нақтылау (маңызды!)

Backend-ті 1-қадамда `CORS_ORIGIN=*` етіп қойған едік — бұл сынау үшін жұмыс істейді, бірақ қауіпсіздік үшін енді нақты Vercel доменіне ауыстыру керек:

1. Render Dashboard → сенің сервисің → **Environment**.
2. `CORS_ORIGIN` мәнін өзгерт:
   ```
   https://nashe-sozvezdie.vercel.app
   ```
   (Vercel әр push сайын preview-домен де жасайды, соны да қосу керек болса, үтірмен ажыратып жаз: `https://nashe-sozvezdie.vercel.app,https://nashe-sozvezdie-git-main-xxx.vercel.app`)
3. **Save Changes** — Render сервисті автоматты түрде қайта іске қосады.

---

## 4-қадам. Толық тексеру

1. `https://nashe-sozvezdie.vercel.app` ашып, тіркеліп/кіріп көр.
2. Ойынды ойнап, наградаңды ал.
3. Беттi (page) жаңарт (F5) — прогресс сақталған болу керек (стрик, күн саны өзгермеу керек).
4. Егер прогресс сақталмаса немесе консольде (F12 → Console/Network) `CORS` немесе `Failed to fetch` қатесі шықса — төмендегі "Ақаулықтарды жою" бөлімін қара.

---

## Локальде әзірлеу (development)

Локальде екі процесс те бөлек жұмыс істейді:

```bash
npm install

# 1-терминал: backend (порт 3001)
npm run dev:server

# 2-терминал: frontend (порт 5173)
npm run dev
```

`vite.config.ts`-те дайын proxy бар — локальде frontend-тен `/api/...` сұраулары автоматты түрде `http://localhost:3001`-ге бағытталады, сондықтан локальде `VITE_API_URL` қоюдың қажеті жоқ.

Локальде MongoDB-ге қосылу үшін жоба түбірінде `.env` файлын жаса (`.env.example`-ді үлгі ет):
```
MONGODB_URI="mongodb+srv://..."
```

---

## Файлдар картасы (не үшін не өзгертілді)

| Файл | Не үшін |
|---|---|
| `server.ts` | Vite/статик файл беру логикасы алынды — енді таза API сервер. CORS қосылды. `PORT`-ты Render өзі береді. |
| `package.json` | `dev`/`build` скриптері frontend/backend үшін бөлек болды (`dev:server`, `build:server`, `start`). |
| `vite.config.ts` | Локальде `/api` сұрауларын backend-ке бағыттайтын proxy қосылды. |
| `src/utils/constellationUtils.ts` | `fetch('/api/...')` → `fetch(\`\${API_BASE}/api/...\`)`, яғни `VITE_API_URL` арқылы Render URL-іне сұрау жіберетін болды. |
| `src/vite-env.d.ts` | `import.meta.env.VITE_API_URL` үшін TypeScript типі қосылды. |
| `.env.example` | Ескі AI Studio айнымалылары (Gemini) алынып тасталды, орнына `MONGODB_URI`, `CORS_ORIGIN`, `VITE_API_URL` қосылды. |
| `.gitignore` | Backend build қалдығы (`dist-server/`) қосылды. |

---

## Ақаулықтарды жою

**Сайт ашылады, бірақ прогресс сақталмайды / "Failed to fetch" қатесі**
→ `VITE_API_URL` Vercel-де дұрыс қойылғанын тексер (соңында `/` болмау керек). Өзгерткен болсаң, Vercel-де **Redeploy** жасау керек — env var өзгерісі автоматты түрде іске қосылмайды.

**Консольде "blocked by CORS policy" қатесі**
→ Render-дегі `CORS_ORIGIN` мәні нақты Vercel доменіңмен дәл сәйкес келуі керек (https:// қоса, соңында слэшсіз). Өзгерткен соң Render сервисі автоматты қайта іске қосылады, 1-2 минут күт.

**Render логында "MongoDB database not connected"**
→ `MONGODB_URI` дұрыс па тексер, Atlas-тағы Network Access-те `0.0.0.0/0` рұқсат етілгенін тексер, парольде арнайы таңба (@, /, # т.б.) болса, оны URL-encode ету керек.

**Бірінші жүктелу баяу (30-50 секунд)**
→ Render Free жоспарында қалыпты жағдай (жоғарыдағы ескертуді қара). Ақылы `Starter` жоспарға көшсең, бұл болмайды.

**Ойын/тема дизайны дұрыс көрінбейді**
→ Браузер кэшін тазала немесе Vercel-де жаңа деплой болғанын тексер (Deploymentsтізімінен).
