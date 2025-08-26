# 🔍 Preview Server Troubleshooting Guide

## Issue

- `npm run dev` works correctly ✅
- `npm run preview` shows blank page ❌

## Diagnosis Steps

### 1. Check Build Output

The build appears to complete successfully:

- ✅ `dist/` directory exists
- ✅ `dist/index.html` is generated
- ✅ CSS files in `dist/css/`
- ✅ JS files in `dist/js/`

### 2. Potential Causes

#### A. Asset Path Issues

The preview server might be serving assets from wrong paths. Check:

- Are assets loading with correct URLs?
- Is the base path configured correctly?

#### B. JavaScript Errors

The app might be failing to initialize in production mode:

- Check browser console for errors
- Verify all dependencies are properly bundled

#### C. Environment Variables

Production build might be missing required environment variables:

- Check if `.env` files are properly configured
- Verify environment validation in `main.tsx`

### 3. Quick Fixes to Try

#### Fix 1: Add Base Path Configuration

Add to `vite.config.ts`:

```typescript
export default defineConfig({
  base: './', // Use relative paths
  // ... rest of config
});
```

#### Fix 2: Check Console Errors

When running `npm run preview`:

1. Open browser developer tools
2. Check Console tab for JavaScript errors
3. Check Network tab for failed asset requests

#### Fix 3: Verify Environment

Create a minimal `.env` file:

```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

#### Fix 4: Rebuild with Debug

Try rebuilding with more verbose output:

```bash
npm run build -- --mode production --debug
```

### 4. Alternative Preview Methods

#### Method 1: Use Simple HTTP Server

```bash
cd dist
python -m http.server 3000
# or
npx serve .
```

#### Method 2: Use Different Port

```bash
npm run preview -- --port 4174
```

### 5. Expected Behavior

When `npm run preview` works correctly:

- Server starts on http://localhost:4173
- Application loads with all styling
- All functionality works as in development

## Next Steps

1. Check browser console for errors
2. Try the base path fix
3. Verify environment variables
4. Test with alternative preview methods
