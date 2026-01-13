# Distributed Code Runner Simulation

A distributed code execution pipeline simulating a production-grade architecture for running untrusted code securely. This project demonstrates a multi-service setup using Docker Compose, including a Next.js frontend, an Express.js API gateway, and a scalable Judge0 cluster.

## 🚀 Architecture

The system is designed to be deployed as a distributed system but is currently simulated locally using Docker Compose networks.

### Components
1.  **Code Client (Frontend)**:
    *   **Stack**: Next.js (React).
    *   **Role**: User interface for submitting code.
    *   **Access**: Publicly accessible (simulated at `http://localhost:3000`).
2.  **Runner Service (API Gateway)**:
    *   **Stack**: Node.js (Express), Nginx Load Balancer.
    *   **Role**: Authenticates requests and forwards code execution jobs to the Judge0 cluster.
    *   **Access**: Private network only (exposed via LB to Client).
3.  **Judge0 Cluster (Execution Engine)**:
    *   **Stack**: Judge0 (Custom Image), Nginx Load Balancer, Redis, PostgreSQL.
    *   **Role**: Executes code securely in sandboxed environments.
    *   **Structure**: 2 Server Nodes + 2 Worker Nodes behind a Load Balancer.
    *   **Security**: Privileged mode for isolation, Authentication Token protection.
4.  **Databases**:
    *   **MongoDB**: Data storage for the Client/Runner.
    *   **Redis**: Shared queue for Judge0.
    *   **PostgreSQL**: Persistence for Judge0.

### Network Topology (Simulation)
*   **`editor-mini-public`**: Connects Client ↔ Runner Load Balancer.
*   **`editor-mini-private`**: Connects Runner API ↔ Internal Services (Judge0, DBs). *Completely isolated from the public.*

---

## 🛠️ Local Setup & Commands

This project uses `npm` scripts in the root `package.json` to orchestrate the entire distributed system.

### Prerequisites
*   Docker & Docker Compose
*   Node.js (for running scripts)

### Quick Start
```bash
# 1. Install dependencies (for scripts)
npm install

# 2. Setup Networks
npm run setup

# 3. Start All Services
npm run start:all
```

### Management Commands
| Command | Description |
| :--- | :--- |
| `npm run start:all` | Starts all services (Client, Runner, Judge0, DBs). |
| `npm run stop:all` | Stops all services and removes containers. |
| `npm run status` | Shows the status of all containers. |
| `npm run logs:<service>` | View logs (e.g., `npm run logs:runner`). |
| `npm run build:all` | Rebuilds Client and Runner images. |

---

## 🔒 Security Features
*   **Network Isolation**: Strict separation between public (Client) and private (Execution) networks.
*   **Authentication**: Internal communication between Runner and Judge0 is protected by `AUTHN_TOKEN`.
*   **Privileged Mode**: Judge0 containers run in privileged mode (`privileged: true`) to ensure proper sandboxing capabilities.
*   **Health Checks**: All services implement health checks. Nginx load balancers automatically route traffic away from unhealthy nodes.

---

## ☁️ DigitalOcean Deployment Plan

The architecture is designed to map 1:1 to a secure DigitalOcean multi-droplet setup.

**Target Infrastructure:**
*   **7 Droplets**: 1 Client, 1 Runner, 1 LB, 2 Judge0 Servers, 2 Judge0 Workers.
*   **Managed Databases**: MongoDB, PostgreSQL, Redis (Valkey) accessed via VPC.
*   **Networking**: All backend traffic travels securely over DigitalOcean VPC (Private Network).
*   **Firewalls**:
    *   **Public Access**: Blocked on all Droplets except Client (Ports 80/443).
    *   **Internal Access**: Strict allow-list based on Private IPs (e.g., Runner only accepts traffic from Client).

For a detailed deployment guide, see [deployment_plan.md](deployment_plan.md) (if available in artifacts) or review the project documentation.
