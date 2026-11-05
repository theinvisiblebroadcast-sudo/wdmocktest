

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
