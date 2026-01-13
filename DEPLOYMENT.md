# Production Deployment Guide (DigitalOcean)

This guide provides step-by-step instructions for deploying the Distributed Code Runner on DigitalOcean. We will use a **7-server architecture** to ensure maximum security, scalability, and component isolation.

## Architecture Overview

Each service will run on its own isolated "Droplet" (Virtual Machine). Private communication will happen exclusively over DigitalOcean's VPC network.

| Droplet Name | Role | Docker Service | Visibility |
| :--- | :--- | :--- | :--- |
| **`client`** | Frontend | `code-client` | **Public** (Ports 80/443) |
| **`runner`** | Gateway | `runner-api` | **Private** (VPC Only) |
| **`judge0-lb`** | Load Balancer | `judge0-lb` | **Private** (VPC Only) |
| **`judge0-srv-1`** | Execution Server | `judge0-server` | **Private** (VPC Only) |
| **`judge0-srv-2`** | Execution Server | `judge0-server` | **Private** (VPC Only) |
| **`judge0-wkr-1`** | Execution Worker | `judge0-worker` | **Private** (VPC Only) |
| **`judge0-wkr-2`** | Execution Worker | `judge0-worker` | **Private** (VPC Only) |

---

## Phase 1: Infrastructure Provisioning

### 1. Create Networking (VPC)
1.  Go to **Networking** -> **VPC** in DigitalOcean dashboard.
2.  Create a new VPC (e.g., `runner-vpc`) in your preferred region (e.g., `fra1`).
3.  **Important**: All Droplets and Databases MUST be in this VPC.

### 2. Create Managed Databases
Create the following databases in the `runner-vpc` VPC:
*   **MongoDB Cluster** (for Client & Runner data)
*   **PostgreSQL** (for Judge0 persistence)
*   **Redis** (for Judge0 job queues)

> **Note**: In "Settings" -> "Trusted Sources", initially allow your local IP to set them up, but later we will restrict this to Droplet IPs.

### 3. Create Droplets
Create **7 Droplets** using the **Docker on Ubuntu** Marketplace image.
*   **Region**: Same as VPC (e.g., `fra1`).
*   **VPC Network**: Select `runner-vpc`.
*   **Tags**: `runner-cluster` (useful for firewalls).
*   **Hostname**: Use the names from the table above (e.g., `client`, `runner`, etc.).

---

## Phase 2: Security & Firewall Setup

Go to **Networking** -> **Firewalls** and create two strict firewalls.

### Firewall 1: `public-frontend`
*   **Apply to**: Droplet `client`.
*   **Inbound Rules**:
    *   TCP 22 (SSH) - From: Your Personal IP
    *   TCP 80 (HTTP) - From: All IPv4/IPv6
    *   TCP 443 (HTTPS) - From: All IPv4/IPv6

### Firewall 2: `private-backend`
*   **Apply to**: All other droplets (`runner`, `judge0-lb`, `judge0-srv*`, `judge0-wkr*`).
*   **Inbound Rules**:
    *   TCP 22 (SSH) - From: Your Personal IP
    *   TCP 1-65535 (All Ports) - From: **Source VPC Network** (e.g. `10.114.0.0/20`).
*   **Outbound Rules**:
    *   ICMP/TCP/UDP - To: All IPv4/IPv6 (Required for fetching updates/packages).

> **Effect**: Only the `client` is accessible from the internet. All other servers are unreachable except via the secure private network.

---

## Phase 3: Deployment & Configuration

For each droplet, you will SSH in and set up the specific service.
use `ip addr show eth1` to find the **Private IP** of each droplet.

### 1. Droplet: `client` (Frontend)
*   **Goal**: Serve the UI.
*   **Private Address**: Find it (e.g., `10.x.x.10`).

1.  **Prepare File**: Create `docker-compose.yml`.
    ```yaml
    services:
      client:
        image: your-dockerhub-user/code-client:latest
        ports: ["80:3000"]
        environment:
          # Point to the Private IP of the Runner Droplet
          - RUNNER_API_URL=http://<PRIVATE-IP-OF-RUNNER>:4000
          - MONGO_URL=<MONGO_CONNECTION_STRING>
    ```
2.  **Run**: `docker compose up -d`

### 2. Droplet: `runner` (API Gateway)
*   **Goal**: Authenticate and forward.
*   **Private Address**: Find it (e.g., `10.x.x.11`).

1.  **Prepare File**: Create `docker-compose.yml`.
    ```yaml
    services:
      runner:
        image: your-dockerhub-user/runner-api:latest
        ports: ["4000:4000"]
        environment:
          # Point to the Private IP of the Judge0 Load Balancer
          - JUDGE0_URL=http://<PRIVATE-IP-OF-JUDGE0-LB>:2358
          - MONGO_URL=<MONGO_CONNECTION_STRING>
          - AUTH_TOKEN=<SECRET_TOKEN>
    ```
2.  **Run**: `docker compose up -d`

### 3. Droplet: `judge0-lb` (Internal Load Balancer)
*   **Goal**: Balance load between server nodes.
*   **Private Address**: Find it (e.g., `10.x.x.12`).

1.  **Configure Nginx**: Create `nginx.conf`.
    ```nginx
    events { worker_connections 1024; }
    http {
        upstream execution_nodes {
            # THE PRIVATE IPs OF YOUR SERVER NODES
            server <PRIVATE-IP-OF-JUDGE0-SRV-1>:2358;
            server <PRIVATE-IP-OF-JUDGE0-SRV-2>:2358;
        }
        server {
            listen 2358;
            location / {
                proxy_pass http://execution_nodes;
            }
        }
    }
    ```
2.  **Run Nginx**:
    ```bash
    docker run -d -p 2358:2358 --name lb \
      -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro \
      nginx:alpine
    ```

### 4. Droplets: `judge0-srv-1` & `judge0-srv-2`
*   **Goal**: Accept submissions, push to Redis.

1.  **Prepare File**: Create `docker-compose.yml`.
    ```yaml
    services:
      server:
        image: ghcr.io/shayan-chashm-jahan/judge0-repovive:dev
        privileged: true
        restart: always
        ports: ["2358:2358"]
        environment:
          - AUTHN_TOKEN=<SECRET_TOKEN>
          - REDIS_HOST=<MANAGED-REDIS-HOST>
          - REDIS_PORT=25061
          - REDIS_PASSWORD=<REDIS-PASSWORD>
          - REDIS_TLS=true
          - POSTGRES_HOST=<MANAGED-POSTGRES-HOST>
          - POSTGRES_PORT=25060
          - POSTGRES_USER=doadmin
          - POSTGRES_PASSWORD=<POSTGRES-PASSWORD>
          - POSTGRES_DB=defaultdb
          - POSTGRES_SSL_MODE=require
    ```
2.  **Run**: `docker compose up -d`

### 5. Droplets: `judge0-wkr-1` & `judge0-wkr-2`
*   **Goal**: Poll Redis, execute code.

1.  **Prepare File**: Create `docker-compose.yml`.
    ```yaml
    services:
      worker:
        image: ghcr.io/shayan-chashm-jahan/judge0-repovive:dev
        privileged: true
        restart: always
        command: ["./scripts/workers"]
        environment:
          # Exact same DB/Redis config as Servers
          - REDIS_HOST=<MANAGED-REDIS-HOST>
          - REDIS_PORT=25061
          - REDIS_PASSWORD=<REDIS-PASSWORD>
          - REDIS_TLS=true
          - POSTGRES_HOST=<MANAGED-POSTGRES-HOST>
          - POSTGRES_PORT=25060
          - POSTGRES_USER=doadmin
          - POSTGRES_PASSWORD=<POSTGRES-PASSWORD>
          - POSTGRES_DB=defaultdb
          - POSTGRES_SSL_MODE=require
    ```
2.  **Run**: `docker compose up -d`

---

## Phase 4: Final Verification

1.  **Access Client**: Open the Public IP of your `client` Droplet in a browser.
2.  **Submit Code**: Try running a "Hello World" script.
3.  **Trace Flow**:
    *   Client -> Runner (Private IP)
    *   Runner -> Judge0 LB (Private IP)
    *   Judge0 LB -> Judge0 Server (Private IP) -> Redis
    *   Judge0 Worker -> Redis -> Execute
    *   Result flows back.
