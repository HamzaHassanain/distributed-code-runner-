# Infra Orchestration
# Replaces complex npm scripts for better readability and management

# Variables for Docker Compose Paths
COMPOSE_CLIENT := docker compose -f code-client/docker-compose.yml
COMPOSE_RUNNER := docker compose -f code-runner-service/server/docker-compose.yml
COMPOSE_MONGO := docker compose -f mongodb/docker-compose.yml
COMPOSE_REDIS := docker compose -f code-runner-service/redis/docker-compose.yml
COMPOSE_POSTGRES := docker compose -f code-runner-service/postgress/docker-compose.yml
COMPOSE_JUDGE_SERVER := docker compose -f code-runner-service/judge0/server/docker-compose.yml
COMPOSE_JUDGE_WORKER := docker compose -f code-runner-service/judge0/worker/docker-compose.yml

.PHONY: setup start-all stop-all status clean help

help:
	@echo "Distributed Code Runner - Orchestration Makefile"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "  \033[1;33mGlobal Controls:\033[0m"
	@echo "    setup               Create Docker networks (public/private)"
	@echo "    start-all           Start ALL services (Client, Gateway, DBs, Judge0)"
	@echo "    stop-all            Stop ALL services"
	@echo "    status              Show status of all running containers"
	@echo "    clean               Prune stopped containers"
	@echo ""
	@echo "  \033[1;33mClient (Frontend):\033[0m"
	@echo "    start-client        Start Next.js Client"
	@echo "    stop-client         Stop Client"
	@echo "    logs-client         Follow Client logs"
	@echo "    build-client        Rebuild Client image"
	@echo "    shell-client        Open shell in Client container"
	@echo ""
	@echo "  \033[1;33mRunner (API Gateway):\033[0m"
	@echo "    start-runner        Start Express API Gateway"
	@echo "    stop-runner         Stop Gateway"
	@echo "    logs-runner         Follow Gateway logs"
	@echo "    build-runner        Rebuild Gateway image"
	@echo "    shell-runner        Open shell in Gateway container"
	@echo ""
	@echo "  \033[1;33mJudge0 Cluster:\033[0m"
	@echo "    start-judge0-server Start Judge0 Server nodes"
	@echo "    stop-judge0-server  Stop Server nodes"
	@echo "    logs-judge0-server  Follow Server logs"
	@echo "    start-judge0-worker Start Judge0 Worker nodes"
	@echo "    stop-judge0-worker  Stop Worker nodes"
	@echo "    logs-judge0-worker  Follow Worker logs"
	@echo ""
	@echo "  \033[1;33mInfrastructure (Databases):\033[0m"
	@echo "    start-mongo         Start MongoDB Cluster"
	@echo "    stop-mongo          Stop MongoDB"
	@echo "    start-redis         Start Redis Queue"
	@echo "    stop-redis          Stop Redis"
	@echo "    start-postgres      Start PostgreSQL"
	@echo "    stop-postgres       Stop PostgreSQL"


# --- Setup ---
setup:
	docker network create editor-mini-public || true
	docker network create editor-mini-private || true

# --- Global Control ---
start-all: setup start-mongo start-redis start-postgres start-judge0-server start-judge0-worker start-runner start-client

stop-all: stop-client stop-runner stop-judge0-worker stop-judge0-server stop-postgres stop-redis stop-mongo

status:
	docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

clean:
	docker container prune -f

# --- Client (Frontend) ---
start-client:
	$(COMPOSE_CLIENT) up -d

stop-client:
	$(COMPOSE_CLIENT) down --remove-orphans

logs-client:
	$(COMPOSE_CLIENT) logs -f

build-client:
	$(COMPOSE_CLIENT) build

shell-client:
	$(COMPOSE_CLIENT) exec client sh

# --- Runner (API Gateway) ---
start-runner:
	$(COMPOSE_RUNNER) up -d

stop-runner:
	$(COMPOSE_RUNNER) down --remove-orphans

logs-runner:
	$(COMPOSE_RUNNER) logs -f

build-runner:
	$(COMPOSE_RUNNER) build --no-cache runner-api

shell-runner:
	$(COMPOSE_RUNNER) exec runner-api sh

# --- Databases ---
start-mongo:
	$(COMPOSE_MONGO) up -d
stop-mongo:
	$(COMPOSE_MONGO) down --remove-orphans
logs-mongo:
	$(COMPOSE_MONGO) logs -f

start-redis:
	$(COMPOSE_REDIS) up -d
stop-redis:
	$(COMPOSE_REDIS) down --remove-orphans
logs-redis:
	$(COMPOSE_REDIS) logs -f

start-postgres:
	$(COMPOSE_POSTGRES) up -d
stop-postgres:
	$(COMPOSE_POSTGRES) down --remove-orphans
logs-postgres:
	$(COMPOSE_POSTGRES) logs -f

# --- Judge0 Cluster ---
start-judge0-server:
	$(COMPOSE_JUDGE_SERVER) up -d
stop-judge0-server:
	$(COMPOSE_JUDGE_SERVER) down --remove-orphans
logs-judge0-server:
	$(COMPOSE_JUDGE_SERVER) logs -f

start-judge0-worker:
	$(COMPOSE_JUDGE_WORKER) up -d
stop-judge0-worker:
	$(COMPOSE_JUDGE_WORKER) down --remove-orphans
logs-judge0-worker:
	$(COMPOSE_JUDGE_WORKER) logs -f
