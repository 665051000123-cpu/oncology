import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCalculations } from './utils/useCalculations';
import { Moon, Sun, ChevronRight, ArrowLeft, Printer, Trash2, History, User, Info, LogOut, ArrowUpDown, ChevronUp, ChevronDown, Filter, X, Settings, Pill, Search } from 'lucide-react';
import axios from 'axios';
import Login from './components/Login';
import Notification from './components/Notification';
import AdminUsers from './components/AdminUsers';
import ChangePassword from './components/ChangePassword';
import DrugsInfo from './components/DrugsInfo';

const API_BASE = '/api';

const sanitizeNaN = (val) => {
    if (val === null || val === undefined) return 'ว่าง';
    const str = String(val);
    if (str.toUpperCase() === 'NAN') return 'ว่าง';
    return str.replace(/NaN/g, 'ว่าง');
};

const formatBsa = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'ว่าง';
    return val.toFixed(4);
};

function App() {
    const [theme, setTheme] = useState(localStorage.getItem('appThemeMode') || 'light');
    const [step, setStep] = useState('auth'); // 'auth', 'login' (patient check-in), 'workspace'
    const [user, setUser] = useState(null);
    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [patient, setPatient] = useState({ hn: '', title: '', name: '', height: '', weight: '', gender: '', age: '' });
    const [logs, setLogs] = useState([]);
    const [notification, setNotification] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [patients, setPatients] = useState([]);
    const [patientSearch, setPatientSearch] = useState('');
    const lastAutofilledHnRef = useRef('');
    const [prevStats, setPrevStats] = useState({ height: '', weight: '' });
    const [deleteConfirmLog, setDeleteConfirmLog] = useState(null);
    const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
    const [timeoutCountdown, setTimeoutCountdown] = useState(30);

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
    };

    // Check for persisted session
    useEffect(() => {
        const savedUser = localStorage.getItem('oncology_user');
        if (savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);
                setStep('login');
            } catch (e) {
                console.error("Failed to parse saved user", e);
                localStorage.removeItem('oncology_user');
            }
        }
    }, []);

    // HTML5 History API integration for browser back/forward buttons
    useEffect(() => {
        const handlePopState = (event) => {
            if (event.state && event.state.step) {
                setStep(event.state.step);
            } else {
                setStep('auth');
            }
        };
        window.addEventListener('popstate', handlePopState);
        // Set initial state
        window.history.replaceState({ step }, '', '');
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    useEffect(() => {
        if (window.history.state?.step !== step) {
            window.history.pushState({ step }, '', '');
        }
    }, [step]);

    const {
        bsa, setBsa,
        finalDose, setFinalDose,
        calculationDetails, setCalculationDetails,
        calculateBSA, calculateDose
    } = useCalculations();

    const [formula, setFormula] = useState('mosteller');
    const [drug, setDrug] = useState('vincristine');
    const [drugParams, setDrugParams] = useState({ auc: 5, gfr: '' });
    const [amputation, setAmputation] = useState('none');
    const [ampDetails, setAmpDetails] = useState({ level: 'below_knee', method: 'weight_method' });
    const [showDrugInfo, setShowDrugInfo] = useState(false);
    const [showBsaInfo, setShowBsaInfo] = useState(false);
    const [showAmpInfo, setShowAmpInfo] = useState(false);
    const [calcMode, setCalcMode] = useState('single'); // 'single', 'regimen'
    const [selectedRegimen, setSelectedRegimen] = useState('cv'); // 'cv', 'bc'
    const [useAutoGfr, setUseAutoGfr] = useState(false);
    const [patientScr, setPatientScr] = useState('');
    const [multipleDoses, setMultipleDoses] = useState([]);
    const [autoGfrValue, setAutoGfrValue] = useState(null);
    const [formulaFilter, setFormulaFilter] = useState('all');
    const [pharmacistFilter, setPharmacistFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const drugsInfo = [
        {
            id: 'vincristine',
            name: 'VINCRISTINE',
            desc: 'คำนวณตาม BSA พร้อม Dose Cap',
            details: 'Dose = BSA × 1.4 mg/m² (หากผลลัพธ์โดส > 2.0 mg จะทำการจำกัดขนาดยาสูงสุดไว้ที่ 2.0 mg เพื่อป้องกันอาการพิษต่อระบบประสาท)',
            color: 'sky'
        },
        {
            id: 'carboplatin',
            name: 'CARBOPLATIN',
            desc: 'คำนวณผ่าน Calvert Formula',
            details: 'Dose = Target AUC × (eGFR + 25) (จำกัดค่า eGFR สูงสุดไม่เกิน 125 ml/min เพื่อป้องกันภาวะเป็นพิษจากยา)',
            color: 'amber'
        },
        {
            id: 'bleomycin',
            name: 'BLEOMYCIN',
            desc: 'กำหนดขนาดยาคงที่ (Fixed Dose)',
            details: 'ขนาดยาในสูตร BEP Regimen ถูกกำหนดขนาดยาคงที่ไว้ที่ 30 units เสมอ เพื่อความปลอดภัยของปอดผู้ป่วย',
            color: 'purple'
        }
    ];

    // Theme effect
    useEffect(() => {
        if (theme === 'light') {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark');
        } else {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark');
        }
        localStorage.setItem('appThemeMode', theme);
    }, [theme]);

    // Fetch logs on mount
    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await axios.get(`${API_BASE}/logs`);
            if (res.data.success) setLogs(res.data.logs);
        } catch (err) {
            console.error("Failed to fetch logs", err);
        }
    };

    const fetchPatients = async () => {
        try {
            const res = await axios.get(`${API_BASE}/patients`);
            if (res.data.success) setPatients(res.data.patients);
        } catch (err) {
            console.error("Failed to fetch patients", err);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, []);

    useEffect(() => {
        if (step === 'login') {
            fetchPatients();
        }
    }, [step]);

    const filteredPatients = useMemo(() => {
        if (!patientSearch.trim()) return patients;
        const q = patientSearch.toLowerCase();
        return patients.filter(p =>
            (p.hn && p.hn.toLowerCase().includes(q)) ||
            (p.name && p.name.toLowerCase().includes(q))
        );
    }, [patients, patientSearch]);

    const selectPatient = (p) => {
        lastAutofilledHnRef.current = p.hn;
        setPatient({
            hn: p.hn,
            title: p.title || '',
            name: p.name,
            age: p.age || '',
            height: '', // clear for new input
            weight: '', // clear for new input
            gender: p.gender || ''
        });
        setPrevStats({
            height: p.height || '',
            weight: p.weight || ''
        });
        showNotification(`ดึงข้อมูลผู้ป่วย H.N. ${p.hn} เรียบร้อยแล้ว`, "success");
    };

    // Auto-fill when typing an existing H.N.
    useEffect(() => {
        if (!patient.hn) {
            lastAutofilledHnRef.current = '';
            setPrevStats({ height: '', weight: '' });
            return;
        }

        const matched = patients.find(p => p.hn.trim().toLowerCase() === patient.hn.trim().toLowerCase());
        if (matched && matched.hn !== lastAutofilledHnRef.current) {
            setPatient({
                hn: matched.hn,
                title: matched.title || '',
                name: matched.name,
                age: matched.age || '',
                height: '', // clear for new input
                weight: '', // clear for new input
                gender: matched.gender || ''
            });
            setPrevStats({
                height: matched.height || '',
                weight: matched.weight || ''
            });
            lastAutofilledHnRef.current = matched.hn;
            showNotification(`พบข้อมูลผู้ป่วย H.N. ${matched.hn} ในระบบและดึงข้อมูลมากรอกสำเร็จ`, "success");
        }
    }, [patient.hn, patients]);

    // Recalculate BSA and Dose when inputs change
    useEffect(() => {
        let effectiveWeight = parseFloat(patient.weight);
        let currentBsa = calculateBSA(patient.height, effectiveWeight, formula);

        let ampText = 'None';
        if (amputation === 'amputee') {
            const factor = ampDetails.level === 'below_knee' ? 0.06 : 0.15;
            const bsaFactor = ampDetails.level === 'below_knee' ? 0.09 : 0.18;

            if (ampDetails.method === 'weight_method') {
                effectiveWeight = effectiveWeight * (1 - factor);
                currentBsa = calculateBSA(patient.height, effectiveWeight, formula);
                ampText = `Amputee (${ampDetails.level}) - Weight Adj`;
            } else {
                currentBsa = currentBsa * (1 - bsaFactor);
                ampText = `Amputee (${ampDetails.level}) - BSA Adj`;
            }
        }

        setBsa(currentBsa);

        // GFR calculation for Carboplatin
        let effectiveGfr = parseFloat(drugParams.gfr);
        if (useAutoGfr) {
            const ageVal = parseFloat(patient.age);
            const scrVal = parseFloat(patientScr);
            const wtVal = amputation === 'amputee'
                ? parseFloat(patient.weight) * (1 - (ampDetails.level === 'below_knee' ? 0.06 : 0.15))
                : parseFloat(patient.weight);
            if (!isNaN(ageVal) && !isNaN(scrVal) && !isNaN(wtVal) && scrVal > 0) {
                let gfr = ((140 - ageVal) * wtVal) / (72 * scrVal);
                if (patient.gender === 'female') {
                    gfr *= 0.85;
                }
                effectiveGfr = parseFloat(gfr.toFixed(2));
                setAutoGfrValue(effectiveGfr);
            } else {
                effectiveGfr = NaN;
                setAutoGfrValue(null);
            }
        } else {
            setAutoGfrValue(null);
        }

        if (calcMode === 'single') {
            const params = { ...drugParams, gfr: useAutoGfr ? effectiveGfr : drugParams.gfr };
            const { dose, note } = calculateDose(currentBsa, drug, params);
            setFinalDose(dose);
            setMultipleDoses([]);
            setCalculationDetails({
                formulaUsed: formula.toUpperCase(),
                amputation: ampText,
                pharmacistNote: note
            });
        } else {
            // Regimen mode
            if (selectedRegimen === 'cv') {
                const params = { ...drugParams, gfr: useAutoGfr ? effectiveGfr : drugParams.gfr };
                const carbo = calculateDose(currentBsa, 'carboplatin', params);
                const vinc = calculateDose(currentBsa, 'vincristine');

                const combinedNote = [carbo.note, vinc.note].filter(Boolean).join(' | ');

                setFinalDose(`${carbo.dose} mg + ${vinc.dose} mg`);
                setMultipleDoses([
                    { id: 'carboplatin', name: 'CARBOPLATIN', dose: carbo.dose, note: carbo.note },
                    { id: 'vincristine', name: 'VINCRISTINE', dose: vinc.dose, note: vinc.note }
                ]);
                setCalculationDetails({
                    formulaUsed: `CV Regimen | ${formula.toUpperCase()}`,
                    amputation: ampText,
                    pharmacistNote: combinedNote
                });
            } else if (selectedRegimen === 'bc') {
                const params = { ...drugParams, gfr: useAutoGfr ? effectiveGfr : drugParams.gfr };
                const bleo = calculateDose(currentBsa, 'bleomycin');
                const carbo = calculateDose(currentBsa, 'carboplatin', params);

                const combinedNote = [bleo.note, carbo.note].filter(Boolean).join(' | ');

                setFinalDose(`${bleo.dose} units + ${carbo.dose} mg`);
                setMultipleDoses([
                    { id: 'bleomycin', name: 'BLEOMYCIN', dose: bleo.dose, note: bleo.note },
                    { id: 'carboplatin', name: 'CARBOPLATIN', dose: carbo.dose, note: carbo.note }
                ]);
                setCalculationDetails({
                    formulaUsed: `BC Regimen | ${formula.toUpperCase()}`,
                    amputation: ampText,
                    pharmacistNote: combinedNote
                });
            }
        }
    }, [patient, formula, drug, drugParams, amputation, ampDetails, calcMode, selectedRegimen, useAutoGfr, patientScr, calculateBSA, calculateDose, setBsa, setFinalDose, setCalculationDetails]);

    const handleVerify = async () => {
        let doseText = '';
        if (calcMode === 'single') {
            if (drug === 'bleomycin') {
                doseText = `${finalDose} units`;
            } else {
                doseText = `${finalDose} mg`;
            }
        } else {
            doseText = finalDose; // e.g. "120.00 mg + 2.00 mg"
        }

        const title = (patient.title || '').trim();
        let name = (patient.name || '').trim();
        if (title) {
            while (name.startsWith(title)) {
                name = name.substring(title.length).trim();
            }
            name = `${title} ${name}`;
        } else {
            name = name || 'ไม่ระบุชื่อ';
        }

        const logData = {
            timestamp: getFormattedThaiTimestamp(),
            hn: patient.hn,
            patientName: name,
            calculatedBsaM2: formatBsa(bsa),
            formulaUsed: sanitizeNaN(`${calculationDetails.formulaUsed} | ${calculationDetails.amputation}`),
            prescribedDose: sanitizeNaN(doseText),
            userName: user.name || user.username,
            gender: patient.gender,
            age: patient.age
        };

        try {
            await axios.post(`${API_BASE}/logs`, logData);
            fetchLogs();
            showNotification("บันทึกข้อมูลเรียบร้อยแล้ว", "success");
        } catch (err) {
            console.error("Save Error:", err);
            showNotification(`เกิดข้อผิดพลาดในการบันทึก: ${err.response?.data?.message || err.message}`, "error");
        }
    };

    const handleLogout = async () => {
        try {
            if (user && user.employee_id) {
                await axios.post(`${API_BASE}/logout`, { employee_id: user.employee_id });
            }
        } catch (err) {
            console.error("Failed to log logout activity:", err);
        }
        localStorage.removeItem('oncology_user');
        setUser(null);
        setStep('auth');
    };

    const lastActivityRef = useRef(Date.now());

    // Inactivity / Session Timeout tracking
    useEffect(() => {
        if (!user) {
            setShowTimeoutWarning(false);
            return;
        }

        // Reset activity timestamp upon login / session start
        lastActivityRef.current = Date.now();

        // Reset inactivity timer on any interaction event
        const resetTimer = () => {
            lastActivityRef.current = Date.now();
        };

        const events = ['mousemove', 'keydown', 'mousedown', 'click', 'scroll', 'touchstart'];
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Interval to check inactivity every second
        const checkInterval = setInterval(() => {
            const elapsed = Date.now() - lastActivityRef.current;
            const timeoutLimit = 3600000; // 1 hour
            const warningLimit = 3570000; // 59 minutes 30 seconds (show warning 30 seconds before)

            if (elapsed >= timeoutLimit) {
                // Time is up! Clean up and logout.
                clearInterval(checkInterval);
                setShowTimeoutWarning(false);
                handleLogout();
                showNotification("เซสชันหมดเวลาเนื่องจากไม่มีการใช้งานระบบ", "warning");
            } else if (elapsed >= warningLimit) {
                // Show warning and update countdown seconds
                const remainingSecs = Math.ceil((timeoutLimit - elapsed) / 1000);
                setShowTimeoutWarning(true);
                setTimeoutCountdown(remainingSecs > 0 ? remainingSecs : 0);
            } else {
                // User is active, hide warning modal if it was open
                setShowTimeoutWarning(false);
            }
        }, 1000);

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
            clearInterval(checkInterval);
        };
    }, [user]);

    const handleDeleteLog = (log) => {
        if (!user || user.role?.toUpperCase() !== 'ADMIN') return;
        setDeleteConfirmLog(log);
    };

    const handleDeleteConfirm = async (logId) => {
        try {
            await axios.delete(`${API_BASE}/admin/logs/${logId}`, {
                headers: { 'x-employee-id': user.employee_id }
            });
            showNotification("ลบประวัติการคำนวณสำเร็จ", "success");
            fetchLogs();
        } catch (err) {
            console.error("Failed to delete log:", err);
            showNotification(`ไม่สามารถลบประวัติการคำนวณได้: ${err.response?.data?.message || err.message}`, "error");
        }
    };

    const handlePatientCheckIn = async () => {
        const finalHeight = patient.height || prevStats.height;
        const finalWeight = patient.weight || prevStats.weight;

        if (!patient.hn || !finalHeight || !finalWeight) {
            showNotification("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน", "error");
            return;
        }

        // Clean up title duplicate prefixes from patient's name
        const cleanedTitle = (patient.title || '').trim();
        let cleanedName = (patient.name || '').trim();
        if (cleanedTitle) {
            while (cleanedName.startsWith(cleanedTitle)) {
                cleanedName = cleanedName.substring(cleanedTitle.length).trim();
            }
        }

        const h = parseFloat(finalHeight);
        const w = parseFloat(finalWeight);
        if (isNaN(h) || h < 30 || h > 250) {
            showNotification("ค่าส่วนสูงผิดปกติ! โปรดตรวจสอบข้อมูลอีกครั้ง (30 - 250 cm)", "error");
            return;
        }
        if (isNaN(w) || w < 2 || w > 300) {
            showNotification("ค่าน้ำหนักผิดปกติ! โปรดตรวจสอบข้อมูลอีกครั้ง (2 - 300 kg)", "error");
            return;
        }
        if (patient.age) {
            const age = parseFloat(patient.age);
            if (isNaN(age) || age < 1 || age > 120) {
                showNotification("ค่าอายุผิดปกติ! โปรดตรวจสอบข้อมูลอีกครั้ง (1 - 120 ปี)", "error");
                return;
            }
        }
        
        const updatedPatient = {
            ...patient,
            name: cleanedName,
            height: String(finalHeight),
            weight: String(finalWeight)
        };
        
        try {
            const res = await axios.post(`${API_BASE}/patients`, updatedPatient);
            if (res.data.success) {
                setPatient(updatedPatient);
                setStep('workspace');
            }
        } catch (err) {
            console.error("Check-in Error:", err);
            showNotification(err.response?.data?.message || "เกิดข้อผิดพลาดในการตรวจสอบข้อมูลคนไข้", "error");
        }
    };

    const uniqueFormulas = useMemo(() => {
        const formulas = new Set();
        logs.forEach(log => {
            if (log.formula_used) {
                const val = log.formula_used.toUpperCase();
                if (val.includes('CV REGIMEN')) formulas.add('CV Regimen');
                else if (val.includes('BC REGIMEN')) formulas.add('BC Regimen');
                else if (val.includes('VINCRISTINE')) formulas.add('Vincristine');
                else if (val.includes('CARBOPLATIN')) formulas.add('Carboplatin');
                else if (val.includes('BLEOMYCIN')) formulas.add('Bleomycin');
                else formulas.add(log.formula_used);
            }
        });
        return Array.from(formulas);
    }, [logs]);

    const uniquePharmacists = useMemo(() => {
        const users = new Set();
        logs.forEach(log => {
            if (log.user_name) users.add(log.user_name);
        });
        return Array.from(users);
    }, [logs]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getFormattedThaiTimestamp = () => {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear() + 543; // Buddhist Era
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    };

    const isIncompleteDose = (val) => {
        if (!val) return true;
        const str = String(val);
        return str === 'NaN' || str === 'ว่าง' || str.includes('NaN') || str.includes('ว่าง');
    };

    const renderTableHeader = (label, widthClass, alignClass = '') => {
        return (
            <th className={`p-4 ${widthClass} select-none`}>
                <div className={`flex items-center gap-1.5 ${alignClass}`}>
                    <span className="font-black text-slate-400 uppercase tracking-wider text-[11px]">{label}</span>
                </div>
            </th>
        );
    };

    const parseFilterDate = (dateStr) => {
        if (!dateStr) return null;
        const parts = dateStr.split('/');
        if (parts.length < 3) return null;
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10) - 1; // 0-indexed
        let year = parseInt(parts[2], 10);
        if (year > 2400) {
            year -= 543;
        }
        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
    };

    const handleDateInputChange = (val, currentVal, setter) => {
        let cleaned = val.replace(/[^0-9/]/g, '');
        if (val.length > currentVal.length) {
            if (cleaned.length === 2 && !cleaned.includes('/')) {
                cleaned = cleaned + '/';
            } else if (cleaned.length === 5 && cleaned.split('/').length === 2) {
                cleaned = cleaned + '/';
            }
        }
        if (cleaned.length <= 10) {
            setter(cleaned);
        }
    };

    const parseThaiTimestamp = (timestampStr) => {
        if (!timestampStr) return null;
        const parts = timestampStr.split(' ');
        if (parts.length === 0) return null;
        const dateParts = parts[0].split('/');
        if (dateParts.length < 3) return null;

        let day = parseInt(dateParts[0], 10);
        let month = parseInt(dateParts[1], 10) - 1; // 0-indexed
        let year = parseInt(dateParts[2], 10);

        if (year > 2400) {
            year -= 543;
        }

        return new Date(year, month, day);
    };

    const filteredLogs = useMemo(() => {
        let result = logs;

        // Apply search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(log =>
                (log.hn && log.hn.toLowerCase().includes(query)) ||
                (log.patient_name && log.patient_name.toLowerCase().includes(query)) ||
                (log.user_name && log.user_name.toLowerCase().includes(query))
            );
        }

        // Apply date range filters
        if (startDateFilter) {
            const start = parseFilterDate(startDateFilter);
            if (start) {
                start.setHours(0, 0, 0, 0);
                result = result.filter(log => {
                    const logDate = parseThaiTimestamp(log.timestamp);
                    if (!logDate) return false;
                    logDate.setHours(0, 0, 0, 0);
                    return logDate >= start;
                });
            }
        }
        if (endDateFilter) {
            const end = parseFilterDate(endDateFilter);
            if (end) {
                end.setHours(23, 59, 59, 999);
                result = result.filter(log => {
                    const logDate = parseThaiTimestamp(log.timestamp);
                    if (!logDate) return false;
                    logDate.setHours(23, 59, 59, 999);
                    return logDate <= end;
                });
            }
        }

        // Apply formula filter
        if (formulaFilter !== 'all') {
            result = result.filter(log => {
                if (!log.formula_used) return false;
                const val = log.formula_used.toUpperCase();
                if (formulaFilter === 'CV Regimen') return val.includes('CV REGIMEN');
                if (formulaFilter === 'BC Regimen') return val.includes('BC REGIMEN');
                if (formulaFilter === 'Vincristine') return val.includes('VINCRISTINE');
                if (formulaFilter === 'Carboplatin') return val.includes('CARBOPLATIN');
                if (formulaFilter === 'Bleomycin') return val.includes('BLEOMYCIN');
                return log.formula_used === formulaFilter;
            });
        }

        // Apply pharmacist filter
        if (pharmacistFilter !== 'all') {
            result = result.filter(log => log.user_name === pharmacistFilter);
        }

        // Apply sorting
        if (sortConfig.key) {
            result = [...result].sort((a, b) => {
                let aVal = a[sortConfig.key] || '';
                let bVal = b[sortConfig.key] || '';

                if (sortConfig.key === 'calculated_bsa') {
                    aVal = parseFloat(a.calculated_bsa) || 0;
                    bVal = parseFloat(b.calculated_bsa) || 0;
                } else if (sortConfig.key === 'prescribed_dose') {
                    aVal = parseFloat(a.prescribed_dose) || 0;
                    bVal = parseFloat(b.prescribed_dose) || 0;
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [logs, searchQuery, formulaFilter, pharmacistFilter, sortConfig, startDateFilter, endDateFilter]);

    const handleBackFromHistory = () => {
        if (patient && patient.hn) {
            setStep('workspace');
        } else {
            setStep('login');
        }
    };

    const currentDrugInfo = drugsInfo.find(d => d.id === drug) || drugsInfo[0];

    return (
        <div className="p-4 md:p-8 print:p-0 min-h-screen flex flex-col justify-between relative">
            {user && user.must_change_password !== 1 && (
                <div className="absolute top-6 left-6 flex items-center gap-5 premium-card p-5 px-8 rounded-3xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.3)] z-50 animate-row-in no-print backdrop-blur-xl border-sky-500/50">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-600 to-sky-400 flex items-center justify-center shadow-lg border border-white/20">
                        <User size={32} className="text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-xs font-black uppercase tracking-widest block mb-1 ${theme === 'dark' ? 'text-sky-400' : 'text-sky-600'}`}>บัญชีผู้ใช้</span>
                        <p className={`text-2xl font-black leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{user.name || user.username}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1.5 text-xs font-black text-red-500 hover:text-red-400 transition-colors uppercase tracking-widest text-left cursor-pointer whitespace-nowrap"
                            >
                                <LogOut size={14} /> ออกจากระบบ (Logout)
                            </button>
                            {step !== 'drugs-info' && (
                                <button
                                    onClick={() => setStep('drugs-info')}
                                    className="flex items-center gap-1.5 text-xs font-black text-emerald-500 hover:text-emerald-400 transition-colors uppercase tracking-widest text-left cursor-pointer border-l border-slate-700/50 pl-3 whitespace-nowrap"
                                >
                                    <Pill size={14} /> ข้อมูลยา (Drugs)
                                </button>
                            )}
                            {step !== 'calculation-history' && (
                                <button
                                    onClick={() => setStep('calculation-history')}
                                    className="flex items-center gap-1.5 text-xs font-black text-indigo-500 hover:text-indigo-400 transition-colors uppercase tracking-widest text-left cursor-pointer border-l border-slate-700/50 pl-3 whitespace-nowrap"
                                >
                                    <History size={14} /> ประวัติการคำนวณ (History)
                                </button>
                            )}
                            {user.role?.toUpperCase() === 'ADMIN' && step !== 'admin-users' && (
                                <button
                                    onClick={() => setStep('admin-users')}
                                    className="flex items-center gap-1.5 text-xs font-black text-sky-500 hover:text-sky-400 transition-colors uppercase tracking-widest text-left cursor-pointer border-l border-slate-700/50 pl-3 whitespace-nowrap"
                                >
                                    <Settings size={14} /> จัดการผู้ใช้ (Admin)
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="absolute top-4 right-4 bg-slate-800 text-white dark:bg-white dark:text-slate-900 border-2 border-slate-600 px-5 py-3 rounded-full shadow-lg z-50 font-black flex items-center gap-2 no-print hover:scale-105 active:scale-95 transition-all text-sm cursor-pointer">
                {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />} {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </button>

            <div className={`w-full max-w-full mx-auto my-auto print:my-0 print:pt-0 ${user ? 'pt-32 md:pt-36' : 'pt-4 md:pt-12'}`}>
                {step === 'auth' ? (
                    <Login onLoginSuccess={(userData) => {
                        setUser(userData);
                        setStep('login');
                    }} />
                ) : step === 'login' ? (
                    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 animate-pop animate-row-in">
                        {/* Left column: Patient Search Panel */}
                        <div className="md:col-span-5 premium-card p-6 md:p-8 flex flex-col justify-between">
                            <div>
                                <h2 className="text-xl font-black mb-1">ค้นหาข้อมูลผู้ป่วย</h2>
                                <p className="text-xs text-slate-400 mb-4">ค้นหาข้อมูลผู้ป่วยที่ลงทะเบียนไว้ในระบบ</p>
                                
                                <div className="relative mb-4">
                                    <input
                                        type="text"
                                        placeholder="ค้นหา H.N. หรือ ชื่อ..."
                                        value={patientSearch}
                                        onChange={e => setPatientSearch(e.target.value)}
                                        className="form-control pl-10 py-2.5 text-sm font-bold"
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        <Search size={16} />
                                    </div>
                                </div>

                                <div className="space-y-2.5 overflow-y-auto max-h-[320px] pr-1.5 scrollable-patient-list">
                                    {filteredPatients.length > 0 ? (
                                        filteredPatients.map(p => (
                                            <div
                                                key={p.hn}
                                                onClick={() => selectPatient(p)}
                                                className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all duration-300 ${
                                                    patient.hn === p.hn
                                                        ? 'bg-sky-600/10 border-sky-500 shadow-md'
                                                        : theme === 'dark'
                                                            ? 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
                                                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 shadow-sm'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-sky-500 dark:text-sky-400 text-xs font-mono">H.N. {p.hn}</span>
                                                    <span className="text-[10px] uppercase font-bold text-slate-400">
                                                        {p.gender === 'male' ? 'ชาย (Male)' : p.gender === 'female' ? 'หญิง (Female)' : '-'}
                                                    </span>
                                                </div>
                                                <p className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-1 truncate">
                                                {(() => {
                                                    const title = (p.title || '').trim();
                                                    let name = (p.name || '').trim();
                                                    if (title) {
                                                        while (name.startsWith(title)) {
                                                            name = name.substring(title.length).trim();
                                                        }
                                                        return `${title} ${name}`;
                                                    }
                                                    return name;
                                                })()}
                                            </p>
                                                <div className="flex gap-3 mt-2 text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                                    <span>อายุ: {p.age || '-'} ปี</span>
                                                    <span>สูง: {p.height || '-'} cm</span>
                                                    <span>น้ำหนัก: {p.weight || '-'} kg</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-slate-500 font-bold italic text-sm">
                                            ไม่พบข้อมูลผู้ป่วย
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-3 border-t border-slate-700/10 text-center">
                                <button
                                    type="button"
                                    onClick={() => setPatient({ hn: '', name: '', height: '', weight: '', gender: '', age: '' })}
                                    className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-wider"
                                >
                                    ล้างแบบฟอร์ม (Clear Form)
                                </button>
                            </div>
                        </div>

                        {/* Right column: Check-in Form */}
                        <div className="md:col-span-7 premium-card p-6 md:p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h1 className="text-3xl font-black">Patient Check-in</h1>
                                    <p className="text-slate-400">ระบบเข้าตรวจสอบและบันทึกข้อมูลผู้ป่วย</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <input 
                                    type="text" 
                                    placeholder="H.N. ผู้ป่วย" 
                                    required 
                                    className="form-control" 
                                    value={patient.hn}
                                    onChange={e => setPatient({ ...patient, hn: e.target.value })}
                                />
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="col-span-1">
                                        <select 
                                            className="form-control" 
                                            value={patient.title || ''} 
                                            onChange={e => setPatient({ ...patient, title: e.target.value })}
                                        >
                                            <option value="">คำนำหน้า</option>
                                            <option value="นาย">นาย</option>
                                            <option value="นาง">นาง</option>
                                            <option value="นางสาว">นางสาว</option>
                                            <option value="ด.ช.">ด.ช.</option>
                                            <option value="ด.ญ.">ด.ญ.</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <input 
                                            type="text" 
                                            placeholder="ชื่อ-นามสกุล" 
                                            className="form-control" 
                                            value={patient.name || ''}
                                            onChange={e => setPatient({ ...patient, name: e.target.value })} 
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <input 
                                            type="number" 
                                            placeholder="อายุ (ปี)" 
                                            className="form-control" 
                                            value={patient.age || ''} 
                                            onChange={e => setPatient({ ...patient, age: e.target.value })} 
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <input 
                                        type="number" 
                                        placeholder={prevStats.height ? prevStats.height : "ส่วนสูง (cm)"} 
                                        className="form-control" 
                                        value={patient.height || ''}
                                        onChange={e => setPatient({ ...patient, height: e.target.value })} 
                                    />
                                    <input 
                                        type="number" 
                                        placeholder={prevStats.weight ? prevStats.weight : "น้ำหนัก (kg)"} 
                                        className="form-control" 
                                        value={patient.weight || ''}
                                        onChange={e => setPatient({ ...patient, weight: e.target.value })} 
                                    />
                                    <select 
                                        className="form-control" 
                                        value={patient.gender || ''} 
                                        onChange={e => setPatient({ ...patient, gender: e.target.value })}
                                    >
                                        <option value="">เลือกเพศ (Select Gender)</option>
                                        <option value="male">ชาย (Male)</option>
                                        <option value="female">หญิง (Female)</option>
                                    </select>
                                </div>
                                <button onClick={handlePatientCheckIn} className="w-full btn-primary">เข้าสู่ระบบคำนวณ ➔</button>
                            </div>
                        </div>
                    </div>
                ) : step === 'drugs-info' ? (
                    <DrugsInfo
                        currentUser={user}
                        onBack={handleBackFromHistory}
                        showNotification={showNotification}
                        theme={theme}
                    />
                ) : step === 'admin-users' ? (
                    <AdminUsers
                        currentUser={user}
                        setCurrentUser={setUser}
                        onBack={handleBackFromHistory}
                        showNotification={showNotification}
                        theme={theme}
                    />
                ) : step === 'calculation-history' ? (
                    <div className="animate-row-in space-y-6">
                        <div className="max-w-7xl mx-auto premium-card p-6 md:p-8 relative">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-700/10">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleBackFromHistory}
                                        className="p-2.5 rounded-xl border border-slate-700/30 hover:bg-slate-700/10 transition-all cursor-pointer text-slate-400 hover:text-white mr-2 no-print"
                                        title="ย้อนกลับ"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div>
                                        <h1 className="text-3xl font-black flex items-center gap-2">
                                            <History size={28} className="text-sky-400 print-hide" /> รายงานบันทึกประวัติการคำนวณ
                                        </h1>
                                        <p className="text-slate-400">ประวัติและบันทึกข้อมูลการคำนวณขนาดยาเคมีบำบัดของผู้ป่วย</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 no-print w-full md:w-auto">
                                    <button
                                        onClick={() => setShowFilterPanel(!showFilterPanel)}
                                        className={`py-2 px-4 rounded-xl border flex items-center gap-2 text-sm font-bold transition-all duration-300 whitespace-nowrap ${showFilterPanel
                                            ? 'bg-sky-600 border-sky-400 text-white shadow-md'
                                            : theme === 'dark'
                                                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'
                                            }`}
                                    >
                                        <Filter size={15} /> {showFilterPanel ? 'ปิดตัวกรอง' : 'ตัวกรอง (Filters)'}
                                    </button>
                                    <input
                                        type="text"
                                        placeholder="ค้นหา H.N. / ชื่อคนไข้..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="form-control py-2 px-4 text-sm rounded-xl border border-slate-700/30 font-bold focus:border-sky-500 w-[240px]"
                                    />
                                    <button onClick={() => window.print()} className="no-print bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold py-2 px-4 rounded-xl border border-slate-700 flex items-center gap-2 text-xs transition-all active:scale-95 shadow-lg whitespace-nowrap">
                                        <Printer size={14} /> พิมพ์รายงาน
                                    </button>
                                </div>
                            </div>

                            {showFilterPanel && (
                                <div className={`no-print p-5 rounded-2xl border mb-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-pop ${theme === 'dark'
                                    ? 'bg-slate-900/60 border-slate-800'
                                    : 'bg-slate-50 border-slate-200 shadow-inner'
                                    }`}>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase">วันที่เริ่มต้น (Start Date)</label>
                                        <input
                                            type="text"
                                            placeholder="วว/ดด/ปปปป (เช่น 24/06/2569)"
                                            value={startDateFilter}
                                            onChange={e => handleDateInputChange(e.target.value, startDateFilter, setStartDateFilter)}
                                            className="form-control py-1.5 px-3 text-xs rounded-xl font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase">วันที่สิ้นสุด (End Date)</label>
                                        <input
                                            type="text"
                                            placeholder="วว/ดด/ปปปป (เช่น 24/06/2569)"
                                            value={endDateFilter}
                                            onChange={e => handleDateInputChange(e.target.value, endDateFilter, setEndDateFilter)}
                                            className="form-control py-1.5 px-3 text-xs rounded-xl font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase">สูตรคำนวณ (Formula)</label>
                                        <select
                                            value={formulaFilter}
                                            onChange={e => setFormulaFilter(e.target.value)}
                                            className="form-control py-1.5 px-3 text-xs rounded-xl font-bold"
                                        >
                                            <option value="all">สูตรทั้งหมด (All)</option>
                                            {uniqueFormulas.map(f => (
                                                <option key={f} value={f}>{f}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase">ผู้บันทึก (Pharmacist)</label>
                                        <select
                                            value={pharmacistFilter}
                                            onChange={e => setPharmacistFilter(e.target.value)}
                                            className="form-control py-1.5 px-3 text-xs rounded-xl font-bold"
                                        >
                                            <option value="all">ผู้บันทึกทั้งหมด (All)</option>
                                            {uniquePharmacists.map(u => (
                                                <option key={u} value={u}>{u}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="sm:col-span-2 md:col-span-4 flex justify-end gap-2 pt-3 border-t border-slate-700/10">
                                        <button
                                            onClick={() => {
                                                setStartDateFilter('');
                                                setEndDateFilter('');
                                                setFormulaFilter('all');
                                                setPharmacistFilter('all');
                                            }}
                                            className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600/10 text-rose-500 border border-rose-500/20 hover:bg-rose-600/20 transition-all cursor-pointer"
                                        >
                                            ล้างตัวกรอง (Reset)
                                        </button>
                                        <button
                                            onClick={() => setShowFilterPanel(false)}
                                            className="px-4 py-2 rounded-xl text-xs font-black bg-slate-700 text-white transition-all cursor-pointer"
                                        >
                                            ปิด (Close)
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="overflow-x-auto overflow-y-auto max-h-[500px] rounded-lg border border-slate-700/20 shadow-inner scrollable-table-container">
                                <table className="w-full text-left text-sm md:text-base print-table">
                                    <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                        <tr className="bg-sky-600/10 text-slate-400 border-b border-slate-700/20">
                                            {renderTableHeader('วันที่บันทึก', 'w-[15%] whitespace-nowrap')}
                                            {renderTableHeader('H.N.', 'w-[10%] whitespace-nowrap')}
                                            {renderTableHeader('ชื่อผู้ป่วย', 'w-[18%] whitespace-nowrap')}
                                            {renderTableHeader('เพศ', 'w-[8%] whitespace-nowrap', 'justify-center')}
                                            {renderTableHeader('อายุ', 'w-[8%] whitespace-nowrap', 'justify-center')}
                                            {renderTableHeader('BSA', 'w-[8%] whitespace-nowrap', 'justify-center')}
                                            {renderTableHeader('สูตรการคำนวณ', 'w-[18%] whitespace-nowrap')}
                                            {renderTableHeader('Dose', 'w-[12%] whitespace-nowrap', 'justify-end')}
                                            {renderTableHeader('ผู้บันทึก', 'w-[11%] whitespace-nowrap', 'justify-center')}
                                            {user?.role?.toUpperCase() === 'ADMIN' && renderTableHeader('จัดการ', 'w-[8%] whitespace-nowrap no-print', 'justify-center')}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLogs.length > 0 ? (
                                            filteredLogs.map(log => (
                                                <tr key={log.id} className="border-b border-slate-700/10 hover:bg-sky-600/5 transition-colors">
                                                    <td className="p-4 font-mono opacity-70 whitespace-nowrap">{log.timestamp}</td>
                                                    <td className="p-4 font-bold whitespace-nowrap">{log.hn}</td>
                                                    <td className="p-4 font-bold uppercase">{log.patient_name}</td>
                                                    <td className="p-4 text-center font-bold whitespace-nowrap gender-text-highlight">
                                                        {log.gender === 'female' ? 'หญิง' : log.gender === 'male' ? 'ชาย' : '-'}
                                                    </td>
                                                    <td className="p-4 text-center font-bold whitespace-nowrap">
                                                        {log.age ? `${log.age} ปี` : '-'}
                                                    </td>
                                                    <td className="p-4 text-center text-emerald-500 font-bold whitespace-nowrap">{sanitizeNaN(log.calculated_bsa)}</td>
                                                    <td className="p-4 text-slate-400 font-bold uppercase leading-snug">{sanitizeNaN(log.formula_used)}</td>
                                                    <td className="p-4 text-right text-amber-500 font-black whitespace-nowrap">{sanitizeNaN(log.prescribed_dose)}</td>
                                                    <td className="p-4 text-center text-sky-400 font-bold uppercase truncate max-w-[120px]">{log.user_name || '-'}</td>
                                                    {user?.role?.toUpperCase() === 'ADMIN' && (
                                                        <td className="p-4 text-center no-print">
                                                            <button
                                                                onClick={() => handleDeleteLog(log)}
                                                                className="text-red-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all active:scale-95 cursor-pointer flex items-center justify-center mx-auto"
                                                                title="ลบรายการบันทึกประวัตินี้"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={user?.role?.toUpperCase() === 'ADMIN' ? 10 : 9} className="p-8 text-center text-slate-500 font-bold italic">
                                                    ไม่พบประวัติการคำนวณที่ตรงกับการค้นหา
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="animate-row-in space-y-6">
                        {/* Medical Record View */}
                        <div className="w-full premium-card p-5 flex justify-between items-center no-print">
                            <div>
                                <h2 className="text-xl font-black">
                                    {(() => {
                                        const title = (patient.title || '').trim();
                                        let name = (patient.name || '').trim();
                                        if (title) {
                                            while (name.startsWith(title)) {
                                                name = name.substring(title.length).trim();
                                            }
                                            return `${title} ${name}`;
                                        }
                                        return name || 'ไม่ระบุชื่อ';
                                    })()} ({patient.hn})
                                </h2>
                                <p className="text-slate-400">H: {patient.height} cm | W: {patient.weight} kg | อายุ: {patient.age ? `${patient.age} ปี` : '-'} | เพศ: {patient.gender === 'female' ? 'หญิง (Female)' : patient.gender === 'male' ? 'ชาย (Male)' : '-'}</p>
                            </div>
                            <button onClick={() => {
                                setPatient({ hn: '', title: '', name: '', height: '', weight: '', gender: '', age: '' });
                                setPrevStats({ height: '', weight: '' });
                                setPatientScr('');
                                setUseAutoGfr(false);
                                setAmputation('none');
                                setAmpDetails({ level: 'below_knee', method: 'weight_method' });
                                setStep('login');
                            }} className="bg-sky-600/10 text-sky-500 hover:bg-sky-600/20 px-4 py-2 rounded-lg border border-sky-500/30 transition-all font-bold">เปลี่ยนเคสผู้ป่วย</button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 workspace-section">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="premium-card p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center font-black text-xs">02</div>
                                            <h2 className="text-lg font-black uppercase">สูตรคำนวณพื้นที่ผิว (BSA Formula)</h2>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowBsaInfo(!showBsaInfo)}
                                            className="flex items-center gap-2 text-xs font-black text-sky-500 hover:text-sky-400 p-2 bg-sky-600/5 rounded-lg border border-sky-500/20 transition-all no-print"
                                        >
                                            <Info size={14} /> ข้อมูลสูตร
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {['mosteller', 'dubois'].map(f => (
                                            <button key={f} onClick={() => setFormula(f)} className={`p-4 rounded-lg border-2 transition-all font-black uppercase ${formula === f ? 'bg-sky-600 border-sky-400 text-white' : 'bg-transparent border-slate-700/30 text-slate-500'}`}>
                                                {f === 'mosteller' ? 'มอสเตลเลอร์ (Mosteller)' : 'ดูบัวส์ (DuBois)'}
                                            </button>
                                        ))}
                                    </div>
                                    {showBsaInfo && (
                                        <div className="animate-pop mt-4 p-5 rounded-2xl border-2 bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-500/50 shadow-md">
                                            <h3 className="font-bold text-sky-700 dark:text-sky-300 mb-3 text-sm flex items-center gap-2">
                                                <Info size={16} /> รายละเอียดสูตรการคำนวณพื้นที่ผิวร่างกาย (BSA)
                                            </h3>
                                            <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                                <div className="border-b border-sky-200/60 dark:border-sky-800/40 pb-3">
                                                    <span className="font-bold text-sky-600 dark:text-sky-400 text-[13px]">1. MOSTELLER Formula</span>
                                                    <p className="mt-1 font-mono text-[11px] bg-slate-100 dark:bg-slate-900/60 p-2.5 rounded-lg text-slate-800 dark:text-slate-200">
                                                        BSA (m²) = √[ (ส่วนสูง (cm) × น้ำหนัก (kg)) / 3600 ]
                                                    </p>
                                                    <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                        สูตรยอดนิยมและใช้งานง่ายที่สุด มีความคลาดเคลื่อนต่ำ เหมาะสำหรับการคำนวณทั่วไปในทางปฏิบัติการแพทย์
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="font-bold text-sky-600 dark:text-sky-400 text-[13px]">2. DUBOIS & DUBOIS Formula</span>
                                                    <p className="mt-1 font-mono text-[11px] bg-slate-100 dark:bg-slate-900/60 p-2.5 rounded-lg text-slate-800 dark:text-slate-200">
                                                        BSA (m²) = 0.20247 × (ส่วนสูง (m))^0.725 × (น้ำหนัก (kg))^0.425
                                                    </p>
                                                    <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                        สูตรดั้งเดิมที่มีความเที่ยงตรงสูงในกลุ่มผู้ป่วยที่มีรูปร่างและสัดส่วนน้ำหนัก/ส่วนสูงตามมาตรฐานทั่วไป
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="premium-card p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center font-black text-xs">03</div>
                                            <h2 className="text-lg font-black uppercase">ตรวจสอบสถานะการสูญเสียอวัยวะ</h2>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowAmpInfo(!showAmpInfo)}
                                            className="flex items-center gap-2 text-xs font-black text-sky-500 hover:text-sky-400 p-2 bg-sky-600/5 rounded-lg border border-sky-500/20 transition-all no-print"
                                        >
                                            <Info size={14} /> ข้อมูลสูตร
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <button onClick={() => setAmputation('none')} className={`p-4 rounded-lg border-2 font-black transition-all ${amputation === 'none' ? 'bg-sky-600 border-sky-400 text-white' : 'bg-transparent border-slate-700/30 text-slate-500'}`}>ปกติ (None)</button>
                                        <button onClick={() => setAmputation('amputee')} className={`p-4 rounded-lg border-2 font-black transition-all ${amputation === 'amputee' ? 'bg-sky-600 border-sky-400 text-white' : 'bg-transparent border-slate-700/30 text-slate-500'}`}>มีประวัติตัดแขนขา (Amputee)</button>
                                    </div>
                                    {amputation === 'amputee' && (
                                        <div className="grid grid-cols-2 gap-4 p-4 bg-sky-600/5 rounded-lg mb-4">
                                            <select className="form-control" value={ampDetails.level} onChange={e => setAmpDetails({ ...ampDetails, level: e.target.value })}>
                                                <option value="below_knee">ตัดขาใต้เข่า (Below Knee)</option>
                                                <option value="above_knee">ตัดขาเหนือเข่า (Above Knee)</option>
                                            </select>
                                            <select className="form-control" value={ampDetails.method} onChange={e => setAmpDetails({ ...ampDetails, method: e.target.value })}>
                                                <option value="weight_method">ปรับตามน้ำหนัก (Weight Method)</option>
                                                <option value="bsa_method">ปรับตามพื้นที่ผิว (BSA Method)</option>
                                            </select>
                                        </div>
                                    )}
                                    {showAmpInfo && (
                                        <div className="animate-pop mt-4 p-5 rounded-2xl border-2 bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-500/50 shadow-md">
                                            <h3 className="font-bold text-sky-700 dark:text-sky-300 mb-3 text-sm flex items-center gap-2">
                                                <Info size={16} /> รายละเอียดการปรับคำนวณกรณีสูญเสียอวัยวะ (Amputation)
                                            </h3>
                                            <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                                <div className="border-b border-sky-200/60 dark:border-sky-800/40 pb-3">
                                                    <span className="font-bold text-sky-600 dark:text-sky-400 text-[13px]">1. ปรับตามน้ำหนัก (Weight Method)</span>
                                                    <p className="mt-1 font-mono text-[11px] bg-slate-100 dark:bg-slate-900/60 p-2.5 rounded-lg text-slate-800 dark:text-slate-200">
                                                        น้ำหนักสุทธิ = น้ำหนักตัวจริง × (1 - สัดส่วนน้ำหนักอวัยวะ)
                                                    </p>
                                                    <ul className="mt-1.5 list-disc pl-5 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                                                        <li>ตัดขาใต้เข่า (Below Knee): หักออก 6% ของน้ำหนักตัว (คิดเป็น 94% ของน้ำหนักจริง) แล้วนำไปคำนวณ BSA ต่อ</li>
                                                        <li>ตัดขาเหนือเข่า (Above Knee): หักออก 15% ของน้ำหนักตัว (คิดเป็น 85% ของน้ำหนักจริง) แล้วนำไปคำนวณ BSA ต่อ</li>
                                                    </ul>
                                                </div>
                                                <div>
                                                    <span className="font-bold text-sky-600 dark:text-sky-400 text-[13px]">2. ปรับตามพื้นที่ผิว (BSA Method)</span>
                                                    <p className="mt-1 font-mono text-[11px] bg-slate-100 dark:bg-slate-900/60 p-2.5 rounded-lg text-slate-800 dark:text-slate-200">
                                                        BSA สุทธิ = BSA ปกติ × (1 - สัดส่วนพื้นที่ผิวอวัยวะ)
                                                    </p>
                                                    <ul className="mt-1.5 list-disc pl-5 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                                                        <li>ตัดขาใต้เข่า (Below Knee): ปรับลดค่า BSA ลง 9%</li>
                                                        <li>ตัดขาเหนือเข่า (Above Knee): ปรับลดค่า BSA ลง 18%</li>
                                                     </ul>
                                                 </div>
                                             </div>
                                         </div>
                                     )}
                                </div>

                                <div className="premium-card p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center font-black text-xs">04</div>
                                            <h2 className="text-lg font-black uppercase">ตรวจสอบกฎเฉพาะตัวยาและ Absolute Max Caps</h2>
                                        </div>
                                        <button
                                            onClick={() => setShowDrugInfo(!showDrugInfo)}
                                            className="flex items-center gap-2 text-xs font-black text-sky-500 hover:text-sky-400 p-2 bg-sky-600/5 rounded-lg border border-sky-500/20 transition-all no-print"
                                        >
                                            <Info size={14} /> ข้อมูลยา
                                        </button>
                                    </div>

                                    <div className={`grid grid-cols-2 gap-3 mb-5 p-1 rounded-xl border transition-all duration-300 ${theme === 'dark'
                                        ? 'bg-slate-800/40 border-slate-700/30'
                                        : 'bg-slate-100 border-slate-200'
                                        }`}>
                                        <button
                                            type="button"
                                            onClick={() => setCalcMode('single')}
                                            className={`py-2 px-3 rounded-lg text-sm font-bold uppercase transition-all ${calcMode === 'single'
                                                ? 'bg-sky-600 text-white shadow-md'
                                                : theme === 'dark'
                                                    ? 'text-slate-400 hover:text-white'
                                                    : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                        >
                                            คำนวณยาเดี่ยว (Single Drug)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCalcMode('regimen')}
                                            className={`py-2 px-3 rounded-lg text-sm font-bold uppercase transition-all ${calcMode === 'regimen'
                                                ? 'bg-sky-600 text-white shadow-md'
                                                : theme === 'dark'
                                                    ? 'text-slate-400 hover:text-white'
                                                    : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                        >
                                            สูตรยาร่วม (Regimen Template)
                                        </button>
                                    </div>

                                    {calcMode === 'single' ? (
                                        <select className="form-control mb-4" value={drug} onChange={e => setDrug(e.target.value)}>
                                            <option value="vincristine">วินคริสทีน - VINCRISTINE (Cap 2.0 mg)</option>
                                            <option value="carboplatin">คาร์โบพลาติน - CARBOPLATIN (Calvert Formula)</option>
                                            <option value="bleomycin">บลีโอมัยซิน - BLEOMYCIN (Fixed Dose 30 units)</option>
                                        </select>
                                    ) : (
                                        <select className="form-control mb-4" value={selectedRegimen} onChange={e => setSelectedRegimen(e.target.value)}>
                                            <option value="cv">สูตร CV Regimen: คาร์โบพลาติน + วินคริสทีน (CARBOPLATIN + VINCRISTINE)</option>
                                            <option value="bc">สูตร BC Regimen: บลีโอมัยซิน + คาร์โบพลาติน (BLEOMYCIN + CARBOPLATIN)</option>
                                        </select>
                                    )}

                                    {showDrugInfo && (
                                        <div className="animate-pop mt-4 mb-6">
                                            {calcMode === 'single' ? (
                                                <div className={`p-5 rounded-2xl border-2 transition-all shadow-md ${currentDrugInfo.color === 'sky'
                                                    ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-500/50'
                                                    : currentDrugInfo.color === 'amber'
                                                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500/50'
                                                        : currentDrugInfo.color === 'purple'
                                                            ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-500/50'
                                                            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-500/50'
                                                    }`}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded tracking-widest ${currentDrugInfo.color === 'sky'
                                                            ? 'bg-sky-500 text-white'
                                                            : currentDrugInfo.color === 'amber'
                                                                ? 'bg-amber-500 text-slate-900'
                                                                : currentDrugInfo.color === 'purple'
                                                                    ? 'bg-purple-500 text-white'
                                                                    : 'bg-emerald-500 text-slate-900'
                                                            }`}>
                                                            ข้อมูลยาที่เลือก
                                                        </span>
                                                        <div className={`text-base font-black uppercase tracking-wider ${currentDrugInfo.color === 'sky'
                                                            ? 'text-sky-700 dark:text-sky-400'
                                                            : currentDrugInfo.color === 'amber'
                                                                ? 'text-amber-700 dark:text-amber-400'
                                                                : currentDrugInfo.color === 'purple'
                                                                    ? 'text-purple-700 dark:text-purple-400'
                                                                    : 'text-emerald-700 dark:text-emerald-400'
                                                            }`}>
                                                            {currentDrugInfo.name}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm font-extrabold text-slate-800 dark:text-white leading-snug">
                                                        {currentDrugInfo.desc}
                                                    </p>
                                                    <div className="mt-3 p-3 rounded-lg bg-white/60 dark:bg-black/30 border border-slate-200 dark:border-white/5">
                                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
                                                            {currentDrugInfo.details}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-5 rounded-2xl border-2 border-indigo-400 dark:border-indigo-500/50 bg-indigo-50 dark:bg-indigo-950/40 transition-all shadow-md">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded tracking-widest bg-indigo-500 text-white">
                                                            ข้อมูลสูตรยาร่วม
                                                        </span>
                                                        <div className="text-base font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                                                            {selectedRegimen === 'cv' ? 'CV Regimen' : 'BC Regimen'}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm font-extrabold text-slate-800 dark:text-white leading-snug">
                                                        {selectedRegimen === 'cv'
                                                            ? 'สูตรยาร่วมสำหรับ Carboplatin และ Vincristine'
                                                            : 'สูตรยาร่วมสำหรับ Bleomycin และ Carboplatin'}
                                                    </p>
                                                    <div className="mt-3 p-3 rounded-lg bg-white/60 dark:bg-black/30 border border-slate-200 dark:border-white/5">
                                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
                                                            {selectedRegimen === 'cv'
                                                                ? 'Carboplatin คำนวณตาม Calvert Formula (Target AUC × (eGFR + 25)) และ Vincristine คำนวณตามพื้นที่ผิว (BSA × 1.4 mg/m² พร้อม Dose Cap 2.0 mg)'
                                                                : 'Bleomycin ถูกคำนวณตามขนาดยาคงที่ (Fixed Dose 30 units) และ Carboplatin คำนวณตาม Calvert Formula (Target AUC × (eGFR + 25))'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {((calcMode === 'single' && drug === 'carboplatin') || calcMode === 'regimen') && (
                                        <div className="mt-6 p-5 rounded-2xl border-2 border-amber-500/20 bg-amber-500/5 space-y-4">
                                            <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                การปรับขนาดยาตามค่าไต (Carboplatin Settings)
                                            </h3>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-400 mb-1">เป้าหมายค่า AUC (Target AUC)</label>
                                                    <input
                                                        type="number"
                                                        placeholder="ระบุค่า Target AUC"
                                                        value={drugParams.auc}
                                                        className="form-control"
                                                        onChange={e => setDrugParams({ ...drugParams, auc: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-400 mb-1.5">วิธีคำนวณการทำงานของไต (eGFR Mode)</label>
                                                    <div className={`grid grid-cols-2 gap-2 p-1 rounded-xl border transition-all duration-300 ${theme === 'dark'
                                                        ? 'bg-slate-800/40 border-slate-700/30'
                                                        : 'bg-slate-100 border-slate-200'
                                                        }`}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setUseAutoGfr(false)}
                                                            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${!useAutoGfr
                                                                ? 'bg-amber-600 text-white shadow-md'
                                                                : theme === 'dark'
                                                                    ? 'text-slate-400 hover:text-white'
                                                                    : 'text-slate-600 hover:text-slate-900'
                                                                }`}
                                                        >
                                                            กรอก eGFR เอง (Manual eGFR)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setUseAutoGfr(true)}
                                                            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${useAutoGfr
                                                                ? 'bg-amber-600 text-white shadow-md'
                                                                : theme === 'dark'
                                                                    ? 'text-slate-400 hover:text-white'
                                                                    : 'text-slate-600 hover:text-slate-900'
                                                                }`}
                                                        >
                                                            คำนวณอัตโนมัติ (Auto eGFR)
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {!useAutoGfr ? (
                                                <div className="space-y-2">
                                                    <label className="block text-xs font-bold text-slate-400 mb-1">อัตราการกรองของไต (eGFR Value, ml/min)</label>
                                                    <input
                                                        type="number"
                                                        placeholder="ระบุค่า eGFR (ml/min)"
                                                        value={drugParams.gfr}
                                                        className="form-control"
                                                        onChange={e => setDrugParams({ ...drugParams, gfr: e.target.value })}
                                                    />
                                                    {parseFloat(drugParams.gfr) > 125 && (
                                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] font-bold leading-normal text-amber-500">
                                                            ⚠️ eGFR เกิน 125 ml/min: ถูกจำกัดไว้ที่ 125 ml/min ในสูตร Calvert เพื่อความปลอดภัย (Capped at 125)
                                                        </div>
                                                    )}
                                                    {parseFloat(drugParams.gfr) < 15 && parseFloat(drugParams.gfr) > 0 && (
                                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] font-bold leading-normal text-red-500">
                                                            🚨 ไตเสื่อมระดับรุนแรง (eGFR &lt; 15 ml/min): โปรดระมัดระวังการใช้ยา Carboplatin
                                                        </div>
                                                    )}
                                                    {parseFloat(drugParams.gfr) < 0 && (
                                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] font-bold leading-normal text-red-500">
                                                            ❌ ค่า eGFR ไม่สามารถติดลบได้
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className={`p-4 rounded-xl border space-y-4 transition-all duration-300 ${theme === 'dark'
                                                    ? 'bg-slate-800/40 border-slate-700/50'
                                                    : 'bg-white border-slate-200 shadow-sm'
                                                    }`}>
                                                    <div className="space-y-1.5">
                                                        <div className="grid grid-cols-3 gap-3 items-end">
                                                            <label className="block text-xs font-bold text-slate-400 ml-1">อายุ (ปี) (Age)</label>
                                                            <label className="block text-xs font-bold text-slate-400 ml-1">ครีอะตินีนในเลือด (Scr, mg/dL)</label>
                                                            <label className="block text-xs font-bold text-slate-400 ml-1">เพศ (Gender)</label>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-3">
                                                            <input
                                                                type="number"
                                                                placeholder="Age"
                                                                value={patient.age}
                                                                className="form-control text-sm"
                                                                onChange={e => setPatient({ ...patient, age: e.target.value })}
                                                            />
                                                            <input
                                                                type="number"
                                                                placeholder="ระบุค่า Scr"
                                                                step="0.01"
                                                                value={patientScr}
                                                                className="form-control text-sm"
                                                                onChange={e => setPatientScr(e.target.value)}
                                                            />
                                                            <input
                                                                type="text"
                                                                readOnly
                                                                value={patient.gender === 'female' ? 'หญิง (Female)' : patient.gender === 'male' ? 'ชาย (Male)' : '-'}
                                                                className="form-control text-sm opacity-80"
                                                                style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex flex-col items-center justify-center gap-1 text-center">
                                                        <span className={`text-xs font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>ผลการคำนวณ eGFR (Calculated eGFR)</span>
                                                        <span className={`text-base font-black ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                                            {autoGfrValue !== null ? (isNaN(autoGfrValue) ? 'ว่าง' : `${autoGfrValue} ml/min`) : 'รอข้อมูลครบถ้วน... (Awaiting Data...)'}
                                                        </span>
                                                    </div>
                                                    {autoGfrValue > 125 && (
                                                        <div className={`p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] font-bold leading-normal ${theme === 'dark' ? 'text-red-400' : 'text-red-600'
                                                            }`}>
                                                            ⚠️ eGFR เกิน 125 ml/min: ถูกจำกัดไว้ที่ 125 ml/min เพื่อความปลอดภัยในการคำนวณขนาดยา (Capped at 125)
                                                        </div>
                                                    )}
                                                    {autoGfrValue < 15 && autoGfrValue > 0 && (
                                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] font-bold leading-normal text-red-500">
                                                            🚨 ไตเสื่อมระดับรุนแรง (eGFR &lt; 15 ml/min): โปรดระมัดระวังการใช้ยา Carboplatin
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="lg:col-span-1">
                                <div className="premium-card p-6 sticky top-6 border-sky-500/50">
                                    <h2 className="text-center font-black mb-4 uppercase text-slate-400">สรุปผลการคำนวณ</h2>
                                    <div className="space-y-4 bg-sky-600/5 p-4 rounded-xl border border-sky-500/20">
                                        <div className="text-center">
                                            <span className="text-xs uppercase text-slate-500 font-black">BSA</span>
                                            <div className="text-3xl font-black text-emerald-500">{formatBsa(bsa)} <span className="text-sm">m²</span></div>
                                        </div>
                                        {calcMode === 'single' ? (
                                            <div className="text-center border-t border-slate-700/20 pt-4">
                                                <span className="text-xs uppercase text-slate-500 font-black">Dose</span>
                                                <div className="text-3xl font-black text-amber-500">
                                                    {sanitizeNaN(finalDose)} <span className="text-sm">{drug === 'bleomycin' ? 'units' : 'mg'}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="border-t border-slate-700/20 pt-4 space-y-3">
                                                <span className="text-xs uppercase text-slate-500 font-black block text-center mb-1">Regimen Doses</span>
                                                {multipleDoses.map(item => (
                                                    <div key={item.id} className="flex justify-between items-center bg-slate-100 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/30">
                                                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">{item.name}</span>
                                                        <span className="text-sm font-black text-amber-600 dark:text-amber-500">
                                                            {sanitizeNaN(item.dose)} <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{item.id === 'bleomycin' ? 'units' : 'mg'}</span>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Safety Alert Warnings */}
                                    <div className="space-y-2 mt-4">
                                        {(bsa > 3.0 || (bsa < 0.5 && bsa > 0)) && (
                                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-[11px] font-bold leading-normal text-center">
                                                ⚠️ ค่า BSA ({formatBsa(bsa)} m²) นอกช่วงปกติ (0.5 - 3.0 m²) โปรดตรวจสอบ ส่วนสูง / น้ำหนัก!
                                            </div>
                                        )}
                                        {isIncompleteDose(finalDose) && (
                                            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-500 text-[11px] font-bold leading-normal text-center">
                                                ⚠️ ขนาดยายังไม่สมบูรณ์ (ว่าง) โปรดระบุค่า GFR หรือ Creatinine เพื่อคำนวณยาให้สมบูรณ์
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 mt-4 no-print">
                                        <button
                                            onClick={handleVerify}
                                            className={`w-full btn-primary ${isIncompleteDose(finalDose) || bsa > 4.5 || bsa < 0.3
                                                ? 'opacity-50 cursor-not-allowed grayscale'
                                                : ''
                                                }`}
                                            disabled={isIncompleteDose(finalDose) || bsa > 4.5 || bsa < 0.3}
                                        >
                                            บันทึก ➔
                                        </button>
                                    </div>
                                    {calculationDetails.pharmacistNote && (
                                        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded text-amber-500 text-sm italic text-center font-bold">
                                            Note: {calculationDetails.pharmacistNote}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
            {user && user.must_change_password === 1 && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in no-print">
                    <ChangePassword
                        user={user}
                        onPasswordChanged={(updatedUser) => {
                            setUser(updatedUser);
                            showNotification("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว", "success");
                        }}
                        onLogout={handleLogout}
                    />
                </div>
            )}
            {deleteConfirmLog && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in no-print">
                    <div className="premium-card p-6 md:p-8 w-full max-w-sm animate-pop relative border-rose-500/30">
                        <h3 className="font-black text-lg mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/50 pb-3 text-rose-500">
                            <Trash2 size={18} />
                            ยืนยันการลบประวัติ
                        </h3>
                        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                            คุณแน่ใจหรือไม่ที่จะลบประวัติการคำนวณของ H.N.: <strong className="text-slate-200">{deleteConfirmLog.hn}</strong> ({deleteConfirmLog.patient_name || 'ไม่ระบุชื่อ'})? การกระทำนี้ไม่สามารถย้อนกลับได้
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmLog(null)}
                                className={`w-1/2 py-3 px-4 rounded-xl border text-sm font-bold transition-all active:scale-95 cursor-pointer text-center ${theme === 'dark'
                                    ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                                    : 'border-slate-200 hover:bg-slate-100 text-slate-600 shadow-sm'
                                    }`}
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleDeleteConfirm(deleteConfirmLog.id);
                                    setDeleteConfirmLog(null);
                                }}
                                className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-black py-3 px-4 rounded-xl active:scale-95 cursor-pointer text-center transition-all shadow-md shadow-rose-900/10"
                            >
                                ลบประวัติ
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showTimeoutWarning && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in no-print">
                    <div className="premium-card p-6 md:p-8 w-full max-w-sm animate-pop relative border-amber-500/30 shadow-[0_20px_50px_rgba(245,158,11,0.15)] text-center">
                        <div className="w-16 h-16 bg-amber-500/10 rounded-full mx-auto mb-4 flex items-center justify-center text-amber-500 border border-amber-500/20">
                            <Info size={28} className="animate-pulse" />
                        </div>
                        <h3 className="font-black text-xl mb-2 text-amber-500">
                            การแจ้งเตือนการหมดเวลา
                        </h3>
                        <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                            ระบบกำลังจะออกจากระบบอัตโนมัติเนื่องจากไม่มีการใช้งานระบบเป็นเวลานาน โปรดยืนยันว่าคุณต้องการใช้งานระบบต่อหรือไม่
                        </p>

                        <div className="mb-6 flex flex-col items-center justify-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/5 border-2 border-amber-500/20 relative animate-pulse">
                                <span className="font-black text-2xl text-amber-500">
                                    {timeoutCountdown}
                                </span>
                            </div>
                            <p className="text-[10px] text-amber-500/70 mt-2 font-bold uppercase tracking-wider">วินาทีสุดท้าย (Seconds Left)</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    handleLogout();
                                    setShowTimeoutWarning(false);
                                }}
                                className={`w-1/2 py-3 px-4 rounded-xl border text-sm font-bold transition-all active:scale-95 cursor-pointer text-center ${theme === 'dark'
                                    ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                                    : 'border-slate-200 hover:bg-slate-100 text-slate-600 shadow-sm'
                                    }`}
                            >
                                ออกจากระบบ
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    lastActivityRef.current = Date.now();
                                    setShowTimeoutWarning(false);
                                }}
                                className="w-1/2 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white text-sm font-black py-3 px-4 rounded-xl active:scale-95 cursor-pointer text-center transition-all shadow-md shadow-orange-950/10"
                            >
                                ใช้งานต่อ
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {notification && (
                <Notification
                    {...notification}
                    onClose={() => setNotification(null)}
                />
            )}
        </div>
    );
}

export default App;
