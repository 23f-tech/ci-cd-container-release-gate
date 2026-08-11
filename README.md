# CI/CD Container Release Gate

Deterministic `POST /release-gate` policy service for container promotion metadata.

```sh
npm test
npm start
```

The server listens on `PORT` (default `3000`). The included multi-stage Docker image runs as the unprivileged `node` user.
