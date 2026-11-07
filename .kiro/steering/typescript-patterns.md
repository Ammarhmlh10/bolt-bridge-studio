---
inclusion: fileMatch
fileMatchPattern: "*.ts,*.tsx"
description: TypeScript and JavaScript patterns for SmartHoop project
---

# TypeScript/JavaScript Patterns

> Project-specific patterns for SmartHoop (React/Expo mobile app)

## Project Structure

This is an Arabic RTL mobile-first app. Key patterns:

- **app/** - Expo/React Native pages (tabs navigation)
- **components/** - Reusable UI components
- **lib/** - Business logic (Supabase client, auth, API calls)
- **hooks/** - Custom React hooks
- **supabase/** - Database migrations and Edge Functions

## API Response Format

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}
```

## Supabase Client Pattern

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
)
```

## Auth Pattern

```typescript
// Use Supabase Auth with Expo
const { data: { session } } = await supabase.auth.getSession()
```

## RTL Support

- Use `I18nManager.forceRTL(true)` for Arabic
- All text should be in Arabic
- Use `textAlign: 'right'` for RTL layouts