Local patches against the `RuView/` submodule (pinned at upstream commit `9a078e4`, firmware tag `v0.4.3.1-esp32-3`). Applied during the 2026-05-01 session — see `PROGRESS_LOG.md` §10.7 for the full story.

## Apply

```bash
cd RuView
git apply ../patches/RuView-ui/01-SensingTab-rssi-fallback.patch
git apply ../patches/RuView-ui/02-sensing-service-inject-edge-rssi.patch
git apply ../patches/RuView-ui/03-observatory-preserve-datasource-and-filter-types.patch
```

## What each one does

| Patch | File | Fix |
|---|---|---|
| `01` | `ui/components/SensingTab.js` | Stop rendering the constant `-80 dBm` when `mean_rssi` is falsy. Show "— dBm" instead. |
| `02` | `ui/services/sensing.service.js` | Cache `rssi` from `edge_vitals` websocket messages and inject it into `sensing_update.features.mean_rssi`, so the dashboard's existing reader gets a real value at edge_tier ≥ 1. |
| `03` | `ui/observatory/js/main.js` | (a) Stop overwriting `settings.dataSource = 'demo'` on every WebSocket close — preserve the user's choice. (b) Filter `onmessage` to only feed `sensing_update` messages into the visualizer's `_liveData`; ignore the smaller `edge_vitals` messages that don't have `nodes`/`features`. |

These are candidates for an upstream PR.
