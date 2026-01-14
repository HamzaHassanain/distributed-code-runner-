# Code Runner Client

A specialized frontend application for the Distributed Code Runner platform. This is the **Presentation Layer** of the system, providing a modern, dark-themed IDE experience for users to write, run, and test code securely.

It connects to the **Runner API Gateway** for execution and **MongoDB** for user session management.

## Features

### Authentication & Sessions
*   **Secure Sign Up/Login**: JWT-based session management.
*   **Guest Access**: Immediate "Continue as Guest" mode for ephemeral sessions.
*   **Persistent State**: User code history and settings are saved to MongoDB.

### Code Editor
*   **Multi-Language Support**: Python, JavaScript, C++, Java, TypeScript, and more.
*   **Syntax Highlighting**: Powered by **CodeMirror 6** for a rich editing experience.
*   **Dual View Modes**:
    *   **Standard**: Simple stdin/stdout interaction.
    *   **Test Cases**: Create, run, and validate against multiple I/O test cases.

### Performance & UX
*   **Optimized Builds**: Using Next.js `output: "standalone"` for minimal Docker images.
*   **Modular Architecture**: Component-based design for maintainability.
*   **Responsive UI**: Fully responsive layout with a custom dark theme.

---

## Tech Stack

*   **Framework**: [Next.js 16](https://nextjs.org/) (App Directory)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS + CSS Variables
*   **Editor Engine**: [CodeMirror 6](https://codemirror.net/) (`@uiw/react-codemirror`)
*   **Icons**: Custom SVG Component Library

---

## Project Structure

```bash
code-client/
├── app/                  # Next.js App Directory
│   ├── editor/           # Editor Page
│   └── page.tsx          # Auth/Landing Page
├── components/           # Reusable Components
│   ├── auth/             # Authentication Modules
│   ├── editor/           # Editor Modules
│   ├── ui/               # UI Primitives (Buttons, Inputs)
│   └── icons/            # SVG Icons
├── lib/                  # Utilities & Types
│   ├── auth/             # Auth logic & JWT handling
│   └── execution/        # Code execution types
└── public/               # Static assets
```

---

## Getting Started

### Prerequisites
*   Node.js 18+ (if running without Docker)
*   Docker & Docker Compose (recommended)

### Running with Docker (Recommended)
This client is designed to run as part of the larger distributed system. Use the root `Makefile` to start the full stack:

```bash
# In the project root
make start-all
```

### Running Locally (Development)
To run the client in isolation (connected to local services):

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configure Environment**:
    Create a `.env.local` file:
    ```env
    MONGODB_URI=mongodb://localhost:27017/runner_db
    JWT_SECRET=your_development_secret
    ```

3.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    Access the app at `http://localhost:3000`.

---

