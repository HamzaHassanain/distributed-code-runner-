# Distributed Code Runner Simulation

A production-grade, distributed code execution platform designed to run untrusted code securely and scalably. This system implements a **Shared Nothing Architecture**, decoupling the user-facing client, the API gateway, and the sandboxed execution engine into isolated services.

## System Architecture

The system is composed of three primary logical layers: the **Presentation Layer**, the **Orchestration Layer**, and the **Execution Layer**.

```mermaid
graph TD
    User((User)) -->|HTTP/HTTPS| Client[Code Client]
    Client -->|REST API| Gateway[Runner API Gateway]
    
    subgraph "Secure Zone (Private Network)"
        Gateway -->|Authenticated| LB[Internal Load Balancer]
        
        subgraph "Judge0 Cluster"
            LB -->|Distribute| Server1[Judge0 Server]
            LB -->|Distribute| Server2[Judge0 Server]
            
            Server1 -->|Enqueue Job| Redis[(Job Queue)]
            Server2 -->|Enqueue Job| Redis
            
            Redis -->|Pop Job| Worker1[Judge0 Worker]
            Redis -->|Pop Job| Worker2[Judge0 Worker]
        end
        
        Gateway -->|Metadata| Mongo[(MongoDB)]
        Server1 -->|Result Persist| PG[(PostgreSQL)]
        Worker1 -->|Update Status| PG
    end
```

### 1. Presentation Layer Used: `code-client`
*   **Tech Stack**: Next.js (React), Tailwind CSS.
*   **Responsibility**: Provides the IDE interface for users to write and submit code. It maintains no state and communicates solely with the Runner Service.
*   **Security**: This is the *only* component accessible to the public internet.

### 2. Orchestration Layer Used: `runner-api`
*   **Tech Stack**: Node.js (Express), Nginx.
*   **Responsibility**:
    *   **Gatekeeper**: Validates requests, handles authentication, and rate-limiting.
    *   **Router**: Forwards valid execution requests to the internal execution cluster.
    *   **Isolation**: It acts as a strict proxy; the execution cluster is never exposed directly to the client.

### 3. Execution Layer Used: `judge0`
The core engine is a customized Judge0 cluster, split into **Servers** and **Workers** for scalability.

*   **Judge0 Server (API Node)**
    *   Accepts execution requests from the Gateway.
    *   Validates the payload and pushes the job to the **Redis Job Queue**.
    *   Does *not* execute user code.

*   **Judge0 Worker (Execution Node)**
    *   Polls the Redis queue for pending jobs.
    *   **Sandboxing**: Executes the untrusted code inside isolated containers (creating ephemeral Docker containers for every submission).
    *   Updates the submission status in **PostgreSQL**.

---

## Data Strategy

The system uses specialized data stores for specific needs:
*   **MongoDB**: Stores user session data, submission history, and client configurations.
*   **Redis**: High-performance job queue for buffering submissions between the Server and Worker nodes.
*   **PostgreSQL**: The authoritative store for Judge0 execution results, languages, and system state.

---

## Deployment

The architecture is designed to be physically distributed. In a production environment (e.g., DigitalOcean), each component runs on its own isolated server (Droplet) within a private VPC.

For a detailed, step-by-step production deployment guide, including network security rules and strict server isolation, please refer to:

**[Production Deployment Guide (DEPLOYMENT.md)](DEPLOYMENT.md)**

---

## Local Development (Simulation)

For local testing, you can simulate this entire distributed topology using Docker Compose.

```bash
# Start the full simulation
npm run start:all
```