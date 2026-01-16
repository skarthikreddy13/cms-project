# Deployment Guide

This guide covers deploying your CMS to production using free/low-cost platforms.

## 🎯 Recommended Stack (All Free Tier)

- **Database**: Railway.app PostgreSQL (500 hours/month free)
- **Backend + Worker**: Railway.app (500 hours/month free)
- **Frontend**: Vercel (Unlimited free for personal projects)

## 📋 Pre-Deployment Checklist

- [ ] Code pushed to GitHub repository
- [ ] Environment variables ready
- [ ] Strong SECRET_KEY generated (min 32 characters)
- [ ] Database backup strategy planned

---

## 🚂 Railway.app Deployment (Recommended)

### Step 1: Deploy PostgreSQL Database

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click "New Project"
3. Select "Deploy PostgreSQL"
4. Once deployed, go to the "Connect" tab
5. Copy the "PostgreSQL Connection URL" - you'll need this

### Step 2: Deploy Backend API

1. In the same Railway project, click "New Service"
2. Select "GitHub Repo"
3. Choose your repository
4. Click "Add Variables" and add:
   ```
   DATABASE_URL=<paste from Step 1>
   SECRET_KEY=<generate 32+ char random string>
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```
5. Under "Settings" → "Root Directory", set: `backend`
6. Under "Settings" → "Deploy", set Build command: `pip install -r requirements.txt`
7. Set Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
8. Click "Deploy"
9. Once deployed, copy the public URL (e.g., `https://your-backend.railway.app`)

### Step 3: Deploy Worker

1. In the same Railway project, click "New Service"
2. Select "GitHub Repo" (same repository)
3. Add the SAME environment variables as Step 2
4. Under "Settings" → "Root Directory", set: `backend`
5. Under "Settings" → "Deploy", set Start command: `python worker.py`
6. Click "Deploy"

### Step 4: Run Seed Data (One-time)

1. In the backend service, go to "Settings" tab
2. Click "Deploy" section
3. Under "Custom Start Command", temporarily set: `python seed.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Redeploy
5. Once deployed, change it back to: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

OR use Railway CLI:
```bash
railway login
railway link <your-project-id>
railway run python backend/seed.py
```

### Step 5: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - Framework Preset: Create React App
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `build`
5. Add Environment Variable:
   ```
   REACT_APP_API_URL=<backend URL from Step 2>
   ```
6. Click "Deploy"
7. Copy your frontend URL (e.g., `https://your-app.vercel.app`)

---

## 🎨 Render.com Alternative

### Deploy Database
1. New → PostgreSQL
2. Name: cms-db
3. Copy Internal Database URL

### Deploy Backend
1. New → Web Service
2. Connect repository
3. Root Directory: `backend`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Environment Variables: (same as Railway)
7. Deploy

### Deploy Worker
1. New → Background Worker
2. Connect repository
3. Root Directory: `backend`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `python worker.py`
6. Environment Variables: (same as backend)
7. Deploy

### Deploy Frontend
1. New → Static Site
2. Connect repository
3. Root Directory: `frontend`
4. Build Command: `npm run build`
5. Publish Directory: `build`
6. Environment Variable: `REACT_APP_API_URL`
7. Deploy

---

## 🔧 Environment Variables

### Backend/Worker
```env
DATABASE_URL=postgresql://user:pass@host:port/dbname
SECRET_KEY=your-secret-key-minimum-32-characters-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend
```env
REACT_APP_API_URL=https://your-backend-url.com
```

### Generating SECRET_KEY

**Python:**
```python
import secrets
print(secrets.token_urlsafe(32))
```

**OpenSSL:**
```bash
openssl rand -base64 32
```

**Online:**
https://generate-secret.vercel.app/32

---

## 🗄️ Database Migrations (Future Updates)

If you modify database models:

1. Install Alembic in backend:
   ```bash
   pip install alembic
   alembic init alembic
   ```

2. Configure `alembic/env.py`:
   ```python
   from app.models.models import Base
   target_metadata = Base.metadata
   ```

3. Create migration:
   ```bash
   alembic revision --autogenerate -m "description"
   ```

4. Apply migration:
   ```bash
   alembic upgrade head
   ```

For Railway, run migrations in the deploy settings or use Railway CLI.

---

## 🔐 Security Checklist

- [ ] Strong SECRET_KEY (32+ characters, random)
- [ ] DATABASE_URL uses SSL in production
- [ ] CORS configured for your frontend domain only
- [ ] No sensitive data in repository
- [ ] Environment variables not in code
- [ ] Regular database backups enabled
- [ ] HTTPS enabled (automatic on Vercel/Railway)

---

## 📊 Monitoring

### Railway Logs
```bash
railway logs --service backend
railway logs --service worker
```

### Check Health
```bash
curl https://your-backend.railway.app/health
```

### Database Metrics
- Railway dashboard shows:
  - Active connections
  - Storage usage
  - Query performance

---

## 🔄 Updating the Deployment

### Code Updates
1. Push to GitHub main branch
2. Vercel auto-deploys frontend
3. Railway auto-deploys backend/worker

### Environment Variable Updates
1. Go to service settings
2. Update variables
3. Manually trigger redeploy if needed

### Database Updates
1. Backup database first
2. Run migrations
3. Test in staging environment if possible

---

## 💰 Cost Estimates

### Free Tier Limits

**Railway:**
- 500 execution hours/month
- $5 credit/month
- Shared CPU/RAM
- Good for: Development, small projects

**Vercel:**
- Unlimited deployments
- 100GB bandwidth/month
- Good for: Any project size

**Render.com:**
- 750 hours/month per service
- Spins down after 15min inactivity
- Good for: Development

### When to Upgrade

Upgrade when you exceed:
- Database: 1GB storage or 100 simultaneous connections
- Backend: High CPU usage or memory limits
- Frontend: 100GB bandwidth

---

## 🐛 Troubleshooting

**Build fails:**
- Check requirements.txt/package.json versions
- Verify Python version (3.11+)
- Check Node version (18+)

**Database connection fails:**
- Verify DATABASE_URL format
- Check SSL requirements: add `?sslmode=require`
- Verify network access in Railway settings

**Frontend can't reach API:**
- Check REACT_APP_API_URL is correct
- Verify CORS settings in backend
- Check browser console for errors

**Worker not running:**
- Check service is running in Railway dashboard
- View worker logs
- Verify DATABASE_URL is set

---

## 📝 Post-Deployment Tasks

1. **Test all features:**
   - Login with all 3 roles
   - Create/edit programs
   - Schedule a lesson
   - Verify worker publishes it
   - Check public catalog API

2. **Update README with URLs:**
   - Frontend URL
   - Backend URL
   - API docs URL

3. **Setup monitoring:**
   - Configure alerts for downtime
   - Set up error tracking (Sentry optional)
   - Monitor database performance

4. **Document for team:**
   - Share demo credentials
   - Provide deployment guide
   - Set up team access

---

## 🚀 Quick Deploy Commands

### Railway CLI
```bash
# Install
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up

# View logs
railway logs

# Run seed
railway run python backend/seed.py
```

### Vercel CLI
```bash
# Install
npm install -g vercel

# Deploy
cd frontend && vercel

# Production
cd frontend && vercel --prod
```

---

## 📞 Support Resources

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs
- FastAPI Docs: https://fastapi.tiangolo.com
- React Docs: https://react.dev

---

**Remember**: Always test in development before deploying to production!
