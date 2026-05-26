# AI Recruiter — Integrated Recruitment Automation Site

A production-grade, single-deployable **AI-powered Job Description to Excel Automation Web Application ("a site")**. 

This application allows HR users to upload Job Description documents (`.docx`/`.pdf`), automatically extracts structured metadata using serverless AI/NLP API routes, stores results in a database, and populates formatted Excel sheets (preserving all original fonts, styles, and cell borders).

By merging the backend service layers directly into **Next.js App Router API Routes (`/src/app/api/...`)** and completely **bypassing the login gates**, you can deploy this as a single web application with zero friction!

---

## 🚀 Key Features

1. **Integrated Web Site Architecture**: Bypasses separate standalone Express backends. All parsers, templates loaders, database adapters, and NLP algorithms run inside Next.js Serverless API routes, allowing you to deploy the entire stack as a single site!
2. **Zero-Credentials Access**: Bypasses the ID/Password login gates. Opens directly into the premium KPIs recruiting dashboard out-of-the-box.
3. **Intelligent Upload Center**: Drag and drop single or bulk `.docx` and `.pdf` files.
4. **Deep AI Extraction Service**: Uses OpenAI API to extract structured roles, grades, experience ranges, technical skills, monitoring tools, soft skills, responsibilities, and tools.
5. **Smart Mock Mode Fallback**: No API key? The system runs in a robust mock mode that returns full high-fidelity parses for the provided workspace sample JDs (`Application support enginer 1.docx` and `Production Support 1.docx`), and scans other arbitrary documents using keyword regexes.
6. **Zero-Config Persistent Persistence**: Runs PostgreSQL if configured in `.env`. If unconfigured, it automatically maps records to a local JSON file (`database.json` inside the frontend directory) for instant persistent evaluations.
7. **Format-Preserved Excel Automation**: Powered by `exceljs`. Load any template (like `BR_RawData 3.xlsx`), scan headers, automatically map fields, increment requirement IDs (e.g. `46401BR` -> `46402BR`), copy style frames (cell backgrounds, fonts, thin grid borders), and download immediately.
8. **NLP Resume ATS Matcher**: Upload candidate resumes, compare them against processed JDs, score them against matching benchmarks, list skill overlaps/gaps, and generate ATS rankings.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, Lucide Icons
- **Document Extractors**: `mammoth` (Word docx), `pdf-parse` (PDF)
- **AI Engine**: `openai` SDK
- **Excel Processor**: `exceljs`
- **Database**: PostgreSQL (`pg` pool) / local `database.json` fallback

---

## 📁 Repository Structure

```text
Auto/
├── frontend/                 # Next.js 16 Tailwind Client & Backend API Routes
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/          # Serverless REST API Routes
│   │   │   │   ├── jobs/
│   │   │   │   │   ├── route.ts # List JDs & Handle Uploads
│   │   │   │   │   ├── [id]/route.ts # Edit & Delete JDs
│   │   │   │   │   └── uploads/route.ts # Upload Log Queue
│   │   │   │   ├── export/route.ts   # Excel Populator Stream
│   │   │   │   └── match-resume/route.ts # Resume ATS Scanner
│   │   │   ├── layout.tsx    # App Shell & Metadatas
│   │   │   ├── globals.css   # Global Styles import tailwind
│   │   │   └── page.tsx      # Unified Premium HR Dashboard
│   │   └── lib/              # Core Server Services
│   │       ├── db.ts         # PostgreSQL & Fail-safe JSON-DB Adapter
│   │       ├── aiService.ts  # OpenAI Parsing and Regex Fallback
│   │       ├── excelService.ts # exceljs Style-Preserved Appender
│   │       └── parserService.ts # mammoth & pdf-parse Extractors
│   ├── package.json
│   └── tsconfig.json
│
├── Application support enginer 1.docx # Sample JD File
├── Production Support 1.docx         # Sample JD File
├── BR_RawData 3.xlsx                 # Main spreadsheet template
└── package.json                      # Root Proxy Command Runner
```

---

## ⚙️ Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- Optional: PostgreSQL database server

---

### 2. Launching the Application

We have configured a root proxy package runner so you can operate everything directly from the root `Auto` workspace folder in two commands:

#### Step 1: Install Dependencies
Open your command prompt/terminal in the root `Auto` workspace and run:
```bash
npm install
```
*This command automatically triggers a post-install hook that installs Next.js and serverless packages for both the root and `/frontend` folders.*

#### Step 2: Spin Up the Dev Server
```bash
npm run dev
```
*This starts the Next.js development server on `http://localhost:3000`.*

#### Step 3: Open your Browser
Open your browser and navigate to:
```text
http://localhost:3000
```
*You will immediately see the premium dark-themed HR Recruitment Dashboard. No login, usernames, passwords, or batch scripting required!*

---

## 📊 Excel Sheet Columns Mapped

Our mapping engine automatically binds the parsed job JSON fields into the exact columns found in `BR_RawData 3.xlsx` (in sheet `'BR _Raw Data'` or `'Global TMH Demand an_21Oct_1715'`):

- `Auto req ID`: Automatically parsed from the last filled row (e.g. `46401BR`) and incremented (`46402BR`), maintaining sequence.
- `Current Req Status`: Defaults to `'Open'`.
- `Grade`: Evaluated from Support Level (`L1/L2` -> `E3`, `L3` -> `E4`).
- `Designation`: Maps to Job Title.
- `BU`: Mapped to `'ITS - TMH - Delivery'`.
- `Mandatory Skills`: Comma-separated listing of all technical skills, platforms, and monitoring tools.
- `Client Name`: Mapped to target client name (e.g. `'IRON MOUNTAIN'`).
- `Project`: Aligned to target project billing code (e.g. `'IM DXP-IDP 2025'`).
- `Date Approved`: Automatically inserts current local date.
- `ST (Bill Rate)`: Sets billing numeric rate (e.g. `5.5`).
- Cell formatting, fonts, and thin borders are dynamically copied cell-by-cell from the template rows!
