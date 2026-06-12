# SignLingo Frontend

This Next.js app connects to the Django backend through `NEXT_PUBLIC_API_URL`.
If the variable is not set, local development uses `http://localhost:8000`
and production builds use the current Render backend.

## Local setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

By default, `.env.example` points to a local Django backend at `http://localhost:8000`.

For the current Render demo backend, set:

```bash
NEXT_PUBLIC_API_URL=https://signlingo-django.onrender.com
```

The Django backend must allow the frontend origin through `CORS_ALLOWED_ORIGINS`
when the frontend is deployed separately.

## Localization

Frontend localization uses `i18next` and `react-i18next`.

Core files:

- `frontend/lib/i18n.ts`
- `frontend/components/common/I18nProvider.tsx`
- `frontend/components/common/LanguageToggle.tsx`
- `frontend/locales/en/*.json`
- `frontend/locales/ko/*.json`

Rules for new UI text:

- Keep English as the default language and add the matching Korean key.
- Do not add user-visible text directly in components when it can be managed in locale JSON.
- Keep intentional English values, such as `SignLingo`, `Google`, `GitHub`, and `XP`, explicit in both locale files.
- Put login/signup text in `auth.json`.
- Put landing/shared text and shared image alt text in `common.json`.
- Put gamification badge, reward, and quest labels under `gamification.json`:
  - `badges.items.<badge-id>.*`
  - `rewards.items.<reward-id>.*`
  - `quests.items.<quest-id>.description`
- Put league screen display names under `leagues.json`:
  - `tiers.<tier>.name`

Before merging localization changes, verify that the `en` and `ko` locale files have matching key structures and run:

```bash
./node_modules/.bin/tsc --noEmit
```
