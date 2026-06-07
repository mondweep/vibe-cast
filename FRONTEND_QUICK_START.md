# Vibe-Cast Frontend - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Start Dev Server
```bash
npm run dev
```

Open http://localhost:5173 in browser

---

## 📦 Project Structure

```
vibe-cast/
├── src/web/                 # Frontend source
│   ├── pages/              # 6 core pages
│   ├── components/         # Layout, learner, forms
│   ├── api/               # HTTP client + services
│   ├── hooks/             # Custom React hooks
│   ├── auth/              # Supabase Auth
│   ├── types/             # TypeScript interfaces
│   ├── config/            # Constants
│   ├── styles/            # Tailwind CSS
│   ├── App.tsx            # Router
│   └── main.tsx           # Entry point
├── tests/web/              # Test files
├── package.json            # Dependencies
├── vite.config.ts         # Vite config
├── tsconfig.json          # TypeScript config
├── tailwind.config.js     # Tailwind config
└── index.html             # HTML entry point
```

---

## 🎯 Key Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:5173)
npm run build           # Build for production
npm run preview         # Preview production build

# Testing
npm run test            # Run tests
npm run test:ui         # Visual test runner
npm run test:coverage   # Coverage report

# Quality
npm run type-check      # Check TypeScript
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
```

---

## 🔗 API Integration

### Mock API Responses

The frontend expects these endpoints:

```
POST /api/v1/learning/enrollments
GET  /api/v1/learning/learners/{id}/profile
POST /api/v1/learning/enrollments/{id}/complete

POST /api/v1/certification/badges/issue
GET  /api/v1/certification/learners/{id}/progress
POST /api/v1/certification/exams/submit

GET  /api/v1/community/members/{id}/profile
GET  /api/v1/community/leaderboard
```

### Testing Without Backend

Mock API responses using Vitest + MSW:

```bash
npm install -D msw @mswjs/http-handler

# Create MSW handlers in tests/web/mocks/handlers.ts
# Setup in tests/web/setup.ts
```

---

## 🎨 Component Guide

### Pages
- **DashboardPage** - Profile, stats, enrollments
- **EnrollmentPage** - Browse certifications
- **ExamPage** - Take timed exam
- **BadgesPage** - View earned badges
- **LeaderboardPage** - Ranking table
- **ProfilePage** - Edit profile, settings

### Components
- **Header** - Top navigation
- **Sidebar** - Left navigation menu
- **Footer** - Bottom links
- **LearnerCard** - Profile snapshot
- **ProgressBar** - Linear/circular progress
- **BadgesList** - Badge grid
- **EnrollmentForm** - Create enrollment
- **ExamForm** - Take exam

---

## 🔑 Environment Variables

```bash
# Required
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional
VITE_ENABLE_WEBSOCKETS=false
VITE_ENABLE_ANALYTICS=true
```

---

## 📁 File Organization Best Practices

### Adding a New Page
```bash
# 1. Create page component
src/web/pages/NewPage.tsx

# 2. Add route in App.tsx
<Route path="/newpage" element={...} />

# 3. Add navigation link in Header/Sidebar
```

### Adding a New Component
```bash
# 1. Create component
src/web/components/category/NewComponent.tsx

# 2. Export in pages that use it
import { NewComponent } from '@/components/category/NewComponent'

# 3. Add tests
tests/web/components.test.tsx
```

### Adding API Endpoints
```bash
# 1. Add function in service file
src/web/api/domain.ts
export async function newEndpoint() { ... }

# 2. Create hook
src/web/hooks/useNewEndpoint.ts
export function useNewEndpoint() { ... }

# 3. Use in component
const { data } = useNewEndpoint()
```

---

## 🧪 Testing Examples

### Test a Component
```typescript
import { render, screen } from '@testing-library/react'
import { MyComponent } from '@/components/MyComponent'

it('should render', () => {
  render(<MyComponent />)
  expect(screen.getByText('text')).toBeInTheDocument()
})
```

### Test a Hook
```typescript
import { renderHook } from '@testing-library/react'
import { useMyHook } from '@/hooks/useMyHook'

it('should fetch data', () => {
  const { result } = renderHook(() => useMyHook())
  expect(result.current.data).toBeDefined()
})
```

### Test API
```typescript
import { learningApi } from '@/api/learning'

it('should create enrollment', async () => {
  const enrollment = await learningApi.createEnrollment('id', 'cert-id')
  expect(enrollment.id).toBeDefined()
})
```

---

## 🐛 Troubleshooting

### "Cannot find module '@/...'"
Check path aliases in `tsconfig.json` and `vite.config.ts`

### "API 404 errors"
Ensure backend is running on http://localhost:3000

### "Supabase auth not working"
Check .env.local has correct SUPABASE_URL and ANON_KEY

### "Tests failing"
Run `npm install` to ensure all test dependencies installed

### "Port 5173 already in use"
Kill process: `lsof -ti:5173 | xargs kill -9`

---

## 📚 Documentation

- **Full Docs**: `src/web/README.md`
- **Implementation Summary**: `FRONTEND_IMPLEMENTATION_SUMMARY.md`
- **API Spec**: `docs/API.md` (backend)
- **Type Definitions**: `src/web/types/index.ts`

---

## 🚀 Deployment

### Deploy to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Production
vercel --prod
```

### Environment for Production
```
VITE_API_URL=https://api.vibe-cast.com
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[production-key]
```

---

## 💡 Tips

1. **Use React Query DevTools** for debugging queries
   ```bash
   npm install @tanstack/react-query-devtools
   ```

2. **Check TypeScript errors** before running
   ```bash
   npm run type-check
   ```

3. **Format code before commit**
   ```bash
   npm run format
   ```

4. **Test coverage target**: 70%+
   ```bash
   npm run test:coverage
   ```

---

## 📞 Quick Links

- Frontend README: `src/web/README.md`
- API Services: `src/web/api/`
- Page Components: `src/web/pages/`
- Type Definitions: `src/web/types/index.ts`
- Tests: `tests/web/`

---

**Ready to start?** Run `npm install && npm run dev` and open http://localhost:5173! 🎉
