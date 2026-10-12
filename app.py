
from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
from pathlib import Path
import sqlite3
import csv
import io

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "leads.db"

app = Flask(__name__)
CORS(app)


def connect_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db


def init_db():
    with connect_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company TEXT NOT NULL,
                website TEXT DEFAULT '',
                industry TEXT DEFAULT '',
                location TEXT DEFAULT '',
                employees INTEGER DEFAULT 0,
                revenue_k REAL DEFAULT 0
            )
        """)

        count = db.execute(
            "SELECT COUNT(*) FROM leads"
        ).fetchone()[0]

        if count == 0:
            db.executemany("""
                INSERT INTO leads
                (company, website, industry, location, employees, revenue_k)
                VALUES (?, ?, ?, ?, ?, ?)
            """, [
                ("Northstar Labs", "northstarlabs.example",
                 "Technology", "Austin, TX", 85, 4200),
                ("Greenfield Supply", "greenfieldsupply.example",
                 "Manufacturing", "Denver, CO", 140, 8700),
                ("Bluebird Health", "bluebirdhealth.example",
                 "Healthcare", "Chicago, IL", 60, 3100),
                ("Summit Office Group", "summitoffice.example",
                 "Professional Services", "Dallas, TX", 32, 1800),
                ("Riverbend Foods", "riverbendfoods.example",
                 "Food & Beverage", "Phoenix, AZ", 110, 6200)
            ])


def get_leads():
    with connect_db() as db:
        rows = db.execute("SELECT * FROM leads").fetchall()

    leads = [dict(row) for row in rows]
    company_counts = {}
    website_counts = {}

    for lead in leads:
        company = lead["company"].strip().lower()
        website = lead["website"].strip().lower().removeprefix("www.")
        if company:
            company_counts[company] = company_counts.get(company, 0) + 1
        if website:
            website_counts[website] = website_counts.get(website, 0) + 1

    for lead in leads:
        score = 0
        score += 20 if lead["website"] else 0
        score += 15 if lead["industry"] else 0
        score += 15 if lead["location"] else 0
        score += 20 if lead["employees"] > 0 else 0
        score += 20 if lead["revenue_k"] > 0 else 0
        score += 10 if lead["employees"] >= 50 else 0

        lead["score"] = score
        lead["tier"] = "A" if score >= 70 else "B" if score >= 45 else "C"

        company = lead["company"].strip().lower()
        website = lead["website"].strip().lower().removeprefix("www.")
        lead["duplicate"] = (
            company_counts.get(company, 0) > 1
            or (bool(website) and website_counts.get(website, 0) > 1)
        )

    return leads


def filtered_leads():
    leads = get_leads()
    search = request.args.get("search", "").strip().lower()
    industry = request.args.get("industry", "").strip()
    location = request.args.get("location", "").strip().lower()
    tier = request.args.get("tier", "").strip().upper()

    if search:
        leads = [x for x in leads if any(
            search in x[field].lower()
            for field in ("company", "website", "industry", "location")
        )]
    if industry:
        leads = [x for x in leads if x["industry"] == industry]
    if location:
        leads = [x for x in leads if location in x["location"].lower()]
    if tier in ("A", "B", "C"):
        leads = [x for x in leads if x["tier"] == tier]

    return leads


@app.route("/")
def home():
    return send_from_directory(str(BASE_DIR / "static"), "index.html")


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/api/summary")
def summary():
    leads = get_leads()
    return jsonify({
        "total": len(leads),
        "high_priority": sum(x["tier"] == "A" for x in leads),
        "duplicates": sum(x["duplicate"] for x in leads),
        "industries": len(set(x["industry"] for x in leads if x["industry"]))
    })


@app.route("/api/industries")
def industries():
    names = sorted(set(
        x["industry"] for x in get_leads() if x["industry"]
    ))
    return jsonify({"industries": names})


@app.route("/api/leads", methods=["GET"])
def list_leads():
    return jsonify({"leads": filtered_leads()})


@app.route("/api/leads/<int:lead_id>", methods=["DELETE"])
def delete_lead(lead_id):
    with connect_db() as db:
        cursor = db.execute(
            "DELETE FROM leads WHERE id = ?",
            (lead_id,)
        )

        if cursor.rowcount == 0:
            return jsonify({"error": "Lead not found"}), 404

    return jsonify({"message": "Lead deleted successfully"})


@app.route("/api/leads", methods=["POST"])
def add_lead():
    data = request.get_json(silent=True) or {}
    company = str(data.get("company", "")).strip()

    if not company:
        return jsonify({"error": "Company name is required"}), 400

    try:
        employees = max(0, int(data.get("employees") or 0))
        revenue = max(0, float(data.get("revenue_k") or 0))
    except (ValueError, TypeError):
        return jsonify({"error": "Employees/revenue must be numbers"}), 400

    with connect_db() as db:
        db.execute("""
            INSERT INTO leads
            (company, website, industry, location, employees, revenue_k)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            company,
            str(data.get("website", "")).strip(),
            str(data.get("industry", "")).strip(),
            str(data.get("location", "")).strip(),
            employees,
            revenue
        ))

    return jsonify({"message": "Lead saved successfully"}), 201

@app.route("/api/leads/<int:lead_id>", methods=["PUT"])
def update_lead(lead_id):
    data = request.get_json(silent=True) or {}

    with connect_db() as db:
        existing = db.execute(
            "SELECT * FROM leads WHERE id = ?",
            (lead_id,)
        ).fetchone()

        if existing is None:
            return jsonify({"error": "Lead not found"}), 404

        company = str(data.get("company", existing["company"]) or "").strip()
        website = str(data.get("website", existing["website"]) or "").strip()
        industry = str(data.get("industry", existing["industry"]) or "").strip()
        location = str(data.get("location", existing["location"]) or "").strip()

        if not company:
            return jsonify({"error": "Company name is required"}), 400

        try:
            employees = int(data.get("employees", existing["employees"]) or 0)
            revenue = float(data.get("revenue_k", existing["revenue_k"]) or 0)
        except (ValueError, TypeError):
            return jsonify({"error": "Employees and revenue must be numbers"}), 400

        if employees < 0 or revenue < 0:
            return jsonify({"error": "Values cannot be negative"}), 400

        db.execute("""
            UPDATE leads
            SET company = ?, website = ?, industry = ?, location = ?,
                employees = ?, revenue_k = ?
            WHERE id = ?
        """, (
            company, website, industry, location,
            employees, revenue, lead_id
        ))

    return jsonify({"message": "Lead updated successfully"})



@app.route("/api/export.csv")
def export_csv():
    fields = [
        "company", "website", "industry", "location",
        "employees", "revenue_k", "score", "tier", "duplicate"
    ]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    writer.writerows({
        field: lead[field] for field in fields
    } for lead in filtered_leads())

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads.csv"}
    )


init_db()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
