# Deploying Dawn

There are three ways to put Dawn online. Pick the one that fits.

| Option | Where | Data is saved | Effort |
|---|---|---|---|
| A. claude.ai link | Already live | In your claude.ai account, synced across devices | Nothing to do |
| B. Frontend only | Vercel | In each browser (use the backup button) | About 5 minutes |
| C. Full stack | Vercel + PythonAnywhere | In the Flask/SQLite backend, synced everywhere | About 30 minutes |

Option C is the one to show recruiters: a live React app talking to your own Python API.

---

## Step 0: Put the code on GitHub

```bash
cd dawn-habit-tracker
git init
git add .
git commit -m "Dawn habit tracker: React + Flask"
# Create an empty repo called dawn-habit-tracker on github.com, then:
git remote add origin https://github.com/<your-username>/dawn-habit-tracker.git
git branch -M main
git push -u origin main
```

`.gitignore` already keeps `.env`, `node_modules`, `.venv` and the database out of Git.

---

## Option B: Frontend only on Vercel

1. Go to vercel.com and sign in with GitHub.
2. Click **Add New → Project** and import `dawn-habit-tracker`.
3. Set **Root Directory** to `frontend`. The framework should be detected as **Vite**.
4. Leave **Environment Variables** empty. With no `VITE_API_URL`, the production build runs without a server and saves everything in the browser.
5. Click **Deploy**. Your site is at `https://dawn-habit-tracker-<something>.vercel.app`.

---

## Option C: Full stack

### C1. Backend on PythonAnywhere (free)

The free account gives you one web app at `<username>.pythonanywhere.com` and 512 MB of disk. Your SQLite file lives on that disk, so data survives restarts. Free web apps expire after a month unless you click **Run until 1 month from today** on the Web tab, so set a monthly reminder in Dawn itself.

1. Sign up at pythonanywhere.com (Beginner, free).
2. Open a **Bash console** and run:
   ```bash
   git clone https://github.com/<your-username>/dawn-habit-tracker.git
   cd dawn-habit-tracker/backend
   python3.11 -m venv ~/.venvs/dawn
   source ~/.venvs/dawn/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   nano .env
   ```
   In `.env`, set:
   ```
   DATABASE_PATH=instance/dawn.sqlite3
   CORS_ORIGINS=https://<your-vercel-app>.vercel.app
   API_TOKEN=<a long random string, e.g. from: python3 -c "import secrets; print(secrets.token_urlsafe(32))">
   ```
3. Go to the **Web** tab and click **Add a new web app**. Choose **Manual configuration** and **Python 3.11**.
4. On the Web tab:
   - **Virtualenv:** `/home/<username>/.venvs/dawn`
   - **WSGI configuration file:** click it, delete everything, and paste:
     ```python
     import sys
     sys.path.insert(0, "/home/<username>/dawn-habit-tracker/backend")
     from wsgi import application  # noqa
     ```
5. Click **Reload**, then open `https://<username>.pythonanywhere.com/api/health`. It should say `{"status": "ok"}`.

To update the backend later, run `cd ~/dawn-habit-tracker && git pull` in a console, then click **Reload**.

### C2. Frontend on Vercel

Follow Option B, but set these environment variables instead:

```
VITE_API_URL=https://<username>.pythonanywhere.com
VITE_API_TOKEN=<the same API_TOKEN as the backend>
```

`VITE_` variables are baked in at build time, so after changing them click **Redeploy** in Vercel.

### C3. Check it works

- The header shows **Synced**.
- Tick something, reload the page on your phone, and it's there.
- The Week tab shows charts. These come from the Python report endpoints.

### Troubleshooting

| Problem | Fix |
|---|---|
| Header says "Offline" | Check `VITE_API_URL` (no trailing slash) and that `/api/health` loads. |
| Browser console shows a CORS error | `CORS_ORIGINS` in the backend `.env` must exactly match your Vercel URL, with `https://` and no trailing slash. Click Reload after editing. |
| 401 Unauthorized | `VITE_API_TOKEN` and `API_TOKEN` don't match. Redeploy Vercel after fixing. |
| The site stopped working after a month | Log in to PythonAnywhere and extend the web app on the Web tab. |

---

## About the API token

The token keeps strangers from writing to your API, but it ships inside the frontend bundle, so it isn't real security. That's fine for a personal app. Add a proper login (for example JWT, as in Full Stack Open Part 4) before letting other people use it. That's also a good portfolio upgrade.
