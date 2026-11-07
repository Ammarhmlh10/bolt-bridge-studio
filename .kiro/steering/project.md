---
inclusion: auto
description: SmartHoop project configuration and rules
---

# SmartHoop Project

## Overview

SmartHoop is an Arabic RTL mobile-first WhatsApp gateway management application built with Expo and Supabase.

## Tech Stack

- **Frontend**: Expo SDK 52, React Native, TypeScript
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **State Management**: React Context + useState
- **Navigation**: Expo Router (tab-based)

## Project Structure

```
app/           # Expo Router pages (tab navigation)
components/    # Reusable UI components
lib/           # Business logic (Supabase client, auth, API)
hooks/         # Custom React hooks
constants/     # Theme and constants
supabase/      # Database migrations and Edge Functions
assets/        # Images and static assets
```

## Key Patterns

1. **RTL Support**: Arabic language, `forceRTL(true)`
2. **Supabase**: Use environment variables for credentials
3. **Edge Functions**: Handle WhatsApp API integration
4. **Component Library**: Custom components for forms, cards, navigation

## Database

- PostgreSQL via Supabase
- Row Level Security (RLS) enabled
- Migrations in `supabase/migrations/`

## Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```