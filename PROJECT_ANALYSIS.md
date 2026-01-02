# Functional Analysis of Project Components

This document provides a detailed analysis of the individual projects within the `KikiAI` workspace, outlining their purpose, functionality, and key technical details.

---

## 5. Nexus Portal (Landing Page)

**Path:** `nexus-temp/`
**Type:** Vite + React + TypeScript Web Application

### Purpose

The modern "Crossroads" or Landing Page (`index.html` at root) that connects users to the four main applications. It serves as the entry point (`ekobio.org`).

### Key Features

* **Tech Stack:** Built with **React 18**, **TypeScript**, and **Vite** for fast development and static generation.
* **Configuration:** Applications are defined in `constants.ts` (id, name, description, images).
* **Localization:** Supports multiple languages (CS, EN, DE, ES).
* **Deployment:** Builds to a static `index-static.html` which is deployed to the FTP root.
* **Linked Applications:**
    1. **KikiAI** (Chatbot & Oracle)
    2. **Kikimmander** (File Manager)
    3. **Aetheria Adventures** (Puzzle Game - *Status: Planned/Missing*)
    4. **Kinteractive Storybook** (Interactive Stories)

---

## 6. Kinteractive Storybook

**Path:** `KikiAI/wwwroot/apps/KiStorybook/` & `KikiAI/Controller/StorybookController.cs`
**Type:** Hybrid (Static HTML + ASP.NET Core Backend)

### Purpose

A library of interactive stories.

### Key Features

* **Frontend:** `index.html` offers a visually rich, atmospheric UI ("Magical Library") to browse stories.
* **Story Loading Strategy:** Implements a robust 4-layer fallback mechanism to find story files:
    1. `stories.txt` (Manual index).
    2. `/api/storybook/list` (ASP.NET backend scanning `bookcase/` folder).
    3. `scan.php` (Server-side PHP scanner as backup).
    4. Direct Directory Parsing (Last resort).
* **Backend:** `StorybookController.cs` exposes an endpoint to list valid `.html` story files from the `bookcase` directory.

---

## 7. Aetheria Adventures (Planned)

**Path:** *Reference found in `nexus-temp/constants.ts`*
**Status:** **Missing / Concept Phase**

### Analysis

* **Definition:** Described in the Nexus portal configuration as a "Puzzle game based on 4 elements" where players resolve logic puzzles to restore harmony.
* **Current State:** No source code (`index.html` or game logic) was found in the local workspace or in the file structure of `KikiAI/wwwroot/apps`. It appears to be a project currently in the design or early conceptual phase, linked in the portal but not yet implemented in this repository.

---

## 1. KikiAI (Core Application)

**Path:** `KikiAI/KikiAI`
**Type:** ASP.NET Core 9.0 Web Application

### Purpose

The central hub of the ecosystem. It is a multi-provider AI chat application that acts as a unified interface for interacting with various Large Language Models (LLMs).

### Key Features

* **Multi-Provider Support:** Integrates APIs from:
  * **Google Gemini** (via `GeminiProvider.cs`): Supports multiple versions like 2.0 Flash, 1.5 Pro, and experimental models.
  * **OpenAI** (via `OpenAIProvider.cs`): Supports GPT-4o, GPT-4o-mini, and can switch between production and test keys.
  * **Anthropic Claude** (via `ClaudeProvider.cs`): Supports Claude 3 Haiku/Sonnet with specialized usage tracking (cost monitoring).
  * **Mistral AI** (via `MistralProvider.cs`): Supports Mistral Small/Large.
* **Web Search Integration:** Uses **Tavily API** (`TavilyService.cs`) to augment AI responses with real-time web data.
* **Chat Management:**
  * **Sessions:** Chats are organized into sessions, stored as JSON files on the local filesystem (`Chats/` directory).
  * **Import/Export:** Ability to import/export chat histories.
  * **Search:** Full-text search across past conversations.
* **Frontend:** A rich vanilla JavaScript client (`wwwroot/index.html`) that communicates with the backend via REST endpoints. It features a modern dark UI, model selection, and file attachment capabilities. Includes integrated **Authentication UI** (Login/Register).
* **Security & Auth:**
  * Uses **BCrypt.Net-Next** for password hashing.
  * `ApiKeyService` handles LLM key rotation and aliasing.
  * `appsettings.json` stores sensitive keys (gitignored).
* **Diagnostics:**
  * Endpoint `/api/diag` provides health status, versioning, and database connectivity checks.

### Deployment Architecture (Aspone/IIS)

* **Binary Root:** `/www/` (Contains `.dll`, `.exe`, `web.config`, `appsettings.json`).
* **Static Content:** `/www/wwwroot/` (Contains `index.html`, `/apps`, `/js`, `/css`).
* **Critical Rule:** On Aspone hosting, the application root must be `/www/`. Binaries placed in `/wwwroot/` will not execute correctly or will be treated as static files.
* **Update Procedure:**
  1. Upload `app_offline.htm` to `/www/` to release file locks on DLLs.
  2. Clean up old binaries from `/www/`.
  3. Upload new binaries to `/www/`.
  4. Upload static assets to `/www/wwwroot/`.
  5. Delete `app_offline.htm` to bring the site back online.

---

## 2. CommanderGem

**Path:** `CommanderGem/`
**Type:** Vanilla JavaScript SPA (Single Page Application)

### Purpose

A functional web-based file manager inspired by **Total Commander**, designed to run completely client-side or served statically. It provides a dual-pane interface for managing files.

### Key Features

* **Dual-Pane Interface:** Classic left/right panel layout for easy file operations (`index.html`).
* **File System Access API:** Heavily relies on the modern browser `FileSystemHandle` API to access user local files directly without a backend server for file operations (viewed in `js/fs-ops.js`).
* **ZIP Handling:** Built-in support for creating and browsing ZIP archives using `JSZip` (`js/zip-ops.js`). It allows "entering" ZIP files as if they were directories.
* **File Viewer/Editor:** Integrated modal for viewing images, playing media, and editing text files (`js/viewer.js`, `js/editor.js`).
* **Keyboard Shortcuts:** Implements traditional Commander hotkeys (F5 Copy, F6 Move, F8 Delete).
* **Search:** Recursive search functionality within the loaded file handles.

---

## 3. KikiCalendar

**Path:** `KikiCalendar/`
**Type:** Python Automation Suite

### Purpose

A specialized toolchain for generating a printable, graphically rich yearly calendar (specifically for 2026).

### Key Components

* **Data Generation (`generator_dat.py`):**
  * Calculates astronomical data (Moon phases, Sun rise/set) using `ephem`.
  * Determines "Garden" types (Leaf, Fruit, Root, Flower) based on Moon zodiac signs (biodynamics).
  * Generates weekly advice texts and tracks holidays/name days.
  * Outputs a massive JSON dataset (`kalendar_2026_full.json`).
* **Visual Asset Generation:**
  * **Weekly Images (`generování_obrázků.py`)**: Thematic 9:16 images using Google GenAI (Imagen 4).
  * **Monthly Backgrounds (`generator_pozadi.py`)**: 12 soft botanical backgrounds with "White Blend" for readability.
  * **Icons (`generator_ikon.py`)**: Watercolor icons for moon phases and garden types.
* **PDF Compositing (`generator_layoutu.py`):**
  * Uses **ReportLab** (Python) to assemble the final print-ready PDF.
  * Implements 12 distinct PageTemplates with monthly background switching.
  * Complex table layout integrating images, icons, and dynamic text.

---

## 4. ModelTester

**Path:** `ModelTester/`
**Type:** C# Console Application

### Purpose

A standalone diagnostic utility to verify API keys and connectivity to AI providers.

### Key Features

* **Simple Connectivity Tests:** Cycles through configured providers (OpenAI, Claude, Gemini).
* **Status Reporting:** Prints "✅" or "❌" to the console for each model to quickly identify broken keys or quotas.
* **Shared Config:** Reads from the same style `appsettings.json` structure as the main KikiAI app.

---

## 8. Root Scripts

**Path:** `/` (Root directory)
**Type:** PowerShell (`.ps1`) & Python (`.py`)

### Purpose

DevOps and deployment automation.

### Key Features

* **FTP Deployment:** Numerous scripts (e.g., `deploy-ftp.ps1`, `upload_all_js.ps1`) to upload specific parts of the applications to the `aspone.cz` hosting infrastructure.
* **Diagnostics:** Scripts like `diagnose-app.ps1` and `check_root.ps1` to troubleshoot production issues.
