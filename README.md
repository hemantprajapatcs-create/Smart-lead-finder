# Smart Lead Finder & Qualifier

A lightweight lead-generation and qualification tool built with Python, Flask, SQLite, HTML, CSS, and JavaScript.

## Overview

Smart Lead Finder helps users manage company leads, evaluate their potential, identify duplicate records, and export lead data for further analysis. It is designed as a simple, easy-to-use lead management dashboard.

## Features

- **Lead Dashboard:** View company leads and summary statistics.
- **Add Leads:** Add new companies with their business details.
- **Edit Leads:** Update existing company information.
- **Delete Leads:** Remove unwanted lead records.
- **Search and Filters:** Find leads by company, website, industry, location, and priority.
- **Lead Scoring:** Automatically score leads based on available company information.
- **Priority Classification:** Categorize leads into A (High), B (Medium), and C (Explore).
- **Duplicate Detection:** Flag leads with matching company names or websites.
- **Data Quality Indicator:** Show how many key fields are available.
- **CSV Export:** Export filtered lead data to a CSV file.
- **SQLite Database:** Store lead records locally.

## Technology Stack

- Python
- Flask
- Flask-CORS
- SQLite
- HTML
- CSS
- JavaScript

## Project Structure

```text
smart_lead_finder/
├── app.py
├── requirements.txt
├── README.md
├── leads.db          # Created locally by the application
└── static/
    ├── index.html
    ├── app.css
    └── app.js
```

_Note: The frontend filenames should match the files in your actual project folder._

## Installation and Setup

### 1. Install Python

Install Python 3 if it is not already installed.

### 2. Open the project directory

Open a terminal in the project folder.

### 3. Create a virtual environment

```bash
python -m venv .venv
```

### 4. Activate the environment

**Windows Command Prompt:**

```bash
.venv\Scripts\activate
```

**Windows PowerShell:**

```powershell
.\.venv\Scripts\Activate.ps1
```

### 5. Install dependencies

```bash
pip install -r requirements.txt
```

### 6. Run the application

```bash
python app.py
```

Open the following address in your browser:

http://127.0.0.1:5000

## API Endpoints

| Method | Endpoint               | Purpose                       |
| ------ | ---------------------- | ----------------------------- |
| GET    | `/api/health`          | Check backend status          |
| GET    | `/api/summary`         | Retrieve dashboard statistics |
| GET    | `/api/industries`      | Retrieve available industries |
| GET    | `/api/leads`           | List and filter leads         |
| POST   | `/api/leads`           | Add a new lead                |
| PUT    | `/api/leads/<lead_id>` | Update an existing lead       |
| DELETE | `/api/leads/<lead_id>` | Delete a lead                 |
| GET    | `/api/export.csv`      | Export filtered leads as CSV  |

## Lead Scoring

The application calculates a score from available company information:

- Website provided: 20 points
- Industry provided: 15 points
- Location provided: 15 points
- Employee count greater than zero: 20 points
- Revenue estimate greater than zero: 20 points
- Employee count of at least 50: 10 additional points

Priority categories:

- **A — High:** Score of 70 or above
- **B — Medium:** Score from 45 to 69
- **C — Explore:** Score below 45

## Demo Data

The application includes sample company records for demonstration. These records use `.example` domains and are intended as synthetic demo data, not verified real-company leads.

## Future Improvements

- Add a dedicated edit form instead of browser prompts.
- Add stronger validation and duplicate prevention.
- Add lead sorting and pagination.
- Add automated tests.
- Improve accessibility and mobile responsiveness.

## Author

Hemant Prajapat

## Disclaimer

This project is intended for educational and demonstration purposes. Use permitted datasets and respect applicable privacy and data-protection requirements when working with real business information.
S
