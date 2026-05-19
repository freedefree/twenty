# Remika Dashboard Twenty App

Native Twenty dashboard widgets for Remika API data.

This app follows Twenty's official app layout model:

- React front components render inside Twenty UI as `FRONT_COMPONENT` widgets.
- A `definePageLayoutTab` manifest adds a `Remika` tab to the standard `My First Dashboard` layout.
- The widgets read Remika's existing APIs directly from the browser with credentials included.

## Local Setup

Start Remika on `http://localhost:3000` and Twenty on `http://localhost:3100` or `http://localhost:3099`, then install or sync the app:

```bash
cd apps/twenty/packages/twenty-apps/community/remika-dashboard
yarn install
yarn twenty remote add --api-url http://localhost:3100
yarn twenty dev --once
```

`REMIKA_API_BASE_URL` defaults to `http://localhost:3000`. Override it from the Twenty app settings when the Remika API runs somewhere else.

For authenticated CRM data, the browser must have a valid Remika session cookie for the configured Remika origin.

