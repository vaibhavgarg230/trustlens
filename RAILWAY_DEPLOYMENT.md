# Railway Deployment Guide for TrustLens

This guide will help you deploy TrustLens on Railway platform.

## 📋 Prerequisites

1. Railway account (sign up at https://railway.app)
2. GitHub account with your repository
3. MongoDB Atlas account (already configured)
4. Hugging Face API key (for AI features)

## 🚀 Deployment Steps

### Step 1: Connect Repository to Railway

1. Go to https://railway.app and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select repository: `vaibhavgarg230/trustlens`

### Step 2: Deploy Backend Service

1. In your Railway project, click **"New Service"**
2. Select **"GitHub Repo"** → Choose your repository
3. Railway will detect the repository
4. Click on the service → Go to **"Settings"**
5. Set **Root Directory** to: `backend`
6. Go to **"Variables"** tab and add:

```
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secure_jwt_secret_key_here
PORT=3001
FRONTEND_URL=https://your-frontend-app.railway.app
HUGGINGFACE_API_KEY=your_huggingface_api_key
```

7. Railway will automatically detect Node.js and start building
8. Wait for deployment to complete
9. Copy the generated URL (e.g., `trustlens-backend.railway.app`)

### Step 3: Deploy Frontend Service

1. In the same Railway project, click **"New Service"** again
2. Select **"GitHub Repo"** → Choose the same repository
3. Click on the service → Go to **"Settings"**
4. Set **Root Directory** to: `frontend`
5. Go to **"Variables"** tab and add:

```
REACT_APP_API_URL=https://your-backend-app.railway.app/api
PORT=3000
```

**Important:** Replace `your-backend-app.railway.app` with the actual backend URL from Step 2.

6. Railway will automatically detect React and start building
7. Wait for deployment to complete
8. Copy the generated frontend URL

### Step 4: Update Backend CORS

1. Go back to your **Backend Service** in Railway
2. Go to **"Variables"** tab
3. Update `FRONTEND_URL` with your actual frontend Railway URL:
   ```
   FRONTEND_URL=https://your-frontend-app.railway.app
   ```
4. Railway will automatically redeploy

### Step 5: Seed Admin User

After backend is deployed, you need to seed the admin user:

1. Go to your **Backend Service** in Railway
2. Click on **"Deployments"** tab
3. Click on the latest deployment
4. Click **"View Logs"**
5. Or use Railway CLI:
   ```bash
   railway login
   railway link
   railway run --service backend node seedAdmin.js
   ```

Alternatively, you can use Railway's web terminal:
1. Go to Backend Service → **"Settings"** → **"Generate Domain"**
2. Use Railway's web terminal or connect via SSH

### Step 6: Verify Deployment

1. **Backend Health Check:**
   - Visit: `https://your-backend-app.railway.app/api/users`
   - Should return JSON array of users

2. **Frontend Check:**
   - Visit: `https://your-frontend-app.railway.app`
   - Should load the TrustLens homepage

3. **Test Admin Login:**
   - Go to Admin Login page
   - Use credentials:
     - Email: `admin@trustlens.com`
     - Password: `admin123`

## 🔧 Environment Variables Reference

### Backend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/trustlens` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-super-secret-key-here` |
| `PORT` | Server port (Railway sets this automatically) | `3001` |
| `FRONTEND_URL` | Frontend application URL | `https://trustlens-frontend.railway.app` |
| `HUGGINGFACE_API_KEY` | Hugging Face API key for AI features | `hf_xxxxxxxxxxxxx` |

### Frontend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `https://trustlens-backend.railway.app/api` |
| `PORT` | Port for static server (Railway sets this) | `3000` |

## 📝 Important Notes

1. **Auto-Deploy:** Railway automatically deploys when you push to the main branch
2. **Custom Domains:** You can add custom domains in Railway settings
3. **Logs:** View logs in Railway dashboard → Service → Deployments → View Logs
4. **Environment Variables:** Always set sensitive variables in Railway dashboard, never commit them
5. **MongoDB Atlas:** Ensure your MongoDB Atlas allows connections from Railway IPs (0.0.0.0/0 for testing)

## 🔍 Troubleshooting

### Build Fails
- Check logs in Railway dashboard
- Verify all dependencies are in `package.json`
- Ensure Node.js version is compatible (Railway uses latest LTS)

### CORS Errors
- Verify `FRONTEND_URL` in backend matches actual frontend URL
- Check that frontend URL doesn't have trailing slash
- Ensure CORS middleware is properly configured

### Database Connection Issues
- Verify MongoDB Atlas connection string is correct
- Check MongoDB Atlas Network Access allows Railway IPs
- Ensure database user has proper permissions

### Frontend Can't Connect to Backend
- Verify `REACT_APP_API_URL` is set correctly
- Check backend is deployed and running
- Ensure backend URL doesn't have `/api` in `REACT_APP_API_URL` (it's added automatically)

### Admin Login Not Working
- Run `seedAdmin.js` script to create admin user
- Check backend logs for authentication errors
- Verify JWT_SECRET is set correctly

## 🎯 Quick Deployment Checklist

- [ ] Railway account created
- [ ] Repository connected to Railway
- [ ] Backend service created with root directory `backend`
- [ ] Backend environment variables set
- [ ] Backend deployed successfully
- [ ] Frontend service created with root directory `frontend`
- [ ] Frontend environment variables set (with backend URL)
- [ ] Frontend deployed successfully
- [ ] Backend `FRONTEND_URL` updated with frontend URL
- [ ] Admin user seeded
- [ ] Tested admin login
- [ ] Tested customer/vendor login
- [ ] Verified API endpoints working

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord Community](https://discord.gg/railway)
- [MongoDB Atlas Setup](https://www.mongodb.com/docs/atlas/getting-started/)

## 🎉 Success!

Once deployed, your TrustLens application will be live at:
- **Frontend:** `https://your-frontend-app.railway.app`
- **Backend API:** `https://your-backend-app.railway.app/api`

Happy deploying! 🚀

