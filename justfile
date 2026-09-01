set shell := ["bash", "-eu", "-o", "pipefail", "-c"]
set dotenv-load := true

backend_port := env_var_or_default("VITE_WEB_PORT", "7420")

dev-web:
  @echo "Starting backend router server on :{{backend_port}} and frontend on :1420"
  @echo "API base and WS route (/ws) both use backend port :{{backend_port}}"
  @trap 'kill 0' EXIT INT TERM; \
    (VITE_WEB_PORT={{backend_port}} cargo watch -x 'run --bin codexia-web -- --port {{backend_port}}') & \
    VITE_WEB_PORT={{backend_port}} bun run dev
