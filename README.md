#  Weav : Multimodal AI Workflow Builder

Weav is a modern, high-fidelity visual workflow builder that enables users to design, connect, and execute automated pipelines combining Large Language Models (Gemini) and automated image processing. Built on Next.js, it leverages a node-based editor for the frontend and runs execution tasks reliably using a background worker system.

---

## ✨ Key Features

- 🎨 **Visual Canvas Editor**: A drag-and-drop canvas built with [XYFlow (React Flow)](https://reactflow.dev/) for designing custom automation pipelines.
- ⚙️ **Reliable Background Execution**: Powered by [Trigger.dev (v4)](https://trigger.dev/), ensuring robust execution of long-running tasks, retries, and asynchronous job monitoring.
- 🤖 **Multimodal Gemini Integration**: Harnesses the power of Google Gemini (`gemini-1.5-pro` and `gemini-1.5-flash`) for multi-modal context processing, dynamic template variable substitution, and prompt generation.
- 🖼️ **Image Manipulation Node**: Uses `Sharp` to crop images to specified aspect ratios (`1:1`, `16:9`, `4:3`) in the background.
- 🔌 **Zero-Configuration Fallbacks**:
  - **Database Mode**: Uses PostgreSQL via Prisma ORM when `DATABASE_URL` is configured, with a seamless automatic fallback to a local file-based database (`local_db.json`) for zero-dependency local runs.
  - **Auth Mode**: Uses Clerk Auth when credentials are provided, with an automatic fallback to a simulated demo session cookie-based system.
- ⚡ **Tailwind CSS v4 Styling**: Built using the latest Tailwind CSS v4 design system, offering premium visual styling and dark mode support.

---

## 🛠️ Node System & Schema

The canvas operates with four core node types:

1. **Request Inputs (`requestInputs`)**: The entry node where the user defines raw parameters (e.g., product text description and image URL).
2. **Crop Image (`cropImage`)**: Captures parent image data and triggers a Trigger.dev task to crop the image dynamically to specific aspect ratios (`1:1`, `16:9`, `4:3`).
3. **Gemini LLM (`geminiPro`)**: Configurable node that supports model selection (`gemini-1.5-pro` / `gemini-1.5-flash`), custom system prompts, and template strings replacing variables from parent nodes (e.g., `{product_text}`, `{tweet}`, `{cropped_image_1}`).
4. **Response Output (`responseNode`)**: The terminal node that consolidates the outputs of LLMs and processed image assets.

---

## 📁 Repository Structure

```filepath
├── app/
│   ├── api/
│   │   ├── check-runs/          # Admin utility to inspect workflow status
│   │   └── workflows/           # API routes to create, edit, and execute canvases
│   ├── canvas/                  # Canvas route containing the workflow visual builder page
│   ├── components/              # UI Components (Custom node definitions, auth wrapper)
│   ├── dashboard/               # User dashboard displaying workflows list & run history
│   ├── lib/
│   │   ├── auth-util.ts         # Dual-mode authentication utility (Clerk vs local mock cookie)
│   │   └── db.ts                # Dual-mode database layer (Prisma Postgres vs local JSON DB)
│   ├── layout.tsx               # Main Next.js layout and provider setup
│   └── page.tsx                 # Root redirect utility
├── prisma/
│   └── schema.prisma            # Schema definitions for Workflow and Run tables
├── trigger/
│   ├── cropImage.ts             # Sharp image processing Trigger.dev task
│   └── geminiNode.ts            # Google Generative AI Gemini Trigger.dev task
├── trigger.config.ts            # Configuration for Trigger.dev v4 build/external options
├── local_db.json                # Local JSON fallback database file
└── package.json                 # Project dependencies & startup scripts
```

---

## 🚀 Getting Started & Local Setup

Follow these steps to configure and run the workspace locally:

### 1. Configure Environment Variables
Create a `.env.local` file in the root directory. You can start by copying the variables shown below:

```bash
# PostgreSQL Connection (Optional: leave blank to fallback to local_db.json)
DATABASE_URL="postgresql://..."

# Clerk Authentication (Optional: leave blank for simulated mock mode)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL=/sign-in

# API Keys (Required for Trigger.dev worker & Gemini execution)
GEMINI_API_KEY="AIzaSy..."
TRIGGER_SECRET_KEY="tr_dev_..."
```

### 2. Install Dependencies
Install dependencies from the package root:
```bash
npm install
```

### 3. Setup Database & Client
If you are using PostgreSQL, sync the schema and generate the Prisma Client:
```bash
npx prisma db push
npx prisma generate
```
*Note: If no database URL is provided, the application will automatically create and populate `local_db.json` inside the root workspace.*

### 4. Run the Next.js Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application dashboard.

### 5. Run the Trigger.dev Background Worker
To execute background tasks (image cropping and LLM generations), run the Trigger.dev CLI in a separate terminal:
```bash
npx trigger.dev dev
```
Make sure `GEMINI_API_KEY` and `TRIGGER_SECRET_KEY` are defined in your environment so the worker can authorize requests properly.

---

## 🔄 Workflow Execution Lifecycle

When you trigger a workflow run from the UI canvas:

1. **Auto-Save**: The current nodes configuration and edge connections are serialized and auto-saved to the database.
2. **Topological Order Execution**: The execution engine ([route.ts](./app/api/workflows/%5Bid%5D/run/route.ts)) performs a Depth-First Search / Topological sort.
3. **Parallel Task Dispatch**: Nodes are resolved by layer. Nodes with resolved inputs are executed in parallel.
4. **Trigger.dev SDK Offloading**:
   - **Crop Image** operations invoke `cropImageTask` in [cropImage.ts](./trigger/cropImage.ts) which fetches, crops using `Sharp`, and outputs a base64 encoded jpeg.
   - **Gemini Node** operations invoke `runGeminiTask` in [geminiNode.ts](./trigger/geminiNode.ts) which wraps Google's Gen AI client, passing input texts, prompts, and base64 images.
5. **Real-time Status Polling**: The engine polls the status of dispatched tasks every second until completion.
6. **Execution Logging**: Outputs, durations, and errors are serialized into logs and stored under a new `Run` record. If a single node fails, downstream nodes are marked accordingly, leading to a `PARTIAL` or `FAILED` status, while successful node states are preserved.
