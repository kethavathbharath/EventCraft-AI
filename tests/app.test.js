import { describe, it, expect, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
let w;
beforeEach(() => {
  w = new JSDOM(html, { runScripts: "dangerously", url: "https://localhost/" }).window;
});
const run = (code) => w.eval(code);

describe("budget split", () => {
  it.each(["wedding", "birthday", "community", "engagement", "sangeet", "housewarming", "babyshower", "naming", "anniversary", "festival"])("%s sums to 100%%", (t) => {
    expect(run(`Object.values(SPLIT.${t}).reduce((a,b)=>a+b,0)`)).toBe(100);
  });
  it("generated budget equals the total", () => {
    expect(run(`Object.values(build({type:"wedding",date:"2999-01-01",guests:5,city:"X",budget:100000,theme:"t"}).budget).reduce((a,b)=>a+b,0)`)).toBe(100000);
  });
});

describe("validation", () => {
  const v = (o) => run(`validate(${JSON.stringify({ date: "2999-01-01", guests: 10, city: "Hyd", budget: 50000, ...o })})`);
  it("accepts valid input", () => expect(Object.keys(v({}))).toHaveLength(0));
  it("rejects past dates", () => expect(v({ date: "2000-01-01" }).date).toBeTruthy());
  it("rejects zero guests", () => expect(v({ guests: 0 }).guests).toBeTruthy());
  it("rejects tiny budgets", () => expect(v({ budget: 10 }).budget).toBeTruthy());
  it("rejects empty city", () => expect(v({ city: "" }).city).toBeTruthy());
});

describe("security", () => {
  it("strips angle brackets", () => expect(run(`clean("<img onerror=x>")`)).not.toMatch(/[<>]/));
  it("renders text, never markup", () => {
    const el = run(`h("p",{},"<script>alert(1)</script>")`);
    expect(el.querySelector("script")).toBeNull();
    expect(el.textContent).toContain("<script>");
  });
  it("has no innerHTML use", () => expect(html).not.toMatch(/\.innerHTML\s*=/));
});

describe("timeline and UI", () => {
  it("creates 9 steps", () => {
    expect(run(`build({type:"birthday",date:"2999-01-01",guests:5,city:"X",budget:50000,theme:"t"}).tasks.length`)).toBe(9);
  });
  it("labels every input", () => {
    const d = w.document;
    d.querySelectorAll("#f input, #f select").forEach((i) => expect(d.querySelector(`label[for="${i.id}"]`)).not.toBeNull());
  });
  it("has one h1, a skip link and lang", () => {
    expect(w.document.querySelectorAll("h1")).toHaveLength(1);
    expect(w.document.querySelector(".skip")).not.toBeNull();
    expect(w.document.documentElement.lang).toBe("en");
  });
});

import axe from "axe-core";
describe("accessibility (automated)", () => {
  it("has zero axe violations", async () => {
    w.eval(axe.source);
    const r = await w.axe.run(w.document, { rules: { "color-contrast": { enabled: false } } });
    expect(r.violations).toHaveLength(0);
  });
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  it.each([
    ["light body text", "#2b1710", "#fffdf8"], ["light muted text", "#5e4636", "#fffdf8"], ["light muted on page", "#5e4636", "#fff6e6"],
    ["light button", "#ffffff", "#8a1c2b"], ["light outline button", "#6b1020", "#fffdf8"], ["light heading", "#8a1c2b", "#fff6e6"],
    ["light greeting", "#0b5d5d", "#fff6e6"], ["light error text", "#a4161a", "#fffdf8"], ["light success text", "#1d6b3a", "#fffdf8"],
    ["dark body text", "#fbeedd", "#2a171b"], ["dark muted text", "#d9bfa8", "#2a171b"], ["dark muted on page", "#d9bfa8", "#1c0f12"],
    ["dark button", "#2a1306", "#f2b134"], ["dark outline button", "#ffd27a", "#2a171b"], ["dark heading", "#f2b134", "#1c0f12"],
    ["dark greeting", "#6fe0d2", "#1c0f12"], ["dark error text", "#ff9a9d", "#2a171b"], ["dark success text", "#7be0a1", "#2a171b"],
  ])("%s meets WCAG AA (4.5:1)", (_n, fg, bg) => expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5));
});

describe("end-to-end flow (demo mode)", () => {
  it("sample click builds a full plan and chat refines it", async () => {
    const d = w.document;
    d.querySelector('[data-s="birthday"]').click();
    expect(d.querySelector("#out").hidden).toBe(false);
    expect(d.querySelectorAll("#tl li")).toHaveLength(9);
    expect(d.querySelectorAll("#vbody tr")).toHaveLength(6);
    d.querySelector("#msg").value = "make it outdoor"; d.querySelector("#send").click();
    await new Promise((r) => setTimeout(r, 50));
    expect(d.querySelectorAll("#tl li")).toHaveLength(10);
  });
  it("shows an error for invalid guests", () => {
    const d = w.document; d.querySelector("#guests").value = "0"; d.querySelector("#f").requestSubmit();
    expect(d.querySelector("#e-guests").textContent).not.toBe("");
  });
});

describe("event types", () => {
  it("every dropdown option has a budget split and ideas, and builds a plan", () => {
    const vals = [...w.document.querySelectorAll("#type option")].map((o) => o.value);
    expect(vals.length).toBeGreaterThanOrEqual(10);
    for (const t of vals) {
      expect(run(`!!SPLIT.${t} && !!IDEAS.${t}`)).toBe(true);
      expect(run(`build({type:"${t}",date:"2999-01-01",guests:50,city:"Hyderabad",budget:200000,theme:"marigold"}).ideas.length`)).toBeGreaterThanOrEqual(5);
      expect(run(`Object.values(build({type:"${t}",date:"2999-01-01",guests:50,city:"X",budget:200000,theme:"t"}).budget).reduce((a,b)=>a+b,0)`)).toBe(200000);
    }
  });
});

describe("saved plans (save / list / open / delete / persist)", () => {
  const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
  const gen = (d, t = "wedding") => { d.querySelector(`[data-s="${t}"]`).click(); };

  it("shows an empty state first", () => {
    expect(w.document.querySelector("#sv-empty").hidden).toBe(false);
    expect(w.document.querySelectorAll("#saved li")).toHaveLength(0);
  });
  it("saves a named plan and lists it", () => {
    const d = w.document; gen(d); d.querySelector("#pname").value = "Riya & Arjun shaadi"; d.querySelector("#save").click();
    expect(d.querySelectorAll("#saved li")).toHaveLength(1);
    expect(d.querySelector("#saved li").textContent).toContain("Riya & Arjun shaadi");
    expect(d.querySelector("#sv-empty").hidden).toBe(true);
    expect(d.querySelector("#sv-status").textContent).toContain("Saved");
  });
  it("updates instead of duplicating when the name repeats; keeps separate plans otherwise", () => {
    const d = w.document; gen(d); d.querySelector("#pname").value = "A"; d.querySelector("#save").click(); d.querySelector("#save").click();
    expect(d.querySelectorAll("#saved li")).toHaveLength(1);
    gen(d, "community"); d.querySelector("#pname").value = "B"; d.querySelector("#save").click();
    expect(d.querySelectorAll("#saved li")).toHaveLength(2);
  });
  it("opens a saved plan with its edits (budget, tasks, vendors, chat)", async () => {
    const d = w.document; gen(d, "birthday");
    d.querySelector("#t0").click();
    d.querySelector("#vbody select").value = "Booked"; d.querySelector("#vbody select").dispatchEvent(new w.Event("change"));
    d.querySelector("#msg").value = "make it cheaper"; d.querySelector("#send").click(); await tick();
    d.querySelector("#pname").value = "Bday"; d.querySelector("#save").click();
    gen(d, "wedding");                       // overwrite the working plan
    d.querySelector("#saved li button").click();   // Open
    expect(d.querySelector("#type").value).toBe("birthday");
    expect(d.querySelector("#t0").checked).toBe(true);
    expect(d.querySelector("#vbody select").value).toBe("Booked");
    expect(d.querySelector("#log").textContent).toContain("cheaper");
  });
  it("deletes a saved plan", () => {
    const d = w.document; gen(d); d.querySelector("#pname").value = "Gone"; d.querySelector("#save").click();
    d.querySelectorAll("#saved li")[0].querySelector("button.alt").click();
    expect(d.querySelectorAll("#saved li")).toHaveLength(0);
    expect(d.querySelector("#sv-status").textContent).toContain("Deleted");
  });
  it("persists across a page reload (saved list and current plan)", () => {
    const d = w.document; gen(d); d.querySelector("#pname").value = "Persist"; d.querySelector("#save").click();
    const snap = { ...w.localStorage };
    const w2 = new JSDOM(html, { runScripts: "dangerously", url: "https://localhost/", beforeParse(win) { for (const k in snap) win.localStorage.setItem(k, snap[k]); } }).window;
    expect(w2.document.querySelectorAll("#saved li")).toHaveLength(1);
    expect(w2.document.querySelector("#out").hidden).toBe(false);
    expect(w2.document.querySelector("#city").value).toBe("Hyderabad");
  });
  it("ignores corrupted saved data safely", () => {
    const w2 = new JSDOM(html, { runScripts: "dangerously", url: "https://localhost/", beforeParse(win) { win.localStorage.setItem("eventcraft-plans", '[{"id":"x","plan":{}},"junk"]'); win.localStorage.setItem("eventcraft", "{bad"); } }).window;
    expect(w2.document.querySelectorAll("#saved li")).toHaveLength(0);
    expect(w2.document.querySelector("#out").hidden).toBe(true);
  });
  it("clear current plan hides the plan but keeps saved plans", () => {
    const d = w.document; gen(d); d.querySelector("#pname").value = "Keep"; d.querySelector("#save").click();
    d.querySelector("#reset").click();
    expect(d.querySelector("#out").hidden).toBe(true);
    expect(d.querySelectorAll("#saved li")).toHaveLength(1);
  });
});

describe("other functions", () => {
  it("budget edits update total, share and over-budget warning", () => {
    const d = w.document; d.querySelector('[data-s="wedding"]').click();
    const inp = d.querySelector("#b-Venue"); inp.value = "99999999"; inp.dispatchEvent(new w.Event("input"));
    expect(d.querySelector("#btot").textContent).toContain("Over budget");
    inp.value = "0"; inp.dispatchEvent(new w.Event("input"));
    expect(d.querySelector("#btot").textContent).toContain("left");
  });
  it("timeline progress updates", () => {
    const d = w.document; d.querySelector('[data-s="community"]').click(); d.querySelector("#t1").click(); d.querySelector("#t2").click();
    expect(d.querySelector("#tprog").textContent).toBe("2 of 9 steps done");
  });
  it("download falls back to print when the host download is unavailable", async () => {
    const d = w.document; let printed = 0; w.print = () => printed++;
    d.querySelector('[data-s="wedding"]').click(); d.querySelector("#dl").click(); await new Promise((r) => setTimeout(r, 30));
    expect(printed).toBe(1);
  });
  it("chat handles cheaper, vegan, outdoor and unknown requests", async () => {
    const d = w.document; d.querySelector('[data-s="wedding"]').click();
    for (const m of ["make it cheaper", "add a vegan menu", "make it outdoor", "tell me a joke"]) { d.querySelector("#msg").value = m; d.querySelector("#send").click(); await new Promise((r) => setTimeout(r, 10)); }
    const log = d.querySelector("#log").textContent;
    expect(log).toContain("trimmed"); expect(log).toContain("vegan"); expect(log).toContain("rain-plan"); expect(log).toContain("I can handle");
  });
  it("self-test button reports only PASS", () => {
    const d = w.document; d.querySelector("#tests").click();
    expect(d.querySelector("#tres").textContent).toMatch(/PASS/); expect(d.querySelector("#tres").textContent).not.toMatch(/FAIL/);
  });
});
