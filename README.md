# Workday Pro — Mock Exam Studio

A clean, time-based web app for practicing the **Workday Pro** certifications:

- **Pro HCM Services** (HCM Core Services) — 646 practice questions
- **HCM Data Loading Services** — 167 practice questions

Answers stay hidden until you submit, just like the real exam. Built from the study material collected in this folder (question banks, validated answer keys and practice exams), de-duplicated and ranked by cross-source frequency.

## Features

- **Two exams** — pick Pro HCM Services or HCM Data Loading Services
- **Most Repeated Questions** — questions seen in multiple source banks, ranked by frequency, with highlighted answers and explanations
- **Timed Mock Test** — 2 hours per attempt, **1–55 questions** (your choice), answers hidden until submit, auto-submit at 00:00:00
- **Instant grading** — score ring, pass/fail at 70%, correct vs. your answers, per-question explanations, source-bank attribution
- **Question navigator** — jump around, mark for review, clear selection
- **Attempt history** — saved locally in your browser (per exam)
- Fully static — no build step, no dependencies, no tracking

## Run locally

Double-click `index.html`, or serve the folder:

```bash
python -m http.server 8619
# then open http://localhost:8619
```

## Push to a private GitHub repo

```bash
cd wd-mock-exam
git init
git add .
git commit -m "Workday Pro mock exam studio"
git branch -M main
git remote add origin git@github.com:<you>/<private-repo>.git
git push -u origin main
```

### Serving it

- **GitHub Pages** works for private repos only on paid plans (Pro / Team / Enterprise). On GitHub Free, a private repo can't publish a Pages site, but any static host can serve this folder: **Netlify**, **Cloudflare Pages**, **Vercel** — all have generous free tiers and support private-repo deploys. These hosts serve this project as-is (it is 100% static).
- Everything is relative-path and client-side, so any sub-path hosting works.

## Updating the question bank

The parsed bank lives in `js/data.js` (generated, do not edit by hand). To rebuild it from the source documents:

```bash
python build/build_bank.py   # parse sources -> build/bank_raw.json
python build/clean.py        # cleanup + dedup -> js/data.js
```

Answer keys were taken from the source documents:

| Exam | Sources (with verified answers) |
|---|---|
| Pro HCM | MCQs for HCM Recertification Guide, Workday HCM Practice Exam, Workday Basics HCM Quiz v1/v2, Core/Fundamentals Assessment guide, All Questions Combined, HCM MCQ Question Bank |
| HCM Data Loading | HCM Data Loading Practice Exam, HCM Data Loading Mock Exam guide, Data Loading 2 Assessment guide, Implementation & Core Assessment guide, Workday HCM Data Loading study guides |

Frequency counts (“Most Repeated”) additionally include question stems from the unanswered consolidated question sets (Core HCM consolidated, HCM Exam MCQ 1RS, HCM MCQ Question Bank, Data Load consolidated Q&A).

## Notes & caveats

- Correct answers follow the answer keys embedded in the source material. Where a source was ambiguous or unverifiable, the item was dropped.
- Workday product behavior evolves; treat this as practice, not gospel. Verify mission-critical answers against official documentation.
- This is an unofficial study aid. Not affiliated with, or endorsed by, Workday, Inc. Workday is a trademark of Workday, Inc.
- Attempt history is stored in your browser's `localStorage` only.
