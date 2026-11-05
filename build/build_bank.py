# -*- coding: utf-8 -*-
"""Parse all Workday study sources into a structured question bank."""
import re, json, os, sys, difflib
from docx import Document

SRC = r"C:\Users\mskmu\Downloads\WD Study Materials"
EX  = r"C:\Users\mskmu\AppData\Local\Temp\opencode\wd_extract"
OUT = os.path.join(SRC, "wd-mock-exam", "build", "bank_raw.json")

def clean(t):
    if t is None: return ""
    t = t.replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"')
    t = t.replace("\u2013", "-").replace("\u2014", "-").replace("\u00a0", " ")
    t = re.sub(r"\s+", " ", t).strip()
    return t

def norm_key(t):
    t = clean(t).lower()
    t = re.sub(r"[^a-z0-9 ]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t

Q = []  # each: dict(id, exam, source, question, options[], answers[idx], multi, explanation)

def add(exam, source, question, options, answers, explanation=""):
    question = clean(question)
    options = [clean(o) for o in options]
    options = [o for o in options if o]
    if not question or len(options) < 2:
        return None
    answers = sorted({a for a in answers if 0 <= a < len(options)})
    if not answers:
        return None
    q = dict(exam=exam, source=source, question=question, options=options,
             answers=answers, multi=len(answers) > 1,
             explanation=clean(explanation))
    Q.append(q)
    return q

# ---------------- Parser: MCQs_for_HCM (1).txt ----------------
def parse_mcqs_for_hcm():
    path = os.path.join(EX, "MCQs_for_HCM (1).txt")
    text = open(path, encoding="utf-8", errors="replace").read()
    parts = re.split(r"(?m)^Q(\d+)\.\s+", text)
    # parts: [preamble, num, body, num, body...]
    for i in range(1, len(parts) - 1, 2):
        body = parts[i + 1]
        m = re.search(r"(?m)^Correct Answer:\s*(.+)$", body)
        if not m:
            continue
        ans_line = m.group(1)
        exp_m = re.search(r"(?m)^Explanation:\s*(.+(?:\n(?!Q\d+\.|Review Notes|$).+)*)", body)
        explanation = exp_m.group(1) if exp_m else ""
        qbody = body[:m.start()]
        opt_re = re.compile(r"(?m)^\s*([A-E])[.)]\s+(.*(?:\n(?!\s*[A-E][.)]\s|\s*$|Correct Answer).*)*)")
        opts = []
        letters = []
        for om in opt_re.finditer(qbody):
            letters.append(om.group(1).upper())
            opts.append(om.group(2))
        if not opts:
            continue
        qtext = qbody[:opt_re.search(qbody).start()] if opt_re.search(qbody) else qbody
        ans_letters = re.findall(r"\b([A-E])\s*[).]", ans_line)
        if not ans_letters:
            ans_letters = re.findall(r"^([A-E])\b", ans_line.strip())
        answers = []
        for L in ans_letters:
            if L in letters:
                answers.append(letters.index(L))
        add("pro-hcm", "MCQs for HCM (Recertification Guide)", qtext, opts, answers, explanation)

parse_mcqs_for_hcm()
print(f"after MCQs_for_HCM: {len(Q)}")

# ---------------- Parser: HCM Practice Exam (embedded answer key docx) ----------------
def parse_hcm_practice_exam():
    path = os.path.join(EX, "extracted", "HCM_answer_key.docx")
    doc = Document(path)
    paras = [p.text for p in doc.paragraphs if p.text.strip()]
    q = None; qtext = ""; opts = []; results = {}
    manual = {131:'b',132:'d',133:'a',134:'b',135:'b',136:'c',137:'a',138:'b',139:'e',140:'b',
              141:'b',142:'c',143:'c',144:'b',145:'a',146:'b',147:'e',148:'a',149:'a',150:'a',
              151:'a',152:'c',153:'a',154:'d',155:'a',156:'b',157:'a',158:'b',159:'a',160:'d',
              161:'b',162:'a',163:'b',164:'a',165:'b'}
    def flush():
        nonlocal q, qtext, opts
        if q is not None:
            results[q] = (qtext.strip(), list(opts))
        q = None; qtext = ""; opts = []
    for t in paras:
        for line in t.split("\n"):
            mm = re.match(r"^(\d+)\.\s*(.*)$", line)
            if mm:
                flush()
                q = int(mm.group(1)); qtext = mm.group(2); opts = []
                continue
            mm = re.match(r"^([A-Ea-e])[.)]\s?(.*)$", line)
            if mm:
                opts.append((mm.group(1).upper(), mm.group(2)))
    flush()
    for num, (qt, ol) in results.items():
        if not ol:
            continue
        letters = [o[0] for o in ol]
        texts = [o[1] for o in ol]
        if num <= 130:
            marked = [j for j, o in enumerate(ol) if o[1].endswith(" ")]
            if len(marked) == len(ol) and len(ol) >= 3:
                # all marked => "All of the Above" option
                idx = next((j for j, t in enumerate(texts) if re.search(r"all of the above", t, re.I)), None)
                marked = [idx] if idx is not None else [len(ol) - 1]
        else:
            L = manual.get(num)
            marked = [letters.index(L.upper())] if L and L.upper() in letters else []
        add("pro-hcm", "Workday HCM Practice Exam", qt, texts, marked)

parse_hcm_practice_exam()
print(f"after HCM_Practice_Exam: {len(Q)}")

# ---------------- Parser: Data Loading Practice Exam ----------------
def parse_dl_practice_exam():
    path = os.path.join(EX, "extracted", "DL_answer_key.docx")
    doc = Document(path)
    paras = [p.text for p in doc.paragraphs if p.text.strip()]
    q = None; qtext = ""; opts = []; results = {}
    manual = {1:'B',2:'B',3:'C',4:'C',5:'B',6:'B',7:'C',8:'B',9:'A',10:'B',12:'D',32:'D',53:'B',62:'D',78:'C'}
    def flush():
        nonlocal q, qtext, opts
        if q is not None:
            results[q] = (qtext.strip(), list(opts))
        q = None; qtext = ""; opts = []
    for t in paras:
        for line in t.split("\n"):
            mm = re.match(r"^(\d+)\.\s*(.*)$", line)
            if mm:
                flush()
                q = int(mm.group(1)); qtext = mm.group(2); opts = []
                continue
            mm = re.match(r"^([A-Da-d])[.)]\s?(.*)$", line)
            if mm:
                opts.append((mm.group(1).upper(), mm.group(2)))
    flush()
    for num, (qt, ol) in results.items():
        if not ol:
            continue
        letters = [o[0] for o in ol]
        texts = [o[1] for o in ol]
        marked = [j for j, o in enumerate(ol) if o[1].rstrip() != o[1]]  # placeholder
        # double trailing space marks correct answer in this doc
        marked = [j for j, o in enumerate(ol) if o[1].endswith("  ")]
        if not marked and num in manual:
            L = manual[num]
            if L in letters:
                marked = [letters.index(L)]
        add("hcm-data-loading", "HCM Data Loading Practice Exam", qt, texts, marked)

parse_dl_practice_exam()
print(f"after DL_Practice_Exam: {len(Q)}")

# ---------------- Generic parser: ✓ Correct Answer guides ----------------
def parse_checkmark_guide(filename, exam, source, qnum_flags=True):
    path = os.path.join(EX, filename)
    text = open(path, encoding="utf-8", errors="replace").read()
    # split into question blocks: 'Question N[:| (...):]'
    blocks = re.split(r"(?m)^Question\s+\d+", text)[1:]
    for blk in blocks:
        lines = [l for l in blk.splitlines()]
        qtext_lines = []
        i = 0
        # first line may contain the rest of "Question N:" marker
        if i < len(lines):
            first = lines[i]
            first = re.sub(r"^\s*[:(].*?[):]\s*", "", first).strip() or re.sub(r"^[:()]", "", first).strip()
            if first:
                qtext_lines.append(first)
            i += 1
        opts = []
        answers = []
        explanation = ""
        mode = "q"
        for l in lines[i:]:
            s = l.rstrip()
            st = s.strip()
            if not st:
                continue
            if re.match(r"^(Page \d+ of \d+|CONFIDENTIAL|-+)", st) and not re.match(r"^(Explanation|Answer)", st):
                explanation += " "
                continue
            if re.match(r"^(Explanation|Answer)\s*[:.]", st) or st.startswith("Explanation"):
                mode = "exp"
                explanation += " " + re.sub(r"^Explanation\s*[:.]\s*", "", st)
                continue
            if mode == "exp":
                if re.match(r"^[A-D]\.\s|^✓|^Question", st):
                    mode = "opts"
                elif re.match(r"^(Page \d+ of \d+|CONFIDENTIAL)", st):
                    continue
                else:
                    explanation += " " + st
                    continue
            m = re.match(r"^(✓\s*(?:Correct Answer:\s*)?|Correct Answer:\s*)?([A-E])[.)]\s+(.*)$", st)
            checked = st.startswith("✓") or "Correct Answer:" in st
            if m:
                mode = "opts"
                opts.append(clean(m.group(3)))
                if checked:
                    # option index may advance after append
                    answers.append(len(opts) - 1)
                continue
            if mode == "q":
                if re.match(r"^(Page \d+ of \d+|CONFIDENTIAL)", st):
                    continue
                qtext_lines.append(st)
        qtext = " ".join(qtext_lines)
        qtext = re.sub(r"^[^A-Za-z0-9]+", "", qtext)
        qtext = re.sub(r"\s+", " ", qtext).strip()
        explanation = re.sub(r"\s+", " ", explanation).strip()
        add(exam, source, qtext, opts, answers, explanation)

parse_checkmark_guide("hcm_data_loading_mock_exam_validated_study_guide.txt",
                      "hcm-data-loading", "HCM Data Loading Mock Exam (Answer Key)")
print(f"after DL mock guide: {len(Q)}")

parse_checkmark_guide("data_loading_2_validated_study_guide.txt",
                      "hcm-data-loading", "Data Loading 2 Assessment (Answer Key)")
print(f"after DL2 guide: {len(Q)}")

parse_checkmark_guide("workday_comprehensive_study_guide (1).txt",
                      "pro-hcm", "Workday Core/Fundamentals Assessment (Answer Key)")
print(f"after comprehensive guide: {len(Q)}")

parse_checkmark_guide("workday_implementation_assessment_study_guide.txt",
                      "hcm-data-loading", "Workday Implementation & Core Assessment (Answer Key)")
print(f"after impl assessment guide: {len(Q)}")

# ---------------- Parser: Workday All Questions Combined ----------------
def parse_all_combined():
    path = os.path.join(EX, "Workday_All_Questions_Combined_Text_With_Answers (1).txt")
    text = open(path, encoding="utf-8", errors="replace").read()
    parts = re.split(r"(?m)^Q(\d+)\.\s+", text)
    for i in range(1, len(parts) - 1, 2):
        body = parts[i + 1]
        m = re.search(r"(?m)^Answer:\s*(.+)$", body)
        if not m:
            continue
        ans_line = m.group(1)
        if "could not be reliably verified" in ans_line:
            continue
        qbody = body[:m.start()]
        opt_re = re.compile(r"(?m)^\s*([A-E])[.)]\s+(.*(?:\n(?!\s*[A-E][.)]\s|\s*$|Answer:).*)*)")
        opts = []; letters = []
        first = True
        for om in opt_re.finditer(qbody):
            letters.append(om.group(1).upper())
            opts.append(om.group(2))
            first = False
        if not opts:
            continue
        qtext = qbody[:opt_re.search(qbody).start()]
        mL = re.match(r"\s*([A-E])\b", ans_line)
        answers = []
        if mL:
            L = mL.group(1).upper()
            if L in letters:
                answers.append(letters.index(L))
        add("pro-hcm", "Workday All Questions Combined (Answer Key)", qtext, opts, answers)

parse_all_combined()
print(f"after AllCombined: {len(Q)}")

# (intermediate dump removed; final clustering happens in part2)


# ---------------- Parser: Basics HCM quizzes (v1 & v2) ----------------
def parse_basics_quiz(filename, source):
    path = os.path.join(EX, filename)
    text = open(path, encoding="utf-8", errors="replace").read()
    parts = re.split(r"(?m)^Q(\d+)\.\s+", text)
    for i in range(1, len(parts) - 1, 2):
        body = parts[i + 1]
        m = re.search(r"(?m)^Correct Answer:\s*(.+)$", body)
        opt_m = re.search(r"(?m)^Options:\s*$", body)
        if not m or not opt_m:
            continue
        ans_raw = m.group(1)
        ans_norm = norm_key(ans_raw)
        qlines = body[:opt_m.start()]
        qlines = re.sub(r"(?m)^Status:.*$", "", qlines)
        qtext = qlines.strip()
        opt_lines = body[opt_m.end():m.start()].splitlines()
        opts = []
        cur = None
        for l in opt_lines:
            if l.startswith("    \x7f"):
                if cur is not None:
                    opts.append(cur)
                cur = l[5:].strip()
                cur = re.sub(r"^[■\-\s\x7f]+", "", cur)
            else:
                if cur is not None and l.strip():
                    cur += " " + l.strip()
                elif cur is None and l.strip():
                    cur = l.strip()
        if cur is not None:
            opts.append(cur)
        answers = [j for j, o in enumerate(opts) if norm_key(o) and norm_key(o) in ans_norm]
        add("pro-hcm", source, qtext, opts, answers)

parse_basics_quiz("Workday_Basics_HCM_Corrected_Quiz.txt", "Workday Basics HCM Quiz (Answer Key)")
parse_basics_quiz("Workday_Basics_HCM_Corrected_Quiz_v2.txt", "Workday Basics HCM Quiz v2 (Answer Key)")
print(f"after Basics quizzes: {len(Q)}")

# ---------------- Parser: HCM_MCQ_Question_Bank ----------------
def parse_hcm_mcq_bank():
    path = os.path.join(EX, "HCM_MCQ_Question_Bank.txt")
    text = open(path, encoding="utf-8", errors="replace").read()

    # blocks like "N. [Type] question ... Answer: x"
    parts = re.split(r"(?m)^(\d+)\.\s*\[(Multiple Choice|Multiple Select|True/False|Scenario)\]\s*", text)
    for i in range(1, len(parts) - 2, 3):
        qtype = parts[i + 1]
        body = parts[i + 2]
        m = re.search(r"(?m)^Answer:\s*(.+)$", body)
        if not m:
            continue
        ans_line = m.group(1)
        qbody = body[:m.start()]
        explanation = ""
        em = re.search(r"(?m)^[-–]> ?(.+)$", body[m.end():])
        if em:
            explanation = em.group(1)
        opt_re = re.compile(r"(?m)^\s*([a-eA-E])[.)]\s+(.*)$")
        opts = []; letters = []
        for om in opt_re.finditer(qbody):
            letters.append(om.group(1).upper())
            opts.append(om.group(2))
        if opt_re.search(qbody):
            qtext = qbody[:opt_re.search(qbody).start()]
        else:
            qtext = qbody
        if qtype == "True/False":
            opts = ["True", "False"]
            letters = ["A", "B"]
            answers = []
            if re.match(r"\s*true", ans_line, re.I): answers = [0]
            elif re.match(r"\s*false", ans_line, re.I): answers = [1]
            add("pro-hcm", "HCM MCQ Question Bank", qtext, opts, answers, explanation)
            continue
        answers = []
        mL = re.match(r"\s*([A-Ea-e](?:\s*[,&]\s*[A-Ea-e])*)\b", ans_line)
        if mL:
            for L in re.findall(r"[A-Ea-e]", mL.group(1)):
                L = L.upper()
                if L in letters:
                    answers.append(letters.index(L))
        add("pro-hcm", "HCM MCQ Question Bank", qtext, opts, answers, explanation)

parse_hcm_mcq_bank()
print(f"after HCM_MCQ_Question_Bank: {len(Q)}")

# ---------------- Extra stem sources (for frequency only) ----------------
EXTRA_STEMS = []

def extra_stems():
    path = os.path.join(EX, "HCM_MCQ_Question_Bank.txt")
    text = open(path, encoding="utf-8", errors="replace").read()
    head = text.split("Section 1")[0]
    for m in re.finditer(r"(?m)^\d+\.?\s*(.+)$", head):
        s = m.group(1).strip()
        if s and not re.match(r"^[A-Ea-e][.)]", s):
            EXTRA_STEMS.append(("pro-hcm", "HCM MCQ Question Bank (stems)", s))
    import openpyxl
    try:
        wb = openpyxl.load_workbook(os.path.join(SRC, "HCM_Exam_MCQ_1RS_(1).xlsx"), data_only=True)
        for row in wb["Sheet1"].iter_rows(values_only=True):
            if row and row[0]:
                s = clean(str(row[0]))
                if s and s.lower() not in ("questions",) and len(s) > 15:
                    EXTRA_STEMS.append(("pro-hcm", "HCM Exam MCQ 1RS (stems)", s))
    except Exception as e:
        print("xlsx stems failed:", e)
    path = os.path.join(EX, "Core HCM consolidated question set.txt")
    text = open(path, encoding="utf-8", errors="replace").read()
    for m in re.finditer(r"(?m)^a?\d{1,3}[.)]\s+(.+)$", text):
        s = m.group(1).strip()
        if len(s) > 25 and ("?" in s or s.lower().startswith(("what","which","how","who","when","where","why","whom"))):
            EXTRA_STEMS.append(("pro-hcm", "Core HCM Consolidated Notes (stems)", s))
    try:
        wb = openpyxl.load_workbook(os.path.join(SRC, "Data_load_consolidated_questions_(1)_(1).xlsx"), data_only=True)
        for row in wb["Sheet1"].iter_rows(values_only=True):
            if row and row[0]:
                s = clean(str(row[0]))
                if s and s.lower() != "questions" and len(s) > 15:
                    EXTRA_STEMS.append(("hcm-data-loading", "Data Load Consolidated Q&A (stems)", s))
    except Exception as e:
        print("dl xlsx stems failed:", e)

extra_stems()
print("extra stems:", len(EXTRA_STEMS))

# ---------------- Merge, cluster, dedupe ----------------
def token_set(t):
    return set(norm_key(t).split())

all_items = []
for q in Q:
    all_items.append({"question": q["question"], "source": q["source"], "exam": q["exam"], "ref": q})
for exam, source, s in EXTRA_STEMS:
    all_items.append({"question": s, "source": source, "exam": exam, "ref": None})

clusters = []
for item in all_items:
    nk = norm_key(item["question"])
    if len(nk) < 12:
        clusters.append([item]); continue
    ts = token_set(item["question"])
    found = None
    for cl in clusters:
        rep = cl[0]
        r_nk = norm_key(rep["question"])
        r = difflib.SequenceMatcher(None, nk, r_nk).ratio()
        if r >= 0.80:
            found = cl; break
        r_ts = token_set(rep["question"])
        jac = len(ts & r_ts) / max(1, len(ts | r_ts))
        if jac >= 0.62:
            found = cl; break
    if found is not None:
        found.append(item)
    else:
        clusters.append([item])

print("clusters:", len(clusters))

final = []
for ci, cl in enumerate(clusters):
    answered = [it for it in cl if it["ref"] is not None]
    sources = sorted({it["source"] for it in cl})
    exam_counts = {}
    for it in cl:
        exam_counts[it["exam"]] = exam_counts.get(it["exam"], 0) + 1
    if not answered:
        continue
    rep = max(answered, key=lambda it: (len(it["ref"]["options"]), bool(it["ref"].get("explanation")), len(it["ref"]["question"])))
    ref = rep["ref"]
    final.append({
        "id": "q%04d" % (ci + 1),
        "exam": ref["exam"],
        "question": ref["question"],
        "options": ref["options"],
        "answers": ref["answers"],
        "multi": ref["multi"],
        "explanation": ref.get("explanation", ""),
        "source": ref["source"],
        "sources": sources,
        "repeatCount": len(sources),
        "examVotes": exam_counts,
    })

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(final, f, ensure_ascii=False, indent=1)
from collections import Counter
print("FINAL:", len(final))
print(Counter(q["exam"] for q in final))
print("repeat>=2:", sum(1 for q in final if q["repeatCount"] >= 2))
for exam in ["pro-hcm", "hcm-data-loading"]:
    top = sorted([q for q in final if q["exam"] == exam], key=lambda q: -q["repeatCount"])[:8]
    print("=" * 20, exam)
    for q in top:
        print(q["repeatCount"], "|", q["question"][:95])
