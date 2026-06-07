# Vibe-Cast React Frontend

Modern learning platform frontend built with React 18, TypeScript, Tailwind CSS, and React Query.

## Project Structure

```
src/web/
├── api/                 # API client and service functions
│   ├── client.ts       # Axios instance with interceptors
│   ├── learning.ts     # Learning domain endpoints
│   ├── certification.ts # Certification domain endpoints
│   └── community.ts    # Community domain endpoints
├── auth/               # Authentication
│   └── AuthContext.tsx # Supabase auth context
├── components/         # Reusable components
│   ├── common/        # Header, Sidebar, Footer
│   ├── learner/       # Profile cards, badges, progress
│   └── forms/         # Enrollment, exam forms
├── config/            # Configuration
│   └── constants.ts   # API URLs, cache durations, routes
├── hooks/             # Custom React hooks
│   ├── useQuery.ts    # Query client wrapper
│   ├── useLearnerProfile.ts
│   └── useEnrollment.ts
├── pages/             # Page components (6 main pages)
│   ├── DashboardPage.tsx
│   ├── EnrollmentPage.tsx
│   ├── ExamPage.tsx
│   ├── BadgesPage.tsx
│   ├── LeaderboardPage.tsx
│   └── ProfilePage.tsx
├── styles/            # Global CSS
│   └── globals.css
├── types/             # TypeScript interfaces
│   └── index.ts
├── App.tsx            # Router setup
└── main.tsx           # React entry point
```

## Core Features

### 1. Authentication
- Supabase Auth integration
- Protected routes
- Session management
- Automatic 401 error handling

### 2. State Management
- React Query for server state
- Local state with React hooks
- Optimistic updates
- Automatic cache invalidation

### 3. API Integration
- Axios HTTP client
- Request interceptors (API key injection)
- Response interceptors (error handling, retry logic)
- Typed API responses

### 4. Pages

#### Dashboard
- Learner profile with stats
- Active enrollments with progress
- Quick action buttons
- Recent activity feed

#### Enrollments
- Browse available certifications
- Filter by difficulty and domain
- Create new enrollments
- Track active enrollments
- View completed certifications

#### Exam
- Question-by-question exam interface
- Multiple choice questions
- Timer countdown
- Progress tracking
- Answer review
- Results page with score

#### Badges
- Display earned badges
- Filter by skill
- Badge detail modal
- Share functionality
- Difficulty indicators

#### Leaderboard
- Top 10 learners ranking
- Reputation score sorting
- User hover cards
- Current user highlighting
- Pagination support

#### Profile
- Display name (editable)
- Bio (editable)
- Email (read-only)
- Account statistics
- Settings (notifications, 2FA)
- Logout functionality

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Environment variables configured

### Installation

```bash
# Install dependencies
npm install

# Create .env.local from example
cp .env.local.example .env.local

# Configure your environment
# Edit .env.local with your Supabase credentials
```

### Development

```bash
# Start dev server
npm run dev

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Type check
npm run type-check

# Format code
npm run format
```

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration

### Environment Variables

Create `.env.local`:

```
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### API Configuration

- Base URL: `http://localhost:3000/api/v1`
- Timeout: 30 seconds
- Retry: 2 attempts on failure
- Cache Duration:
  - Short: 1 minute
  - Medium: 5 minutes
  - Long: 10 minutes

## Component System

### Layout Components
- `Header`: Navigation, user menu
- `Sidebar`: Navigation links, collapsible
- `Footer`: Copyright, links, social media

### Learner Components
- `LearnerCard`: Profile snapshot with stats
- `ProgressBar`: Linear or circular progress visualization
- `BadgesList`: Grid of earned badges

### Form Components
- `EnrollmentForm`: Certification selection, terms agreement
- `ExamForm`: Question display, timer, answer tracking

## Testing

### Test Structure

```
tests/web/
├── api.test.ts          # API client tests
├── components.test.tsx  # Component rendering
├── hooks.test.tsx      # Custom hooks
└── pages.test.tsx      # Page integration
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- api.test.ts

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### Test Coverage Targets
- Unit tests: 80%+
- Integration tests: 70%+
- Page tests: 60%+

## Performance Optimization

### Implemented Optimizations
1. **Code Splitting**: Route-based splitting with React Router
2. **Image Optimization**: Lazy loading, responsive images
3. **Cache Strategy**: React Query with configurable stale times
4. **Bundle Optimization**: Tree shaking, minification
5. **Lazy Loading**: Components loaded on demand

### Performance Metrics
- Initial Load: < 3s
- Largest Contentful Paint: < 2.5s
- First Input Delay: < 100ms
- Cumulative Layout Shift: < 0.1

## Accessibility

- ✅ WCAG 2.1 Level AA compliance
- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ Color contrast ratios met
- ✅ Form labels and ARIA attributes
- ✅ Focus management

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Security

- ✅ HTTPS only (production)
- ✅ Secure API key handling
- ✅ CSRF protection (via Supabase)
- ✅ XSS prevention (via React)
- ✅ Input validation (Zod schemas)
- ✅ Content Security Policy

## Deployment

### Vercel

```bash
# Deploy to Vercel
vercel deploy

# Production
vercel deploy --prod
```

### Environment Setup

```
Production:
  VITE_API_URL=https://api.vibe-cast.com
  VITE_SUPABASE_URL=https://[project].supabase.co
  VITE_SUPABASE_ANON_KEY=[key]
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check API key in localStorage
   - Verify Supabase session
   - Clear auth cache

2. **CORS Errors**
   - Ensure API server has CORS enabled
   - Check allowed origins
   - Verify API URL in env

3. **Blank Page**
   - Check browser console for errors
   - Verify Supabase credentials
   - Clear cache and reload

## Contributing

1. Follow existing code style
2. Write tests for new features
3. Update documentation
4. Use semantic commits

## License

MIT - See LICENSE file
