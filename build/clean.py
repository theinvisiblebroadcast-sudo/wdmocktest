# -*- coding: utf-8 -*-
"""Post-process the final bank: text cleanup + exact dedup + regenerate data.js"""
import json, re, os

SRC = r"C:\Users\mskmu\Downloads\WD Study Materials"
IN = os.path.join(SRC, "wd-mock-exam", "build", "bank_raw.json")
OUT_JSON = os.path.join(SRC, "wd-mock-exam", "build", "bank_clean.json")
OUT_JS = os.path.join(SRC, "wd-mock-exam", "js", "data.js")

F = json.load(open(IN, encoding="utf-8"))

def clean_q(t):
    t = re.sub(r"^Situational/Scenario-Based Questions \(\d+-\d+\)\s*", "", t)
    t = re.sub(r"^\[(Scenario|Multiple Choice|Multiple Select|True/False)\]\s*", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t

def norm(t):
    t = t.lower()
    t = re.sub(r"[^a-z0-9 ]", " ", t)
    return re.sub(r"\s+", " ", t).strip()

seen = {}
for q in F:
    q["question"] = clean_q(q["question"])
    # drop orphan prefixes that lost their question body
    seen_key = (q["exam"], norm(q["question"]))
    if seen_key in seen:
        # merge source lists
        other = seen[seen_key]
        merged = sorted(set(other["sources"]) | set(q["sources"]))
        other["sources"] = merged
        other["repeatCount"] = len(merged)
        if len(q["options"]) > len(other["options"]):
            other.update({"options": q["options"], "answers": q["answers"], "multi": q["multi"]})
        if len(q.get("explanation", "")) > len(other.get("explanation", "")):
            other["explanation"] = q["explanation"]
        q["_drop"] = True
    else:
        seen[seen_key] = q

final = [q for q in F if not q.get("_drop")]
for i, q in enumerate(final):
    q.pop("_drop", None)
    q["id"] = "q%04d" % (i + 1)

with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(final, f, ensure_ascii=False, indent=1)

out = {"pro-hcm": [], "hcm-data-loading": []}
for q in final:
    out[q["exam"]].append(q)
js = "/* Generated from parsed Workday study sources. Do not edit by hand. */\nwindow.WD_DATA = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n"
open(OUT_JS, "w", encoding="utf-8").write(js)

from collections import Counter
print("final:", len(final), Counter(q["exam"] for q in final))
print("repeat>=2:", sum(1 for q in final if q["repeatCount"] >= 2))
print("js size KB:", os.path.getsize(OUT_JS) // 1024)
bad = [q for q in final if not q["question"] or len(q["options"]) < 2 or not q["answers"]]
print("bad:", len(bad))
print("explanations:", sum(1 for q in final if q["explanation"]), "multi:", sum(1 for q in final if q["multi"]))
