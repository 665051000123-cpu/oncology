import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE_URL = window.location.origin;

const emptyPatient = {
  hn: "",
  name: "",
  height: "",
  weight: ""
};

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("appThemeMode") || "dark");
  const [step, setStep] = useState("checkin");
  const [patient, setPatient] = useState(emptyPatient);
  const [formula, setFormula] = useState("mosteller");
  const [amputationState, setAmputationState] = useState("none");
  const [ampLevel, setAmpLevel] = useState("below_knee");
  const [ampMethod, setAmpMethod] = useState("weight_method");
  const [drug, setDrug] = useState("vincristine");
  const [targetAuc, setTargetAuc] = useState("5");
  const [gfrValue, setGfrValue] = useState("");
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [newestLogId, setNewestLogId] = useState(null);

  useEffect(() => {
    document.body.classList.toggle("light-mode", theme === "light");
    localStorage.setItem("appThemeMode", theme);
  }, [theme]);

  useEffect(() => {
    refreshLogs();
  }, []);

  const patientName = patient.name.trim() || "ไม่ประสงค์ระบุชื่อ";

  const bannerStats = useMemo(() => {
    return `ส่วนสูง: ${patient.height || "-"} cm | น้ำหนักจริง: ${patient.weight || "-"} kg`;
  }, [patient.height, patient.weight]);

  async function refreshLogs() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/logs`);
      const databaseLogs = response.data.logs || response.data;
      localStorage.setItem("clinicalDoseHistoryLogs", JSON.stringify(databaseLogs));
      setLogs(databaseLogs);
    } catch (error) {
      console.warn("Using localStorage logs because database is unavailable:", error.message);
      setLogs(JSON.parse(localStorage.getItem("clinicalDoseHistoryLogs")) || []);
    }
  }

  async function saveLogToDatabase(logObject) {
    try {
      await axios.post(`${API_BASE_URL}/api/logs`, logObject);
    } catch (error) {
      console.warn("Saved locally only because database is unavailable:", error.message);
    }
  }

  async function clearDatabaseLogs() {
    try {
      await axios.delete(`${API_BASE_URL}/api/logs`);
    } catch (error) {
      console.warn("Cleared local logs only because database is unavailable:", error.message);
    }
  }

  function updatePatient(field, value) {
    setPatient((current) => ({ ...current, [field]: value }));
  }

  function startWorkspace() {
    const height = Number(patient.height);
    const weight = Number(patient.weight);

    if (!patient.hn.trim()) {
      alert("กรุณาระบุหมายเลข HN ของผู้ป่วยเพื่อเข้าใช้งานระบบค่ะ");
      return;
    }

    if (!height || !weight || height <= 0 || weight <= 0) {
      alert('กรุณากรอก "ส่วนสูง" และ "น้ำหนักจริง" ให้ถูกต้องก่อนค่ะ');
      return;
    }

    setStep("workspace");
  }

  function resetPatient() {
    if (!confirm("ต้องการเปลี่ยนเคสผู้ป่วยและออกจากหน้าประมวลผลนี้ใช่หรือไม่?")) return;
    setPatient(emptyPatient);
    setResult(null);
    setStep("checkin");
  }

  function processClinicalWorkflow() {
    const height = Number(patient.height);
    const weight = Number(patient.weight);
    let calculatedWeight = weight;
    let bsaAdjustmentFactor = 1;
    let ampSummaryText = "ไม่มีประวัติตัดแขนขา";

    if (amputationState === "amputee") {
      const weightFactor = ampLevel === "below_knee" ? 0.06 : 0.15;
      const bsaFactor = ampLevel === "below_knee" ? 0.09 : 0.18;
      const levelText = ampLevel === "below_knee" ? "BK" : "AK";

      if (ampMethod === "weight_method") {
        calculatedWeight = weight * (1 - weightFactor);
        ampSummaryText = `ตัดขา (${levelText}) ปรับลดแบบ Weight Method`;
      } else {
        bsaAdjustmentFactor = 1 - bsaFactor;
        ampSummaryText = `ตัดขา (${levelText}) ปรับลดแบบ BSA Method`;
      }
    }

    let bsa = formula === "mosteller"
      ? Math.sqrt((height * calculatedWeight) / 3600)
      : 0.20247 * Math.pow(height / 100, 0.725) * Math.pow(calculatedWeight, 0.425);

    bsa *= bsaAdjustmentFactor;

    let dose = 0;
    let unit = "mg";
    let drugRuleText = "";

    if (drug === "vincristine") {
      dose = bsa * 1.4;
      if (dose > 2) {
        dose = 2;
        drugRuleText = "ขนาดยาเกินเพดานมาตรฐาน จึงจำกัด Dose Cap สูงสุดไม่เกิน 2.0 mg เพื่อความปลอดภัย";
      } else {
        drugRuleText = "คำนวณตามมาตรฐาน BSA x 1.4 mg";
      }
    }

    if (drug === "carboplatin") {
      const auc = Number(targetAuc) || 5;
      const gfr = Number(gfrValue);

      if (Number.isNaN(gfr) || gfr < 0 || gfrValue === "") {
        alert("กรุณาระบุค่า Clearance (GFR) เพื่อคำนวณสูตร Calvert ของ Carboplatin ค่ะ");
        return;
      }

      const gfrCalc = gfr > 125 ? 125 : gfr;
      dose = auc * (gfrCalc + 25);
      drugRuleText = gfr > 125
        ? "ตรวจพบค่า GFR สูงเกินเกณฑ์ จึงจำกัด GFR สูงสุดที่ 125 ml/min"
        : "ประมวลผลผ่าน Calvert Equation เรียบร้อย";
    }

    if (drug === "bleomycin") {
      dose = 30;
      unit = "units";
      drugRuleText = "กำหนดขนาดยาคงที่แบบ Fixed Dose ที่ 30 units";
    }

    const logObject = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString("th-TH"),
      hn: patient.hn.trim(),
      patientName,
      formulaUsed: formula === "mosteller" ? "Mosteller" : "DuBois",
      calculatedBsaM2: Number(bsa.toFixed(4)),
      prescribedDose: `${dose.toFixed(2)} ${unit}`,
      clinicalNote: drugRuleText
    };

    const nextLogs = [logObject, ...logs];
    setLogs(nextLogs);
    setNewestLogId(logObject.id);
    setResult({
      bsa: bsa.toFixed(4),
      dose: dose.toFixed(2),
      unit,
      formulaUsed: logObject.formulaUsed,
      ampSummaryText,
      drugRuleText
    });
    localStorage.setItem("clinicalDoseHistoryLogs", JSON.stringify(nextLogs));
    saveLogToDatabase(logObject);
  }

  function printDailyLog() {
    if (logs.length === 0) {
      alert("ไม่สามารถพิมพ์รายงานได้ เนื่องจากยังไม่มีประวัติการบันทึกข้อมูลผู้ป่วยในเซสชันนี้ค่ะ");
      return;
    }

    window.print();
  }

  function clearLogs() {
    if (!confirm("โปรดยืนยัน: คุณต้องการล้างบันทึกประวัติการทวนสอบยาทั้งหมดใช่หรือไม่?")) return;
    localStorage.removeItem("clinicalDoseHistoryLogs");
    setLogs([]);
    setNewestLogId(null);
    clearDatabaseLogs();
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <button className="theme-toggle" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        {theme === "light" ? "Light Mode" : "Dark Mode"}
      </button>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pt-14">
        <PrintHeader />

        {step === "checkin" ? (
          <PatientCheckIn patient={patient} updatePatient={updatePatient} onContinue={startWorkspace} />
        ) : (
          <>
            <PatientBanner
              hn={patient.hn}
              name={patientName}
              stats={bannerStats}
              onBack={resetPatient}
            />

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <FormulaPanel formula={formula} setFormula={setFormula} />
                <AmputationPanel
                  state={amputationState}
                  setState={setAmputationState}
                  ampLevel={ampLevel}
                  setAmpLevel={setAmpLevel}
                  ampMethod={ampMethod}
                  setAmpMethod={setAmpMethod}
                />
                <DrugPanel
                  drug={drug}
                  setDrug={setDrug}
                  targetAuc={targetAuc}
                  setTargetAuc={setTargetAuc}
                  gfrValue={gfrValue}
                  setGfrValue={setGfrValue}
                />
              </div>

              <ResultPanel result={result} onVerify={processClinicalWorkflow} />
            </section>

            <LogPanel logs={logs} newestLogId={newestLogId} onPrint={printDailyLog} onClear={clearLogs} />
          </>
        )}
      </div>

      <footer className="py-6 text-center font-mono text-xs font-bold text-slate-500">
        Encrypted Clinical Calculation Environment - RAM2 HOSPITAL Authorized Use Only
      </footer>
    </main>
  );
}

function PrintHeader() {
  return (
    <div className="print-header">
      <h1>รายงานบันทึกประวัติการตรวจสอบขนาดยาเคมีบำบัดประจำวัน - โรงพยาบาลราม 2</h1>
      <p>วันที่และเวลาออกรายงาน: {new Date().toLocaleString("th-TH")}</p>
    </div>
  );
}

function PatientCheckIn({ patient, updatePatient, onContinue }) {
  return (
    <section className="panel mx-auto w-full max-w-xl p-6 md:p-10">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-black">Patient Check-in</h1>
        <p className="mt-2 text-lg font-bold text-slate-300">กรอกข้อมูลผู้ป่วยก่อนเข้าสู่หน้าคำนวณและทวนสอบขนาดยา</p>
      </div>

      <div className="space-y-5">
        <Field label="หมายเลข HN ผู้ป่วย" required>
          <input value={patient.hn} onChange={(event) => updatePatient("hn", event.target.value)} placeholder="ระบุ HN" />
        </Field>
        <Field label="ชื่อ - นามสกุล ผู้ป่วย">
          <input value={patient.name} onChange={(event) => updatePatient("name", event.target.value)} placeholder="ระบุชื่อ-นามสกุล" />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="ส่วนสูง" required suffix="cm">
            <input type="number" value={patient.height} onChange={(event) => updatePatient("height", event.target.value)} placeholder="0" />
          </Field>
          <Field label="น้ำหนักจริงวันนี้" required suffix="kg">
            <input type="number" value={patient.weight} onChange={(event) => updatePatient("weight", event.target.value)} placeholder="0" />
          </Field>
        </div>
        <button className="primary-button w-full" onClick={onContinue}>เข้าสู่หน้าทวนสอบยา</button>
      </div>
    </section>
  );
}

function PatientBanner({ hn, name, stats, onBack }) {
  return (
    <section className="banner">
      <div className="flex items-center gap-4">
        <span className="h-4 w-4 rounded-full bg-emerald-500" />
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded bg-sky-600/30 px-2.5 py-1 font-mono text-sm font-black text-sky-300">{hn}</span>
            <h2 className="text-xl font-black">{name}</h2>
          </div>
          <p className="mt-1 font-mono text-base font-extrabold text-slate-300">{stats}</p>
        </div>
      </div>
      <button className="secondary-button" onClick={onBack}>เปลี่ยนเคส</button>
    </section>
  );
}

function FormulaPanel({ formula, setFormula }) {
  return (
    <Panel index="02" title="สูตรคำนวณพื้นที่ผิวร่างกาย (BSA Formula)">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <RadioCard checked={formula === "mosteller"} onClick={() => setFormula("mosteller")} title="Mosteller Formula" detail="BSA = SQRT((H x W) / 3600)" />
        <RadioCard checked={formula === "dubois"} onClick={() => setFormula("dubois")} title="DuBois Formula" detail="BSA = 0.20247 x H^0.725 x W^0.425" />
      </div>
    </Panel>
  );
}

function AmputationPanel({ state, setState, ampLevel, setAmpLevel, ampMethod, setAmpMethod }) {
  return (
    <Panel index="03" title="ตรวจสอบภาวะสูญเสียอวัยวะ (Amputation Status)">
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <RadioCard checked={state === "none"} onClick={() => setState("none")} title="ปกติ (None)" />
        <RadioCard checked={state === "amputee"} onClick={() => setState("amputee")} title="มีประวัติตัดแขนขา" />
      </div>

      {state === "amputee" && (
        <div className="sub-panel grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="ระดับการตัดอวัยวะ">
            <select value={ampLevel} onChange={(event) => setAmpLevel(event.target.value)}>
              <option value="below_knee">Below Knee (BK)</option>
              <option value="above_knee">Above Knee (AK)</option>
            </select>
          </Field>
          <Field label="รูปแบบการคำนวณปรับค่า">
            <select value={ampMethod} onChange={(event) => setAmpMethod(event.target.value)}>
              <option value="weight_method">Weight Method</option>
              <option value="bsa_method">BSA Method</option>
            </select>
          </Field>
        </div>
      )}
    </Panel>
  );
}

function DrugPanel({ drug, setDrug, targetAuc, setTargetAuc, gfrValue, setGfrValue }) {
  return (
    <Panel index="04" title="การเลือกสูตรยาเคมีบำบัด (Drug-Specific Rules)">
      <Field label="เลือกยาเคมีบำบัดเพื่อตรวจเช็ก Dose Cap">
        <select value={drug} onChange={(event) => setDrug(event.target.value)}>
          <option value="vincristine">VINCRISTINE (Dose Cap สูงสุด 2.0 mg)</option>
          <option value="carboplatin">CARBOPLATIN (Calvert Formula / Cap GFR 125)</option>
          <option value="bleomycin">BLEOMYCIN (Fixed Dose 30 units)</option>
        </select>
      </Field>

      {drug === "carboplatin" && (
        <div className="sub-panel mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Target AUC">
            <input type="number" step="0.5" value={targetAuc} onChange={(event) => setTargetAuc(event.target.value)} />
          </Field>
          <Field label="ค่า CrCl / GFR (ml/min)">
            <input type="number" value={gfrValue} onChange={(event) => setGfrValue(event.target.value)} placeholder="ระบุค่า GFR" />
          </Field>
        </div>
      )}
    </Panel>
  );
}

function ResultPanel({ result, onVerify }) {
  return (
    <aside className="panel h-fit p-6 lg:sticky lg:top-6">
      <h2 className="mb-4 text-center text-base font-black uppercase tracking-wide text-slate-200">Clinical Result Summary</h2>
      <div className="result-box">
        <div>
          <span>Final BSA Result</span>
          <strong className="text-emerald-400">{result?.bsa || "0.0000"} <small>m²</small></strong>
        </div>
        <div>
          <span>Calculated Output Dose</span>
          <strong className="text-amber-400">{result?.dose || "0.00"} <small>{result?.unit || "mg"}</small></strong>
        </div>
      </div>
      <button className="primary-button mt-5 w-full bg-emerald-600 hover:bg-emerald-500" onClick={onVerify}>คำนวณและบันทึกข้อมูล</button>

      {result && (
        <div className="mt-5 space-y-3 border-t-2 border-slate-700 pt-4 text-base font-bold">
          <SummaryRow label="สูตรพื้นที่ผิวที่ใช้" value={result.formulaUsed} />
          <SummaryRow label="ภาวะสูญเสียอวัยวะ" value={result.ampSummaryText} />
          <div className="rounded-lg border border-amber-900/60 bg-amber-950/40 p-4 text-sm leading-relaxed text-amber-300">
            <strong>Pharmacist Note:</strong> <span className="text-slate-200"> {result.drugRuleText}</span>
          </div>
        </div>
      )}
    </aside>
  );
}

function LogPanel({ logs, newestLogId, onPrint, onClear }) {
  return (
    <section className="panel p-6">
      <div className="mb-5 flex flex-col justify-between gap-4 border-b border-slate-700/50 pb-4 md:flex-row md:items-center">
        <h3 className="text-base font-black uppercase tracking-wide text-slate-200">ประวัติการตรวจสอบขนาดยาเคมีบำบัด <span className="font-mono text-sm">(Pharmacist Verification Log)</span></h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="secondary-button" onClick={onPrint}>พิมพ์รายงานประจำวัน</button>
          <button className="danger-button" onClick={onClear}>ล้างประวัติทั้งหมด</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border-2 border-slate-700 bg-[#0b1329]">
        <table className="w-full border-collapse text-left text-sm text-slate-200">
          <thead>
            <tr className="border-b-2 border-slate-700 bg-slate-900 text-slate-300">
              <th>Timestamp</th>
              <th>HN ผู้ป่วย</th>
              <th>ชื่อ-สกุล</th>
              <th className="text-center">BSA (m²)</th>
              <th className="text-center">สูตรยา</th>
              <th className="text-right">ขนาดยาคำนวณสุทธิ</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan="6" className="p-6 text-center font-mono text-lg font-bold text-slate-500">No data logged in this browser session.</td></tr>
            ) : logs.map((item) => (
              <tr key={item.id || item.clientLogId} className={item.id === newestLogId ? "animate-row-in" : ""}>
                <td className="font-mono text-slate-300">{item.timestamp}</td>
                <td className="font-mono font-black text-sky-400">{item.hn}</td>
                <td>{item.patientName}</td>
                <td className="text-center font-mono font-black text-emerald-400">{item.calculatedBsaM2}</td>
                <td className="text-center font-mono text-sm uppercase text-slate-300">{item.formulaUsed}</td>
                <td className="text-right font-mono font-black text-amber-400">{item.prescribedDose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="print-signoff">
        <p>พิมพ์รายงานโดย: ........................................................................... เภสัชกรผู้ทวนสอบ</p>
        <p>( ........................................................................... ) Verifying Pharmacist</p>
      </div>
    </section>
  );
}

function Panel({ index, title, children }) {
  return (
    <section className="panel p-6">
      <div className="mb-4 flex items-center gap-3 border-b border-slate-700 pb-3">
        <span className="rounded bg-sky-600/20 px-2.5 py-1 text-base font-bold text-sky-300">{index}</span>
        <h2 className="text-lg font-black">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, required, suffix, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-extrabold">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      <span className="relative block">
        {children}
        {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-base font-bold text-slate-400">{suffix}</span>}
      </span>
    </label>
  );
}

function RadioCard({ checked, onClick, title, detail }) {
  return (
    <button type="button" className={`radio-card ${checked ? "selected" : ""}`} onClick={onClick}>
      <span>{title}</span>
      {detail && <p>{detail}</p>}
    </button>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-700/50 pb-2">
      <span className="text-slate-400">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
