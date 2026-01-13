# DigitalOcean Production Deployment Guide

This guide details exactly how to deploy the Distributed Code Runner to DigitalOcean using a **Standard Multi-Droplet Architecture**.

## 🏗️ Architecture & Network

We will use **7 Droplets** and **3 Managed Databases**, communicating securely over a **Private VPC Network**.

| Role | Droplet Name | Docker Services | Visibility |
| :--- | :--- | :--- | :--- |
| **Frontend** | `client` | `code-client` | **Public** (80/443) |
| **API Gateway** | `runner` | `runner-api`, `runner-lb` | **Private** (VPC) |
| **Cluster LB** | `judge0-lb` | `judge0-lb` (Nginx) | **Private** (VPC) |
| **Execution Node** | `judge0-server-1` | `judge0-server` | **Private** (VPC) |
| **Execution Node** | `judge0-server-2` | `judge0-server` | **Private** (VPC) |
| **Worker Node** | `judge0-worker-1` | `judge0-worker` | **Private** (VPC) |
| **Worker Node** | `judge0-worker-2` | `judge0-worker` | **Private** (VPC) |

---

## 1. Preparation Phase (Local Machine)

Before creating droplets, build your production images and push them to a registry (Docker Hub or DigitalOcean Container Registry).

### A. Build Images
**Client**:
```bash
cd code-client
docker build -t youruser/code-client:latest .
docker push youruser/code-client:latest
```

**Runner**:
```bash
cd code-runner-service/server
docker build -t youruser/runner-api:latest .
docker push youruser/runner-api:latest
```

*(Judge0 uses the public image `ghcr.io/shayan-chashm-jahan/judge0-repovive:dev`)*

---

## 2. Infrastructure Setup (DigitalOcean)

1.  **Create a VPC**: Ensure all resources are in the same region (e.g., `fra1`) and VPC (`editor-vpc`).
2.  **Create Managed Databases**:
    *   MongoDB, PostgreSQL, Redis (Valkey).
    *   **Secure them**: Go to "Settings" -> "Trusted Sources". We will add Droplets later.
    *   **Note**: Copy the **Private Network Connection Strings**.
3.  **Create 7 Droplets**:
    *   OS: Ubuntu 24.04 (Docker pre-installed image recommended).
    *   Enable **Private Networking** (VPC).
4.  **Configure Cloud Firewalls**:
    *   **FW-Public**: Allow Inbound TCP 80/443. Apply to `client`.
    *   **FW-Private**: Allow Inbound TCP 4000 & 2358. **Restrict Source** to your VPC CIDR (or specific Droplet Private IPs). Apply to all other droplets.

---

## 3. Configuration Changes & Load Balancers

On each Droplet, you will run a focused `docker-compose.yml`.

### 🚨 Critical Change for All Files
You must **REMOVE** the `networks` section defining `editor-mini-private` or `public`.
*   **Intra-Droplet** (e.g., Runner LB -> API): Use default bridge (service names work).
*   **Inter-Droplet** (e.g., Runner -> Judge0): Use **Private IP Addresses**.

---

### Node 1: `client` (Frontend)
1.  **File**: `code-client/docker-compose.yml`
2.  **Changes**:
    *   Image: `youruser/code-client:latest`
    *   Env `RUNNER_API_URL`: `http://<PRIVATE-IP-OF-RUNNER>:4000`
    *   Env `MONGO_URL`: Managed DB Connection String.

### Node 2: `runner` (API Gateway)
Contains `runner-api` and `runner-lb`.
1.  **File**: `code-runner-service/server/docker-compose.yml`
2.  **Changes**:
    *   Image: `youruser/runner-api:latest`
    *   Env `JUDGE0_URL`: `http://<PRIVATE-IP-OF-JUDGE0-LB>:2358`
    *   Remove `depends_on`.
3.  **Check**: Ensure `runner-lb` config (`nginx.conf`) points to `runner-api:4000`. (This works unchanged as they are on the same machine).

### Node 3: `judge0-lb` (Cluster Load Balancer)
This acts as the entry point for the Judge0 cluster.
1.  **File**: `code-runner-service/judge0/server/docker-compose.yml` (Only the `judge0-lb` service).
2.  **Nginx Config Change (`nginx.conf`)**:
    You MUST update the `upstream` block to point to the **Private IPs** of the server droplets.
    ```nginx
    upstream judge0_servers {
        server <PRIVATE-IP-SERVER-1>:2358;
        server <PRIVATE-IP-SERVER-2>:2358;
    }
    server {
        listen 2358;
        location / { proxy_pass http://judge0_servers; ... }
    }
    ```

### Nodes 4 & 5: `judge0-server-1` / `-2`
1.  **File**: `code-runner-service/judge0/server/docker-compose.yml` (Only the `judge0-server` service).
2.  **Changes**:
    *   Ports: `2358:2358`
    *   Env `REDIS_HOST` / `POSTGRES_HOST`: Managed DB Hostnames.
    *   `privileged: true` (Keep this!).

### Nodes 6 & 7: `judge0-worker-1` / `-2`
1.  **File**: `code-runner-service/judge0/worker/docker-compose.yml`
2.  **Changes**:
    *   Env `REDIS_HOST` / `POSTGRES_HOST`: Managed DB Hostnames.
    *   `privileged: true`.

---

## 4. Deployment Steps summary

1.  **SSH into each Droplet**.
2.  **Clone/Copy** only the necessary files for that role.
3.  **Update `.env`** files with Private IPs and Secrets.
4.  **Modify Nginx Configs** (for LBs) to use Private IPs.
5.  **Run**:
    ```bash
    docker compose up -d
    ```
6.  **Verify**:
    *   Check `docker ps`.
    *   Check logs: `docker compose logs -f`.
    *   Test connectivity: `curl http://localhost:PORT/health`.
