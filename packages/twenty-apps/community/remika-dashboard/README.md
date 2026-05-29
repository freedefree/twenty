# Remika Dashboard Twenty App

Native Twenty dashboard widgets for Remika API data.

This app follows Twenty's official app layout model:

- React front components render inside Twenty UI as `FRONT_COMPONENT` widgets.
- `definePageLayoutTab` manifests add `Remika` and `Search` tabs to the standard `My First Dashboard` layout.
- The widgets read Remika's existing APIs directly from the browser with credentials included.
- The dashboard tab currently includes:
  - CRM overview
  - mortgage rates
  - readonly Remika next actions with `/my/crm` handoff links
  - selective People import / link / merge from Remika registered users
  - bidirectional Remika contact mirroring back into Twenty People for create / update / delete / restore changes
  - bidirectional Company / Opportunity / Note / Task bridge sync that shares the same `recordId` / identity / sync ledger contract as People
- The Search tab embeds Remika `/crm/search/embed` as a full-height workspace with map, filters, cards, split/grid/table views, transaction toggles, and an `Open full page` handoff.

The bridge uses `recordId` / identity links as the canonical binding key, so Remika-origin changes on an existing People row continue to sync even when the row itself originally came from Twenty.

The live bridge workflows are seeded from the Twenty server prefill helper, and the published body can be repaired with `pnpm twenty:bridge:diagnose -- --repair` when a stale workflowVersion slips into the workspace.

## Local Setup

Start Remika on `http://localhost:3000` and Twenty on `http://localhost:3100` or `http://localhost:3099`, then install or sync the app:

```bash
cd apps/twenty/packages/twenty-apps/community/remika-dashboard
yarn install
yarn twenty remote add --api-url http://localhost:3100
yarn twenty dev --once
```

`yarn twenty dev --once` only syncs the Remika app manifest and bundled front component files into the live Twenty workspace. If the Search tab iframe is blank with a browser error such as `Blocked script execution ... frame is sandboxed and the 'allow-scripts' permission is not set`, rebuild the local Twenty frontend/image so `twenty-front-component-renderer` is updated too, then recreate the Twenty server/worker containers.

If a manually added Remika Search front component renders during layout edit but shows `No Data` after leaving/reopening the record detail page, check Twenty front's widget configuration guard. Persisted page-layout metadata can retain `configurationType: FRONT_COMPONENT` without GraphQL `__typename`, so front component rendering must accept the stable `configurationType` fallback.

`REMIKA_API_BASE_URL` defaults to `http://localhost:3000`. Override it from the Twenty app settings when the Remika API runs somewhere else. In local dev, logic functions may use `http://host.docker.internal:3000`, but browser front components normalize that host back to `http://localhost:3000` because they execute in the user's browser iframe.

`REMIKA_API_PUBLIC_KEY` is the browser-facing CRM public API key used by the import widget. Keep it aligned with the Remika public CRM API contract for the current dev workspace.

When running the remika bridge in Twenty dev, these additional environment variables are available and are wired by `packages/twenty-docker/docker-compose.remika-dev.yml`:

- `REMIKA_API_PUBLIC_KEY` - public CRM API key used by the bridge workflows.
- `REMIKA_WEBHOOK_SECRET` - webhook secret used by bridge webhook ingest.

In dev, the Twenty seeder can prefill Remika bridge workflows so the dashboard app has object, timeline, and signal coverage without hand-creating every workflow.

For authenticated CRM data, the browser must have a valid Remika session cookie for the configured Remika origin.
