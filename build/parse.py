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
