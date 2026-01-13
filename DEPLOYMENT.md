# DigitalOcean Deployment Plan

This document outlines the strategy for deploying the distributed code runner system to DigitalOcean. It describes a standard multi-Droplet setup using VPC networking and an alternative approach using Docker Swarm.

---

## Option 1: Standard Multi-Droplet Deployment

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
    *   `client`, `runner`, `judge0-lb`, `server-1`, `server-2`, `worker-1`, `worker-2`.

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
*   **Internal Server FW**: Allow Inbound TCP 2358 **ONLY** from `judge0-lb` Private IP. Apply to `server-1`, `server-2`.

---

## Option 2: Docker Swarm Deployment (High Availability)

This approach clusters the Droplets into a Docker Swarm, allowing them to share an Overlay Network for easier discovery and management.

### 1. Swarm Initialization
1.  **Select a Manager Node**: Typically the `client` or `runner` Droplet(or a dedicated manager).
    ```bash
    # On Manager Droplet
    docker swarm init --advertise-addr <private-ip-manager>
    ```
2.  **Join Worker Nodes**: Run the command output by the init step on all other Droplets (`runner`, `judge0-*`).
    ```bash
    # On Worker Droplets
    docker swarm join --token <token> <private-ip-manager>:2377
    ```

### 2. Network Setup
Create an encrypted overlay network that spans all nodes.
```bash
# On Manager
docker network create --driver overlay --opt encrypted editor-swarm-net
```

### 3. Deploying Services (Stacks)
You will convert your `docker-compose.yml` files into a single `docker-stack.yml` or keep them modular.

**Key Changes:**
*   **Version**: Must use version `3.8` or higher.
*   **Networks**: Use the overlay network.
    ```yaml
    networks:
      default:
        external: true
        name: editor-swarm-net
    ```
*   **Deploy Configuration**:
    ```yaml
    services:
      judge0-server:
        deploy:
          replicas: 2
          placement:
            constraints: [node.role == worker]
    ```

### 4. Running the Stack
```bash
docker stack deploy -c docker-stack.yml editor-stack
```

### Benefits of Swarm
*   **Service Discovery**: You can use service names (e.g., `http://runner-api:4000`) instead of managing static Private IPs.
*   **Scaling**: Scale Judge0 workers with one command: `docker service scale editor-stack_judge0-worker=5`.
*   **Resilience**: If a node fails, Swarm reschedules containers to healthy nodes.
