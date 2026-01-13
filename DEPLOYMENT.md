# DigitalOcean Deployment Plan

This document outlines the strategy for deploying the distributed code runner system to DigitalOcean. It describes a standard multi-Droplet setup using VPC networking.

---

## Standard Multi-Droplet Deployment

In this setup, each service runs on its own Droplet, communicating via DigitalOcean's Private VPC network.

### 1. Architecture Overview
**Region**: All resources must be in the same region (e.g., `fra1`) and VPC.

| Component | Infrastructure | Network Access |
| :--- | :--- | :--- |
| **Client** | 1x Droplet | **Public** (Ports 80/443), **Private** (Outbound to Runner) |
| **Runner** | 1x Droplet | **Private Only** (Inbound from Client, Outbound to LB/DBs) |
| **Judge0 LB** | 1x Droplet (Nginx) | **Private Only** (Inbound from Runner, Outbound to Servers) |
| **Judge0 Servers** | 2x Droplets | **Private Only** (Inbound from LB, Outbound to DBs) |
| **Judge0 Workers** | 2x Droplets | **Private Only** (Outbound to DBs) |
| **Databases** | Managed Mongo, Postgres, Redis | **Private VPC Only** |

### 2. Infrastructure Setup
1.  **Create Managed Databases**: MongoDB, PostgreSQL, and Redis (Valkey).
    *   **Action**: Enable "Trusted Sources" and add your Droplet names/VPC. Note the **Private Connection Strings**.
2.  **Create 7 Droplets**: Ubuntu 24.04. Enable Private Networking.
    *   `client`, `runner`, `judge0-lb`, `judge0-server-1`, `judge0-server-2`, `judge0-worker-1`, `judge0-worker-2`.

### 3. "No-Change" Deployment Steps
You can use the existing `docker-compose.yml` files, but you must **remove the network configuration**.

**Steps for each Droplet:**
1.  **Clone the Repo** (or copy relevant files).
2.  **Edit `docker-compose.yml`**:
    *   **DELETE** the `networks` section completely.
    *   **DELETE** `networks: - editor-mini-private` (or public) from each service.
    *   *Reason*: In this setup, services talk via the host's Private IP, not a Docker bridge network.
3.  **Configure Environment (`.env`)**:
    *   Replace `REDIS_HOST`, `POSTGRES_HOST`, `MONGO_URL` with the **Managed DB Private Hostnames**.
    *   Update Service URLs to use **Private IPs**:
        *   Client: `RUNNER_API_URL=http://<private-ip-runner>:4000`
        *   Runner: `JUDGE0_URL=http://<private-ip-lb>:2358`
        *   Judge0 LB: Update Nginx upstream to use `<private-ip-server-1>` and `<private-ip-server-2>`.

### 4. Security (Cloud Firewalls)
Create DigitalOcean Cloud Firewalls to enforce isolation.

*   **Public Client FW**: Allow Inbound TCP 80/443. Apply to `client`.
*   **Internal Runner FW**: Allow Inbound TCP 4000 **ONLY** from `client` Private IP. Apply to `runner`.
*   **Internal LB FW**: Allow Inbound TCP 2358 **ONLY** from `runner` Private IP. Apply to `judge0-lb`.
*   **Internal Server FW**: Allow Inbound TCP 2358 **ONLY** from `judge0-lb` Private IP. Apply to `judge0-server-1`, `judge0-server-2`.

---

