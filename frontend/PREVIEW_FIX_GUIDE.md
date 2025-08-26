# 🔧 Preview Fix Guide - Step by Step

## Current Status

- ✅ `npm run dev` works (development server)
- ❌ `npm run preview` shows blank screen (production preview)
- ✅ Build completes successfully (dist/ folder exists)
- ✅ Environment file created

## Most Likely Solutions (Try in Order)

### 1. 🔄 Rebuild After Base Path Change

Since we added `base: './'` to vite.config.ts, you need to rebuild:

```bash
cd frontend
npm run build
npm run preview
```

### 2. 🌐 Check Browser Console

When running `npm run preview`:

1. Open browser (usually http://localhost:4173)
2. Press F12 to open Developer Tools
3. Check **Console** tab for JavaScript errors
4. Check **Network** tab for failed requests (red entries)

### 3. 🧪 Use Debug Test Page

Navigate to: `http://localhost:4173/debug-preview.html`
This will show you exactly what's failing.

### 4. 📁 Try Alternative Preview Method

```bash
cd frontend/dist
npx serve . -p 3000
```

Then open: http://localhost:3000

### 5. 🔧 Environment Variables Fix

Make sure the `.env` file exists and rebuild:

```bash
# Check if .env exists
ls -la .env

# If missing, copy from sample
cp .env.sample .env

# Rebuild
npm run build
npm run preview
```

### 6. 🎯 Base Path Alternative

If the relative path doesn't work, try absolute path in `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/', // Change from './' to '/'
  // ... rest of config
});
```

Then rebuild: `npm run build && npm run preview`

### 7. 🔍 Manual Asset Check

Check if assets exist and are accessible:

```bash
# Check if files exist
ls -la dist/css/
ls -la dist/js/

# Check file sizes (should not be 0)
du -h dist/css/*
du -h dist/js/*
```

### 8. 🚀 Port Conflict Fix

Try different port:

```bash
npm run preview -- --port 4174
```

## Expected Results

### ✅ When Working Correctly:

- Preview server starts: "Local: http://localhost:4173/"
- Browser shows the full application
- All styling and functionality works
- No console errors

### ❌ Common Error Patterns:

- **Blank white screen**: Usually asset loading issues
- **"Cannot GET /"**: Base path configuration problem
- **Styled but no functionality**: JavaScript loading issues
- **Console errors about modules**: Build or import issues

## Quick Diagnostic Commands

```bash
# 1. Check build output
ls -la dist/

# 2. Check asset file sizes
du -h dist/css/* dist/js/*

# 3. Test with simple server
cd dist && python -m http.server 3000

# 4. Check vite config
grep -n "base:" vite.config.ts
```

## Next Steps

1. Try solution #1 first (rebuild after base path change)
2. If still blank, check browser console (solution #2)
3. Use the debug page (solution #3) to identify the exact issue
4. Report back what you see in the console or debug page

The most common cause is that the build needs to be regenerated after the `base: './'` configuration change.
