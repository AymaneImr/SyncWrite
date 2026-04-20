
# SyncWrite

## Overview

[SyncWrite](https://github.com/AymaneImr/SyncWrite) is a real-time collaborative text editor that enables multiple users to work on the same document simultaneously. It combines secure authentication, live synchronization over WebSockets, and a rich text editing experience, making it suitable for team-based writing and document collaboration.

---

## Core Features

* JWT-based authentication with protected routes
* Document management (create, open, delete, personal library)
* **Beta**: upload, export support (most export formats are still in progress)
* Search and filtering for documents
* Rich text editor (formatting, lists, colors, alignment, etc.)
* Real-time collaboration using WebSockets
* Live presence with remote selections and cursors
* Document sharing via links and invites
* Role-based access control (viewer / editor)
* Collaboration session management (join, leave, activity tracking)
* Owner controls (permissions, removing users, ending sessions)

---

## Getting Started

### ✅ Recommended: Run with Docker Compose

This is the fastest way — no manual setup needed.

```bash
git clone https://github.com/AymaneImr/SyncWrite.git
cd SyncWrite
mv backend/.env.docker.example backend/.env.docker
openssl rand -hex 32
```
Copy the token you get from the command above, run it twice to get 2 tokens 
then navigate to *.env.docker* and paste both tokens in JWT_SECRET and REFRESH_SECRET.
finally:

```bash
docker compose -f docker-compose.dev.yml up --build
```

---

### ⚙️ Manual Setup (Without Docker)

#### 1. Clone the repository

```bash
git clone https://github.com/AymaneImr/SyncWrite.git
cd SyncWrite
```

#### 2. Backend (Go)

Make sure you have:

* Go installed
* Air (for live reload)

Install Air:

```bash
go install github.com/air-verse/air@latest
```

Run the backend:

```bash
air
```

---

#### 3. Frontend (if separate)

```bash
npm install
npm run dev
```

---

## ⚠️ Notes

* Docker Compose is strongly recommended for a smoother setup.
* Manual setup may require configuring environment variables and services depending on your setup.
