---
name: expo-mobile
description: Expo SDK 52+ mobile development patterns for React Native apps with Arabic RTL support. Use when building or modifying the SmartHoop mobile application.
origin: SmartHoop
---

# Expo Mobile Development

Patterns for building the SmartHoop Arabic RTL mobile app with Expo SDK 52.

## When to Activate

- Working with Expo SDK 52+ and React Native
- Building mobile-first Arabic RTL interfaces
- Using Supabase for auth and database
- Creating tab-based navigation with Expo Router
- Developing WhatsApp gateway management features

## Core Principles

### 1. Arabic RTL First

```typescript
// Set RTL in _layout.tsx
import { I18nManager } from 'react-native';

I18nManager.forceRTL(true);
I18nManager.allowRTL(true);
```

### 2. Expo Router Tab Navigation

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'الرئيسية' }} />
      <Tabs.Screen name="campaigns" options={{ title: 'الحملات' }} />
      <Tabs.Screen name="templates" options={{ title: 'القوالب' }} />
      <Tabs.Screen name="settings" options={{ title: 'الإعدادات' }} />
    </Tabs>
  );
}
```

### 3. Supabase Integration

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 4. Environment Variables

- Always use `EXPO_PUBLIC_` prefix for client-side access
- Never hardcode credentials
- Use `.env` file for local development

## Component Patterns

### ConnectionCard

```typescript
// Display gateway connection status with Arabic labels
<ConnectionCard
  name="بوابة الواتساب"
  status="connected"
  lastSync="آخر مزامنة: منذ 5 دقائق"
/>
```

### FormField

```typescript
// Reusable Arabic form input
<FormField
  label="رقم الهاتف"
  placeholder="أدخل رقم الهاتف"
  keyboardType="phone-pad"
  value={phone}
  onChangeText={setPhone}
/>
```

## State Management

- Use React Context for global state (auth, theme)
- Use local useState for component-specific state
- Avoid over-abstraction

## API Calls

```typescript
// lib/gatewaySettings.ts
export async function fetchGatewaySettings(userId: string) {
  const { data, error } = await supabase
    .from('gateway_settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) throw error;
  return data;
}
```

## Edge Functions

- Handle WhatsApp API integration server-side
- Use Supabase Edge Functions for secure API calls
- Never expose API keys in client code

## Out of Scope

- Web-specific features
- Complex state management (Redux not needed for this app)
- Server-side rendering (mobile-only)