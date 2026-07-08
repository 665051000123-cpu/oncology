import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCalculations } from './utils/useCalculations';
import { Moon, Sun, ChevronRight, ArrowLeft, Printer, Trash2, History, User, Info, LogOut, ArrowUpDown, ChevronUp, ChevronDown, Filter, X, Settings, Pill, Search, Calendar } from 'lucide-react';
import axios from 'axios';
import Login from './components/Login';
import Notification from './components/Notification';
import AdminUsers from './components/AdminUsers';
import ChangePassword from './components/ChangePassword';
import DrugsInfo from './components/DrugsInfo';
import { DRUG_SOLVENT_RULES } from './drugRules';

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

const RATE_OPTIONS = [
    "15 mins",
    "30 mins",
    "60 mins",
    "2 hrs",
    "4 hrs",
    "24 hrs",
    "50 mL/hr",
    "100 mL/hr",
    "150 mL/hr",
    "200 mL/hr",
    "250 mL/hr"
];

const SOLVENT_OPTIONS = [
    "0",
    "5% D/W 50 mL",
    "5% D/W 100 mL",
    "5% D/W 250 mL",
    "5% D/W 500 mL",
    "D-5-S 250",
    "D-5-S 500",
    "D-5-S 1000",
    "D-5-W 10",
    "D-5-W 20",
    "D-5-W 50",
    "D-5-W 100",
    "D-5-W 200",
    "D-5-W 250",
    "D-5-W 500",
    "D-5-W 1000",
    "D-5-W(แก้ว) 200",
    "D-5-W(แก้ว) 500",
    "D5N/2 300",
    "D5N/5 50",
    "D5N/5 70",
    "D5N/5 75",
    "D5N/5 80",
    "D5N/5 90",
    "D5N/5 100",
    "D5N/5 120",
    "D5N/5 130",
    "D5N/5 200",
    "D5N/5 250",
    "D5N/5 500",
    "D5S(แก้ว) 500",
    "D5S/2 200",
    "D5S/2 400",
    "D5S/2 500",
    "D5S/2 1000",
    "D5S/2(แก้ว) 1000",
    "D5W",
    "D5W 5",
    "NSS 3",
    "NSS 50",
    "NSS 50 mL",
    "NSS 100",
    "NSS 100 mL",
    "NSS 125",
    "NSS 150",
    "NSS 200",
    "NSS 250",
    "NSS 250 mL",
    "NSS 500",
    "NSS 500 mL",
    "NSS(แก้ว) 100",
    "NSS(แก้ว) 500",
    "NSS(แก้ว) 1000",
    "NSS. 10",
    "WFI 10",
    "WFI 20",
    "WFI 50",
    "ขวด Doxo 0"
];

const THAI_LABEL_MAP = {
    vincristine:      'วินคริสทีน - VINCRISTINE',
    carboplatin:      'คาร์โบพลาติน - CARBOPLATIN',
    bleomycin:        'บลีโอมัยซิน - BLEOMYCIN',
    cisplatin:        'ซิสพลาติน - CISPLATIN',
    trastuzumab:      'ทราสทูซูแมบ - TRASTUZUMAB',
    pembrolizumab:    'เพมโบรลิซูแมบ - PEMBROLIZUMAB',
    doxorubicin:      'ดอกโซรูบิซิน - DOXORUBICIN',
    cyclophosphamide: 'ไซโคลฟอสฟาไมด์ - CYCLOPHOSPHAMIDE',
    etoposide:        'อีโทโพไซด์ - ETOPOSIDE',
    docetaxel:        'โดซีแทกเซล - DOCETAXEL',
};

function App() {
    const [theme, setTheme] = useState(localStorage.getItem('appThemeMode') || 'light');
    const [step, setStep] = useState('auth'); // 'auth', 'login' (patient check-in), 'workspace'
    const [user, setUser] = useState(null);
    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [patient, setPatient] = useState({ hn: '', title: '', name: '', height: '', weight: '', gender: '', age: '', allergies: '', ward: '', doctor: '' });
    const [logs, setLogs] = useState([]);
    const [notification, setNotification] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [drugSearchTerm, setDrugSearchTerm] = useState('');
    const [patients, setPatients] = useState([]);
    const [patientSearch, setPatientSearch] = useState('');
    const lastAutofilledHnRef = useRef('');
    const [prevStats, setPrevStats] = useState({ height: '', weight: '', ward: '', doctor: '' });
    const [deleteConfirmLog, setDeleteConfirmLog] = useState(null);
    const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
    const [timeoutCountdown, setTimeoutCountdown] = useState(30);

    const showNotification = (message, type = 'info', duration = 5000) => {
        setNotification({ message, type, duration });
    };

    const checkSolventRules = (drugName, solvent) => {
        if (!drugName || !solvent) return;
        const dName = drugName.toLowerCase();
        const sName = solvent.toLowerCase();
        if (sName === 'ระบุเอง') return;

        const rule = DRUG_SOLVENT_RULES.find(r => dName.includes(r.drugName.toLowerCase()));
        if (rule) {
            let triggers = false;
            if (rule.keywords.includes('*')) {
                triggers = true;
            } else {
                for (const kw of rule.keywords) {
                    if (sName.includes(kw.toLowerCase())) {
                        triggers = true;
                        break;
                    }
                }
            }
            if (triggers) {
                showNotification(rule.title + '\n' + rule.desc.replace(/\\n/g, '\n'), 'error', 0);
            }
        }
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
    const [selectedDrugs, setSelectedDrugs] = useState(['vincristine']);
    const [singleDrugResults, setSingleDrugResults] = useState([]);
    const [drugParams, setDrugParams] = useState({ auc: 5, gfr: '' });
    const [amputation, setAmputation] = useState('none');
    const [ampDetails, setAmpDetails] = useState({ level: 'below_knee', method: 'weight_method' });
    const [showDrugInfo, setShowDrugInfo] = useState(false);
    const [showBsaInfo, setShowBsaInfo] = useState(false);
    const [showAmpInfo, setShowAmpInfo] = useState(false);
    const [selectedRegimen, setSelectedRegimen] = useState('custom'); // 'custom', 'cv', 'bc'
    const [useAutoGfr, setUseAutoGfr] = useState(false);
    const [patientScr, setPatientScr] = useState('');
    const [drugsList, setDrugsList] = useState([]);
    const [wbc, setWbc] = useState('');
    const [adminRows, setAdminRows] = useState([
        { id: Date.now(), drugName: '', route: '', solvent: '', startDate: '', endDate: '', rate: '', order: 1, skipped: false }
    ]);
    const [anc, setAnc] = useState('');
    const [plt, setPlt] = useState('');
    const [tbili, setTbili] = useState('');
    const [ast, setAst] = useState('');
    const [alt, setAlt] = useState('');
    const [alp, setAlp] = useState('');
    const [multipleDoses, setMultipleDoses] = useState([]);
    const [enableHematology, setEnableHematology] = useState(true);
    const [enableLiver, setEnableLiver] = useState(true);
    const [enableRenal, setEnableRenal] = useState(true);
    const [autoGfrValue, setAutoGfrValue] = useState(null);
    const [formulaFilter, setFormulaFilter] = useState('all');
    const [pharmacistFilter, setPharmacistFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [drugDropdownOpen, setDrugDropdownOpen] = useState(false);
    const [customSolvents, setCustomSolvents] = useState(() => {
        try {
            const saved = localStorage.getItem('customSolvents');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const allSolvents = useMemo(() => {
        return Array.from(new Set([...SOLVENT_OPTIONS, ...customSolvents])).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    }, [customSolvents]);

    const [customRates, setCustomRates] = useState(() => {
        try {
            const saved = localStorage.getItem('customRates');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const allRates = useMemo(() => {
        return Array.from(new Set([...RATE_OPTIONS, ...customRates])).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    }, [customRates]);

    const [customAdminDrugs, setCustomAdminDrugs] = useState(() => {
        try {
            const saved = localStorage.getItem('customAdminDrugs');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const [selectedHnDetail, setSelectedHnDetail] = useState(null);
    const drugDropdownRef = useRef(null);
    const drugsInfo = useMemo(() => {
        const defaultList = [
            {
                id: 'vincristine',
                name: 'VINCRISTINE',
                desc: 'คำนวณตาม BSA พร้อม Dose Cap',
                details: 'Dose = BSA × 1.4 mg/m² (หากผลลัพธ์โดส > 2.0 mg จะทำการจำกัดขนาดยาสูงสุดไว้ที่ 2.0 mg เพื่อป้องกันอาการพิษต่อระบบประสาท)',
                color: 'sky',
                raw: { is_active: 1, calculation_type: 'BSA', max_dose_cap: 2.0 }
            },
            {
                id: 'carboplatin',
                name: 'CARBOPLATIN',
                desc: 'คำนวณผ่าน Calvert Formula',
                details: 'Dose = Target AUC × (CrCl + 25) (จำกัดค่า CrCl สูงสุดไม่เกิน 125 ml/min เพื่อความปลอดภัย)',
                color: 'amber',
                raw: { is_active: 1, calculation_type: 'CALVERT_FORMULA', max_gfr_cap: 125 }
            },
            {
                id: 'bleomycin',
                name: 'BLEOMYCIN',
                desc: 'กำหนดขนาดยาคงที่ (Fixed Dose)',
                details: 'ขนาดยาในสูตร BEP Regimen ถูกกำหนดขนาดยาคงที่ไว้ที่ 30 units เสมอ เพื่อความปลอดภัยของปอดผู้ป่วย',
                color: 'purple',
                raw: { is_active: 1, calculation_type: 'FIXED_DOSE', max_dose_cap: 30 }
            }
        ];

        if (!drugsList || drugsList.length === 0) {
            return defaultList;
        }

        const colorMap = {
            vincristine: 'sky',
            carboplatin: 'amber',
            bleomycin: 'purple',
            cisplatin: 'rose',
            trastuzumab: 'emerald',
            pembrolizumab: 'indigo'
        };

        const descMap = {
            'BSA': 'คำนวณตาม BSA',
            'CALVERT_FORMULA': 'คำนวณผ่าน Calvert Formula',
            'FIXED_DOSE': 'กำหนดขนาดยาคงที่ (Fixed Dose)',
            'WEIGHT_BASED': 'คำนวณตามน้ำหนักตัว (Weight-based)'
        };

        return drugsList.map(d => {
            const id = (d.drug_name || d.name || '').toLowerCase();
            const color = colorMap[id] || 'emerald';

            let details = '';
            if (d.calculation_type === 'BSA') {
                details = `Dose = BSA × ${d.multiplier || 1.4} mg/m²`;
                if (d.max_dose_cap) {
                    details += ` (จำกัดขนาดยาสูงสุดไม่เกิน ${parseFloat(d.max_dose_cap)} mg เพื่อความปลอดภัย)`;
                }
            } else if (d.calculation_type === 'CALVERT_FORMULA') {
                details = `Dose = Target AUC × (CrCl + 25)`;
                if (d.max_gfr_cap) {
                    details += ` (จำกัดค่า CrCl สูงสุดไม่เกิน ${parseFloat(d.max_gfr_cap)} ml/min เพื่อความปลอดภัย)`;
                }
            } else if (d.calculation_type === 'FIXED_DOSE') {
                details = `Dose = ${parseFloat(d.max_dose_cap || 30)} units (Fixed Dose)`;
            } else if (d.calculation_type === 'WEIGHT_BASED') {
                details = `Dose = ${parseFloat(d.multiplier || 2)} mg/kg × น้ำหนักตัว`;
                if (d.max_dose_cap) {
                    details += ` (จำกัดขนาดยาสูงสุดไม่เกิน ${parseFloat(d.max_dose_cap)} mg เพื่อความปลอดภัย)`;
                }
            }

            return {
                id,
                name: (d.drug_name || d.name || '').toUpperCase(),
                desc: descMap[d.calculation_type] || 'คำนวณขนาดยาอัตโนมัติ',
                details,
                color,
                raw: d
            };
        });
    }, [drugsList]);

    const allAdminDrugs = useMemo(() => {
        const baseDrugs = drugsInfo.map(d => THAI_LABEL_MAP[d.id] || d.name);
        return Array.from(new Set([...baseDrugs, ...customAdminDrugs])).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    }, [drugsInfo, customAdminDrugs]);

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

    // Fetch logs and active drugs on mount
    useEffect(() => {
        fetchLogs();
        const fetchDrugs = async () => {
            try {
                const res = await axios.get('/api/drugs');
                if (res.data && res.data.success) {
                    setDrugsList(res.data.drugs);
                }
            } catch (err) {
                console.error("Failed to fetch drugs list:", err);
            }
        };
        fetchDrugs();
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
            gender: p.gender || '',
            allergies: p.allergies || '',
            ward: '',   // clear for new input
            doctor: ''  // clear for new input
        });
        setPrevStats({
            height: p.height || '',
            weight: p.weight || '',
            ward: p.ward || '',
            doctor: p.doctor || ''
        });
        showNotification(`ดึงข้อมูลผู้ป่วย H.N. ${p.hn} เรียบร้อยแล้ว`, "success");
    };

    const getPreviousDoctor = () => {
        const patientLogs = logs.filter(log => log.hn === patient.hn);
        if (patientLogs.length > 0) {
            const lastLogWithDoc = patientLogs.find(log => log.doctor);
            return lastLogWithDoc ? lastLogWithDoc.doctor : 'ไม่ระบุ';
        }
        return 'ไม่มีประวัติรอบก่อน';
    };

    // Auto-fill when typing an existing H.N.
    useEffect(() => {
        if (!patient.hn) {
            lastAutofilledHnRef.current = '';
            setPrevStats({ height: '', weight: '', ward: '', doctor: '' });
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
                gender: matched.gender || '',
                allergies: matched.allergies || '',
                ward: '',   // clear for new input
                doctor: ''  // clear for new input
            });
            setPrevStats({
                height: matched.height || '',
                weight: matched.weight || '',
                ward: matched.ward || '',
                doctor: matched.doctor || ''
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
            let factor = 0, bsaFactor = 0;
            switch(ampDetails.level) {
                case 'below_knee': factor = 0.06; bsaFactor = 0.09; break;
                case 'above_knee': factor = 0.15; bsaFactor = 0.18; break;
                case 'below_elbow': factor = 0.03; bsaFactor = 0.04; break;
                case 'above_elbow': factor = 0.05; bsaFactor = 0.09; break;
                default: factor = 0.06; bsaFactor = 0.09;
            }

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
            
            let wtVal = parseFloat(patient.weight);
            if (amputation === 'amputee') {
                let factor = 0;
                switch(ampDetails.level) {
                    case 'below_knee': factor = 0.06; break;
                    case 'above_knee': factor = 0.15; break;
                    case 'below_elbow': factor = 0.03; break;
                    case 'above_elbow': factor = 0.05; break;
                    default: factor = 0.06;
                }
                wtVal = wtVal * (1 - factor);
            }
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

        const params = { ...drugParams, gfr: useAutoGfr ? effectiveGfr : drugParams.gfr };
        const results = selectedDrugs.map(drugId => {
            const { dose, note } = calculateDose(currentBsa, drugId, params);
            const drugInfo = drugsInfo.find(d => d.id === drugId);
            const drugName = drugInfo?.name || drugId.toUpperCase();
            let unit = 'mg';
            if (drugId === 'bleomycin') {
                unit = 'units';
            } else if (drugInfo?.raw?.standard_dose_unit) {
                const stdUnit = drugInfo.raw.standard_dose_unit.toLowerCase().trim();
                if (stdUnit.includes('ml')) unit = 'ml';
                else if (stdUnit.includes('unit')) unit = 'units';
            }
            return { id: drugId, name: drugName, dose, note, unit };
        });
        setSingleDrugResults(results);
        setFinalDose('');
        setMultipleDoses([]);
        const combinedNote = results.map(r => r.note).filter(Boolean).join(' | ');
        
        let prefix = '';
        if (selectedRegimen === 'cv') prefix = 'CV Regimen | ';
        if (selectedRegimen === 'bc') prefix = 'BC Regimen | ';

        setCalculationDetails({
            formulaUsed: `${prefix}${formula.toUpperCase()}`,
            amputation: ampText,
            pharmacistNote: combinedNote
        });
    }, [patient, formula, selectedDrugs, drugParams, amputation, ampDetails, selectedRegimen, useAutoGfr, patientScr, calculateBSA, calculateDose, setBsa, setFinalDose, setCalculationDetails]);

    const handleUnitChange = (drugId, newUnit) => {
        setSingleDrugResults(prev => prev.map(item => item.id === drugId ? { ...item, unit: newUnit } : item));
    };

    const printStickers = () => {
        const activeRows = adminRows.filter(r => !r.skipped);
        if (activeRows.length === 0) {
            showNotification('ไม่มีรายการยาสำหรับพิมพ์', 'warning');
            return;
        }

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            showNotification('โปรดอนุญาตให้เบราว์เซอร์เปิดหน้าต่าง Pop-up เพื่อพิมพ์สติ๊กเกอร์', 'warning');
            return;
        }

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>พิมพ์สติ๊กเกอร์ยา</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
            <style>
                @page { size: 8cm 5cm; margin: 0; }
                body { 
                    font-family: 'Sarabun', sans-serif; 
                    margin: 0; 
                    padding: 0;
                    font-size: 14px;
                    color: #000;
                }
                .sticker {
                    width: 8cm;
                    height: 5cm;
                    padding: 0.3cm 0.5cm;
                    box-sizing: border-box;
                    page-break-after: always;
                    display: flex;
                    flex-direction: column;
                    border: 1px dashed #ccc;
                }
                @media print {
                    .sticker { border: none; page-break-after: always; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
                .header { 
                    font-weight: bold; 
                    border-bottom: 1px solid #000; 
                    padding-bottom: 2px; 
                    margin-bottom: 4px; 
                    font-size: 14px;
                    display: flex;
                    justify-content: space-between;
                }
                .drug-name { font-weight: bold; font-size: 16px; margin: 2px 0; }
                .details { margin-top: 2px; line-height: 1.3; font-size: 13px; }
                .details b { font-weight: 700; }
                .footer { margin-top: auto; font-size: 11px; text-align: right; }
            </style>
        </head>
        <body>
            ${activeRows.map(r => `
                <div class="sticker">
                    <div class="header">
                        <span>ชื่อ: ${patient.title || ''}${patient.name || '-'}</span>
                        <span>HN: ${patient.hn || '-'}</span>
                    </div>
                    <div class="drug-name">${r.drugName || '-'}</div>
                    <div class="details">
                        <div><b>วิธีให้ยา:</b> ${r.route || '-'}</div>
                        <div><b>ตัวทำละลาย:</b> ${r.solvent || '-'}</div>
                        <div><b>อัตราเร็ว:</b> ${r.rate || '-'}</div>
                        <div><b>วันที่:</b> ${r.startDate || '-'} ${r.endDate ? 'ถึง ' + r.endDate : ''}</div>
                    </div>
                    <div class="footer">ลำดับ: ${r.order || '-'}</div>
                </div>
            `).join('')}
            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 500);
                };
            </script>
        </body>
        </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const printCalculationA4 = () => {
        if (!patient.hn) {
            showNotification('กรุณาระบุข้อมูลผู้ป่วย (HN) เพื่อพิมพ์ใบสรุป', 'warning');
            return;
        }

        const printWindow = window.open('', '_blank', 'width=800,height=800');
        if (!printWindow) {
            showNotification('โปรดอนุญาตให้เบราว์เซอร์เปิดหน้าต่าง Pop-up เพื่อพิมพ์', 'warning');
            return;
        }

        const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>พิมพ์ผลการคำนวณ A4</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700;900&display=swap" rel="stylesheet">
            <style>
                @page { size: A4; margin: 2cm; }
                body { 
                    font-family: 'Sarabun', sans-serif; 
                    margin: 0; 
                    padding: 0;
                    font-size: 16px;
                    color: #000;
                    line-height: 1.5;
                }
                h1 { text-align: center; font-size: 22px; font-weight: 900; margin-bottom: 25px; text-decoration: underline; }
                .section { margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px dashed #ccc; }
                .section-title { font-size: 18px; font-weight: bold; margin-bottom: 12px; background: #f0f0f0; padding: 6px 12px; border-radius: 6px; }
                .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
                .col { flex: 1; }
                .bold { font-weight: bold; }
                .drug-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                .drug-table th, .drug-table td { border: 1px solid #000; padding: 10px; text-align: left; }
                .drug-table th { background-color: #f0f0f0; }
                .highlight { font-size: 18px; font-weight: bold; }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <h1>ใบสรุปผลการคำนวณยาเคมีบำบัด</h1>
            
            <div class="section">
                <div class="section-title">ข้อมูลผู้ป่วย (Patient Information)</div>
                <div class="row">
                    <div class="col"><span class="bold">ชื่อ-สกุล:</span> ${patient.title || ''}${patient.name || '-'}</div>
                    <div class="col"><span class="bold">HN:</span> ${patient.hn || '-'}</div>
                </div>
                <div class="row">
                    <div class="col"><span class="bold">น้ำหนัก:</span> ${patient.weight || '-'} kg</div>
                    <div class="col"><span class="bold">ส่วนสูง:</span> ${patient.height || '-'} cm</div>
                </div>
                <div class="row">
                    <div class="col"><span class="bold">อายุ:</span> ${patient.age || '-'} ปี</div>
                    <div class="col"><span class="bold">เพศ:</span> ${patient.gender === 'M' ? 'ชาย (Male)' : patient.gender === 'F' ? 'หญิง (Female)' : '-'}</div>
                </div>
                <div class="row">
                    <div class="col"><span class="bold">ประวัติแพ้ยา:</span> ${patient.allergies || 'ไม่มี (None)'}</div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">ข้อมูลการคำนวณ (Calculation Parameters)</div>
                <div class="row">
                    <div class="col"><span class="bold">พื้นที่ผิว (BSA):</span> <span class="highlight">${bsa ? Number(bsa).toFixed(4) : '-'} m²</span></div>
                    <div class="col"><span class="bold">สูตรที่ใช้:</span> ${formula === 'mosteller' ? 'Mosteller' : 'DuBois'}</div>
                </div>
                <div class="row">
                    <div class="col"><span class="bold">สถานะการสูญเสียอวัยวะ:</span> ${amputation === 'amputee' ? 'มีประวัติตัดแขนขา' : 'ปกติ (None)'}</div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">สรุปการสั่งยา (Drug Orders)</div>
                <table class="drug-table">
                    <thead>
                        <tr>
                            <th>ชื่อยา (Drug)</th>
                            <th>ขนาดยาที่คำนวณได้ (Calculated Dose)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${singleDrugResults.map(item => `
                            <tr>
                                <td class="bold">${item.name}</td>
                                <td class="highlight">${item.dose} ${item.unit || (item.id === 'bleomycin' ? 'units' : 'mg')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${calculationDetails.pharmacistNote ? `
                    <div style="margin-top: 15px; font-weight: bold; border: 1px solid #000; padding: 10px; background-color: #f9f9f9;">
                        หมายเหตุ (Note): ${calculationDetails.pharmacistNote}
                    </div>
                ` : ''}
            </div>

            <div class="section" style="border: none; text-align: right; margin-top: 30px;">
                <div>พิมพ์เมื่อ: ${today}</div>
                <div style="margin-top: 60px;">
                    ________________________________________<br>
                    <span style="display: inline-block; margin-top: 5px;">ผู้รับรอง/ผู้เตรียมยา</span>
                </div>
            </div>
            
            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 500);
                };
            </script>
        </body>
        </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handleAddRow = () => {
        setAdminRows(prev => [
            ...prev,
            { id: Date.now(), route: '', solvent: '', startDate: '', endDate: '', rate: '', order: prev.length + 1, skipped: false }
        ]);
    };

    const getLabRecommendations = () => {
        const alerts = [];
        const ancVal = parseFloat(anc);
        const pltVal = parseFloat(plt);
        const tbiliVal = parseFloat(tbili);
        const astVal = parseFloat(ast);
        const altVal = parseFloat(alt);
        const crclVal = useAutoGfr ? autoGfrValue : parseFloat(drugParams.gfr);

        const activeDrugs = [...selectedDrugs];

        // Allergy warnings
        if (patient.allergies) {
            const matchedAllergy = activeDrugs.filter(drugName => patient.allergies.toLowerCase().includes(drugName.toLowerCase()));
            if (matchedAllergy.length > 0) {
                alerts.push({
                    type: 'danger',
                    message: `❌ ผู้ป่วยมีประวัติแพ้ยาตรงกับยาสูตรนี้: ${matchedAllergy.map(d => d.toUpperCase()).join(', ')} (จากประวัติแพ้ยา: "${patient.allergies}")`
                });
            } else {
                alerts.push({
                    type: 'warning',
                    message: `⚠️ ข้อควรระวัง: ผู้ป่วยรายนี้มีประวัติแพ้ยาอื่น ("${patient.allergies}") โปรดตรวจสอบอย่างระมัดระวัง`
                });
            }
        }

        // 1. Check Hematologic parameters (ANC, Platelets)
        if (!isNaN(ancVal)) {
            if (activeDrugs.includes('carboplatin') && ancVal < 1500) {
                alerts.push({
                    type: 'danger',
                    message: `ANC ต่ำกว่า 1,500 cells/mm³ (${ancVal}): แนะนำเลื่อนหรือเลี่ยงการใช้ยา Carboplatin (Delay/Hold)`
                });
            }
            if (activeDrugs.includes('cisplatin') && ancVal < 1500) {
                alerts.push({
                    type: 'danger',
                    message: `ANC ต่ำกว่า 1,500 cells/mm³ (${ancVal}): แนะนำเลื่อนหรือเลี่ยงการใช้ยา Cisplatin (Delay/Hold)`
                });
            }
            if (activeDrugs.includes('vincristine') && ancVal < 1000) {
                alerts.push({
                    type: 'danger',
                    message: `ANC ต่ำกว่า 1,000 cells/mm³ (${ancVal}): แนะนำเลื่อนหรือเลี่ยงการใช้ยา Vincristine (Delay/Hold)`
                });
            }
            if (activeDrugs.includes('bleomycin') && ancVal < 1000) {
                alerts.push({
                    type: 'danger',
                    message: `ANC ต่ำกว่า 1,000 cells/mm³ (${ancVal}): แนะนำเลื่อนหรือเลี่ยงการใช้ยา Bleomycin (Delay/Hold)`
                });
            }
        }

        if (!isNaN(pltVal)) {
            if (activeDrugs.includes('carboplatin') && pltVal < 100000) {
                alerts.push({
                    type: 'danger',
                    message: `Platelets ต่ำกว่า 100,000 cells/mm³ (${pltVal}): แนะนำเลื่อนหรือเลี่ยงการใช้ยา Carboplatin (Delay/Hold)`
                });
            }
            if (activeDrugs.includes('cisplatin') && pltVal < 100000) {
                alerts.push({
                    type: 'danger',
                    message: `Platelets ต่ำกว่า 100,000 cells/mm³ (${pltVal}): แนะนำเลื่อนหรือเลี่ยงการใช้ยา Cisplatin (Delay/Hold)`
                });
            }
            if (activeDrugs.includes('vincristine') && pltVal < 75000) {
                alerts.push({
                    type: 'danger',
                    message: `Platelets ต่ำกว่า 75,000 cells/mm³ (${pltVal}): แนะนำเลื่อนหรือเลี่ยงการใช้ยา Vincristine (Delay/Hold)`
                });
            }
            if (activeDrugs.includes('bleomycin') && pltVal < 50000) {
                alerts.push({
                    type: 'danger',
                    message: `Platelets ต่ำกว่า 50,000 cells/mm³ (${pltVal}): แนะนำเลื่อนหรือเลี่ยงการใช้ยา Bleomycin (Delay/Hold)`
                });
            }
        }

        // 2. Check Liver parameters (Bilirubin, AST, ALT)
        if (activeDrugs.includes('vincristine')) {
            if (!isNaN(tbiliVal)) {
                if (tbiliVal > 3.0) {
                    alerts.push({
                        type: 'danger',
                        message: `Total Bilirubin > 3.0 mg/dL (${tbiliVal}): แนะนำให้งดการใช้ยา (Hold) หรือลดขนาด Vincristine ลง 75%`
                    });
                } else if (tbiliVal >= 1.5 && tbiliVal <= 3.0) {
                    alerts.push({
                        type: 'warning',
                        message: `Total Bilirubin 1.5 - 3.0 mg/dL (${tbiliVal}): แนะนำลดขนาด Vincristine ลง 50%`
                    });
                }
            }
            if (!isNaN(altVal) && altVal > 120) {
                alerts.push({
                    type: 'warning',
                    message: `ALT สูงกว่า 3 เท่าของค่าปกติ (${altVal} U/L): พิจารณาลดขนาดหรือเลื่อนการให้ยา Vincristine (Delay/Reduce)`
                });
            }
            if (!isNaN(astVal) && astVal > 120) {
                alerts.push({
                    type: 'warning',
                    message: `AST สูงกว่า 3 เท่าของค่าปกติ (${astVal} U/L): พิจารณาลดขนาดหรือเลื่อนการให้ยา Vincristine (Delay/Reduce)`
                });
            }
        }

        // 3. Check Kidney parameters (CrCl)
        if (!isNaN(crclVal)) {
            if (activeDrugs.includes('bleomycin')) {
                if (crclVal < 10) {
                    alerts.push({
                        type: 'danger',
                        message: `CrCl < 10 ml/min (${crclVal}): แนะนำลดขนาดยา Bleomycin ลง 50-75%`
                    });
                } else if (crclVal >= 10 && crclVal < 50) {
                    alerts.push({
                        type: 'warning',
                        message: `CrCl 10-50 ml/min (${crclVal}): แนะนำลดขนาดยา Bleomycin ลง 25-50%`
                    });
                }
            }

            if (activeDrugs.includes('cisplatin')) {
                if (crclVal < 50) {
                    alerts.push({
                        type: 'danger',
                        message: `CrCl < 50 ml/min (${crclVal}): แนะนำให้งดการใช้ยา (Hold) Cisplatin เนื่องจากพิษต่อไตสูง`
                    });
                } else if (crclVal >= 50 && crclVal <= 60) {
                    alerts.push({
                        type: 'warning',
                        message: `CrCl 50-60 ml/min (${crclVal}): แนะนำลดขนาดยา Cisplatin ลง 25-50% หรือเปลี่ยนไปใช้ Carboplatin`
                    });
                }
            }

            if (activeDrugs.includes('carboplatin')) {
                if (crclVal < 15) {
                    alerts.push({
                        type: 'danger',
                        message: `CrCl < 15 ml/min (${crclVal}): ไตเสื่อมระดับรุนแรง โปรดพิจารณางดการใช้ยา (Hold) Carboplatin เพื่อความปลอดภัย`
                    });
                }
            }
        }

        return alerts;
    };

    const handleVerify = async () => {
        let doseText = singleDrugResults.map(r => `${r.dose} ${r.unit || (r.id === 'bleomycin' ? 'units' : 'mg')}`).join(' + ');

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

        const activeDrugs = [...selectedDrugs];
        const drugsUsed = activeDrugs.map(d => d.toUpperCase()).join(', ');

        const logData = {
            timestamp: getFormattedThaiTimestamp(),
            hn: patient.hn,
            patientName: name,
            calculatedBsaM2: formatBsa(bsa),
            formulaUsed: sanitizeNaN(`${calculationDetails.formulaUsed} | ${calculationDetails.amputation}`),
            prescribedDose: sanitizeNaN(doseText),
            userName: user.name || user.username,
            gender: patient.gender,
            age: patient.age,
            ward: patient.ward || '',
            allergies: patient.allergies || '',
            drugsUsed: drugsUsed,
            doctor: patient.doctor || ''
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

    // Close drug dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (drugDropdownRef.current && !drugDropdownRef.current.contains(e.target)) {
                setDrugDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        const finalWard = patient.ward || prevStats.ward || '';
        const finalDoctor = patient.doctor || prevStats.doctor || '';

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
            weight: String(finalWeight),
            ward: finalWard,
            doctor: finalDoctor
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

    // Convert ISO date string (YYYY-MM-DD) → Thai Buddhist Era (DD/MM/YYYY+543)
    const isoToThaiDate = (iso) => {
        if (!iso) return '';
        const [y, m, d] = iso.split('-');
        if (!y || !m || !d) return iso;
        return `${d}/${m}/${parseInt(y, 10) + 543}`;
    };

    // Convert Thai Buddhist Era (DD/MM/YYYY+543) → ISO (YYYY-MM-DD)
    const thaiDateToISO = (thai) => {
        if (!thai) return '';
        const parts = thai.split('/');
        if (parts.length !== 3) return '';
        const [d, m, y] = parts;
        if (!d || !m || !y || y.length < 4) return '';
        const ceYear = parseInt(y, 10) > 2400 ? parseInt(y, 10) - 543 : parseInt(y, 10);
        return `${String(ceYear).padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    };

    // Handler for admin row date text inputs with auto-slash and BE year
    const handleAdminDateChange = (val, prevVal, rowIdx, field) => {
        let cleaned = val.replace(/[^0-9/]/g, '');
        if (val.length > prevVal.length) {
            if (cleaned.length === 2 && !cleaned.includes('/')) cleaned += '/';
            else if (cleaned.length === 5 && cleaned.split('/').length === 2) cleaned += '/';
        }
        if (cleaned.length <= 10) {
            setAdminRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, [field]: cleaned } : r));
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
                (log.user_name && log.user_name.toLowerCase().includes(query)) ||
                (log.ward && log.ward.toLowerCase().includes(query)) ||
                (log.allergies && log.allergies.toLowerCase().includes(query)) ||
                (log.drugs_used && log.drugs_used.toLowerCase().includes(query)) ||
                (log.doctor && log.doctor.toLowerCase().includes(query))
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

    // Multi-drug info mapped dynamically

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
                                                    <span
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSearchQuery(p.hn);
                                                            setStep('calculation-history');
                                                        }}
                                                        className="font-bold text-sky-500 dark:text-sky-400 text-xs font-mono hover:underline cursor-pointer"
                                                        title={`คลิกเพื่อดูประวัติของ H.N. ${p.hn}`}
                                                    >
                                                        H.N. {p.hn} 📂
                                                    </span>
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
                                <select
                                    className="form-control"
                                    value={patient.ward || ''}
                                    onChange={e => setPatient({ ...patient, ward: e.target.value })}
                                >
                                    <option value="">{prevStats.ward ? `หอผู้ป่วยคนก่อน: ${prevStats.ward}` : "เลือกหอผู้ป่วย (Ward) - เว้นว่างหากไม่มี"}</option>
                                    <option value="WARD 08">WARD 08</option>
                                    <option value="WARD 10">WARD 10</option>
                                    <option value="WARD 11">WARD 11</option>
                                </select>
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
                                        <div className="relative flex items-center">
                                            <input
                                                type="text"
                                                placeholder="วว/ดด/ปปปป"
                                                value={startDateFilter}
                                                onChange={e => handleDateInputChange(e.target.value, startDateFilter, setStartDateFilter)}
                                                className="form-control py-1.5 px-3 text-xs rounded-xl font-bold w-full"
                                                maxLength={10}
                                            />
                                            <input
                                                type="date"
                                                className="absolute left-0 right-0 top-0 bottom-0 opacity-0 cursor-pointer w-full h-full"
                                                onClick={(e) => { try { e.target.showPicker(); } catch(err){} }}
                                                value={(() => {
                                                    if (startDateFilter && startDateFilter.length === 10) {
                                                        const d = startDateFilter.substring(0, 2);
                                                        const m = startDateFilter.substring(3, 5);
                                                        const yNum = parseInt(startDateFilter.substring(6, 10), 10);
                                                        if (!isNaN(yNum)) {
                                                            const gYear = yNum > 2400 ? yNum - 543 : yNum;
                                                            return `${gYear}-${m}-${d}`;
                                                        }
                                                    }
                                                    return '';
                                                })()}
                                                onChange={(e) => {
                                                    if (!e.target.value) return;
                                                    const [y, m, d] = e.target.value.split('-');
                                                    const thaiYear = parseInt(y, 10) < 2400 ? parseInt(y, 10) + 543 : parseInt(y, 10);
                                                    handleDateInputChange(`${d}/${m}/${thaiYear}`, startDateFilter, setStartDateFilter);
                                                }}
                                            />
                                            <Calendar size={14} className="absolute right-3 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 mb-1.5 uppercase">วันที่สิ้นสุด (End Date)</label>
                                        <div className="relative flex items-center">
                                            <input
                                                type="text"
                                                placeholder="วว/ดด/ปปปป"
                                                value={endDateFilter}
                                                onChange={e => handleDateInputChange(e.target.value, endDateFilter, setEndDateFilter)}
                                                className="form-control py-1.5 px-3 text-xs rounded-xl font-bold w-full"
                                                maxLength={10}
                                            />
                                            <input
                                                type="date"
                                                className="absolute left-0 right-0 top-0 bottom-0 opacity-0 cursor-pointer w-full h-full"
                                                onClick={(e) => { try { e.target.showPicker(); } catch(err){} }}
                                                value={(() => {
                                                    if (endDateFilter && endDateFilter.length === 10) {
                                                        const d = endDateFilter.substring(0, 2);
                                                        const m = endDateFilter.substring(3, 5);
                                                        const yNum = parseInt(endDateFilter.substring(6, 10), 10);
                                                        if (!isNaN(yNum)) {
                                                            const gYear = yNum > 2400 ? yNum - 543 : yNum;
                                                            return `${gYear}-${m}-${d}`;
                                                        }
                                                    }
                                                    return '';
                                                })()}
                                                onChange={(e) => {
                                                    if (!e.target.value) return;
                                                    const [y, m, d] = e.target.value.split('-');
                                                    const thaiYear = parseInt(y, 10) < 2400 ? parseInt(y, 10) + 543 : parseInt(y, 10);
                                                    handleDateInputChange(`${d}/${m}/${thaiYear}`, endDateFilter, setEndDateFilter);
                                                }}
                                            />
                                            <Calendar size={14} className="absolute right-3 text-slate-400 pointer-events-none" />
                                        </div>
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

                             {selectedHnDetail ? (
                                 <div className="space-y-4">
                                     <div className="flex items-center gap-3 mb-2 no-print">
                                         <button type="button" onClick={() => setSelectedHnDetail(null)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600/10 text-sky-500 border border-sky-500/20 hover:bg-sky-600/20 font-bold text-sm transition-all cursor-pointer">
                                             ← กลับ
                                         </button>
                                         <div>
                                             <span className="font-black text-xl">H.N. {selectedHnDetail}</span>
                                             <span className="text-slate-400 text-sm ml-2">— {filteredLogs.filter(l => l.hn === selectedHnDetail).length} รายการ</span>
                                         </div>
                                     </div>
                                     {(() => {
                                         const hnLogs = filteredLogs.filter(l => l.hn === selectedHnDetail);
                                         const latestLog = hnLogs[0] || {};
                                         return (
                                             <>
                                                 <div className={`p-4 rounded-2xl border flex flex-wrap gap-4 items-center ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/30' : 'bg-sky-50 border-sky-200'}`}>
                                                     <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-black text-xl ${
                                                         latestLog.gender === 'female'
                                                             ? 'bg-rose-500/15 text-rose-500 border border-rose-500/20'
                                                             : 'bg-sky-500/15 text-sky-500 border border-sky-500/20'
                                                     }`}>
                                                         {latestLog.gender === 'female' ? '♀' : '♂'}
                                                     </div>
                                                     <div>
                                                         <p className="font-black text-lg uppercase">{latestLog.patient_name || '-'}</p>
                                                         <p className="text-slate-400 text-sm">
                                                             {latestLog.gender === 'female' ? 'หญิง' : latestLog.gender === 'male' ? 'ชาย' : '-'}
                                                             {latestLog.age ? ` | ${latestLog.age} ปี` : ''}
                                                             {latestLog.ward ? ' | ' + latestLog.ward : ''}
                                                         </p>
                                                     </div>
                                                     <div className="ml-auto text-right">
                                                         <div className="text-3xl font-black text-sky-500">{hnLogs.length}</div>
                                                         <div className="text-xs text-slate-400">ครั้งที่คำนวณ</div>
                                                     </div>
                                                 </div>
                                                 <div className="overflow-x-auto overflow-y-auto max-h-[500px] rounded-lg border border-slate-700/20 shadow-inner scrollable-table-container">
                                                     <table className="w-full text-left text-sm md:text-base print-table">
                                                         <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--table-header-bg)' }}>
                                                             <tr className="bg-sky-600/10 text-slate-400 border-b border-slate-700/20">
                                                                 {renderTableHeader('วันที่บันทึก', 'w-[12%] whitespace-nowrap')}
                                                                 {renderTableHeader('หอผู้ป่วย', 'w-[10%] whitespace-nowrap')}
                                                                 {renderTableHeader('ประวัติแพ้ยา', 'w-[15%] whitespace-nowrap')}
                                                                 {renderTableHeader('BSA', 'w-[8%] whitespace-nowrap', 'justify-center')}
                                                                 {renderTableHeader('สูตรการคำนวณ', 'w-[18%] whitespace-nowrap')}
                                                                 {renderTableHeader('ยาที่ใช้', 'w-[12%] whitespace-nowrap')}
                                                                 {renderTableHeader('Dose', 'w-[12%] whitespace-nowrap', 'justify-end')}
                                                                 {renderTableHeader('แพทย์ผู้สั่ง', 'w-[12%] whitespace-nowrap')}
                                                                 {renderTableHeader('ผู้บันทึก', 'w-[11%] whitespace-nowrap', 'justify-center')}
                                                                 {user?.role?.toUpperCase() === 'ADMIN' && renderTableHeader('จัดการ', 'w-[8%] whitespace-nowrap no-print', 'justify-center')}
                                                             </tr>
                                                         </thead>
                                                         <tbody>
                                                             {hnLogs.map(log => (
                                                                 <tr key={log.id} className="border-b border-slate-700/10 hover:bg-sky-600/5 transition-colors">
                                                                     <td className="p-4 font-mono opacity-70 whitespace-nowrap">{log.timestamp}</td>
                                                                     <td className="p-4 font-bold text-slate-600 dark:text-slate-300">{log.ward || '-'}</td>
                                                                     <td className="p-4 font-bold">
                                                                         {log.allergies ? (
                                                                             <div className="flex flex-wrap gap-1">
                                                                                 {log.allergies.split(',').map(a => a.trim()).filter(Boolean).map((a, i) => (
                                                                                     <span key={i} className="text-red-500 bg-red-500/10 px-2 py-0.5 rounded text-[11px] inline-block font-black">
                                                                                         ⚠️ {a}
                                                                                     </span>
                                                                                 ))}
                                                                             </div>
                                                                         ) : (
                                                                             <span className="text-slate-400 font-normal">-</span>
                                                                         )}
                                                                     </td>
                                                                     <td className="p-4 text-center text-emerald-500 font-bold whitespace-nowrap">{sanitizeNaN(log.calculated_bsa)}</td>
                                                                     <td className="p-4 text-slate-400 font-bold uppercase leading-snug">{sanitizeNaN(log.formula_used)}</td>
                                                                     <td className="p-4 font-bold text-sky-500 uppercase">{log.drugs_used || '-'}</td>
                                                                     <td className="p-4 text-right text-amber-500 font-black whitespace-nowrap">{sanitizeNaN(log.prescribed_dose)}</td>
                                                                     <td className="p-4 text-slate-500 dark:text-slate-400 font-bold truncate max-w-[120px]">{log.doctor || '-'}</td>
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
                                                             ))}
                                                         </tbody>
                                                     </table>
                                                 </div>
                                             </>
                                         );
                                     })()}
                                 </div>
                             ) : (
                                 (() => {
                                     const grouped = {};
                                     filteredLogs.forEach(log => {
                                         if (!grouped[log.hn]) {
                                             grouped[log.hn] = {
                                                 hn: log.hn,
                                                 name: log.patient_name,
                                                 gender: log.gender,
                                                 ward: log.ward,
                                                 logs: []
                                             };
                                         }
                                         grouped[log.hn].logs.push(log);
                                         if (log.patient_name) grouped[log.hn].name = log.patient_name;
                                         if (log.ward) grouped[log.hn].ward = log.ward;
                                         if (log.gender) grouped[log.hn].gender = log.gender;
                                     });
                                     const patientList = Object.values(grouped).sort((a, b) => (b.logs[0]?.timestamp || '').localeCompare(a.logs[0]?.timestamp || ''));
                                     if (patientList.length === 0) return <div className="p-12 text-center text-slate-400 font-bold italic text-lg">ไม่พบประวัติการคำนวณที่ตรงกับการค้นหา</div>;
                                     return (
                                         <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                             {patientList.map(p => {
                                                 const latestLog = p.logs[0] || {};
                                                 const allergyList = latestLog.allergies ? latestLog.allergies.split(',').map(x => x.trim()).filter(Boolean) : [];
                                                 return (
                                                     <button
                                                         key={p.hn}
                                                         type="button"
                                                         onClick={() => setSelectedHnDetail(p.hn)}
                                                         className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] cursor-pointer ${
                                                             theme === 'dark'
                                                                 ? 'bg-slate-800/60 border-slate-700/40 hover:border-sky-500/60 hover:bg-slate-800'
                                                                 : 'bg-white border-slate-200 hover:border-sky-400 shadow-sm hover:shadow-sky-100'
                                                         }`}
                                                     >
                                                         <div className="flex items-start gap-3">
                                                             <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-lg ${
                                                                 p.gender === 'female'
                                                                     ? 'bg-rose-500/15 text-rose-500 border border-rose-500/20'
                                                                     : 'bg-sky-500/15 text-sky-500 border border-sky-500/20'
                                                             }`}>
                                                                 {p.gender === 'female' ? '♀' : '♂'}
                                                             </div>
                                                             <div className="flex-1 min-w-0">
                                                                 <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                                                                     <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-sky-500/15 text-sky-500 border border-sky-500/20">
                                                                         H.N. {p.hn}
                                                                     </span>
                                                                     <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">
                                                                         {p.logs.length} ครั้ง
                                                                     </span>
                                                                 </div>
                                                                 <p className="font-black text-sm uppercase truncate mb-1.5">{p.name || '-'}</p>
                                                                 <div className="flex flex-wrap gap-1 mb-2">
                                                                     <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-500 border border-slate-500/10">
                                                                         {p.gender === 'female' ? 'หญิง' : p.gender === 'male' ? 'ชาย' : '-'}
                                                                     </span>
                                                                     {latestLog.age && (
                                                                         <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-500 border border-slate-500/10">
                                                                             {latestLog.age} ปี
                                                                         </span>
                                                                     )}
                                                                     {p.ward && (
                                                                         <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-500 border border-slate-500/10">
                                                                             {p.ward}
                                                                         </span>
                                                                     )}
                                                                 </div>
                                                                 <div className="text-[11px] font-bold text-slate-400 border-t border-slate-700/5 pt-2 mt-2">
                                                                     {allergyList.length > 0 ? (
                                                                         <div className="flex flex-wrap gap-1 items-center">
                                                                             <span className="text-slate-500 mr-1 text-xs">แพ้:</span>
                                                                             {allergyList.map((a, i) => (
                                                                                 <span key={i} className="text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded text-[10px] font-black border border-red-500/10">
                                                                                     ⚠️ {a}
                                                                                 </span>
                                                                             ))}
                                                                         </div>
                                                                     ) : (
                                                                         <span className="text-slate-400/70 font-bold italic">ไม่มีประวัติแพ้ยา</span>
                                                                     )}
                                                                 </div>
                                                             </div>
                                                         </div>
                                                         <div className="text-[10px] text-slate-400 font-bold border-t border-slate-700/5 pt-2 mt-3 flex items-center justify-between">
                                                             <span>ล่าสุด: {p.logs[0]?.timestamp || '-'}</span>
                                                             <span className="text-sky-500 font-black">ดูประวัติ →</span>
                                                         </div>
                                                     </button>
                                                 );
                                             })}
                                         </div>
                                     );
                                 })()
                             )}
                        </div>
                    </div>
                ) : (
                    <div className="animate-row-in space-y-6">
                        {/* Medical Record View */}
                        <div className="w-full premium-card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
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
                                    })()}{' '}
                                    <span
                                        onClick={() => {
                                            setSearchQuery(patient.hn);
                                            setStep('calculation-history');
                                        }}
                                        className="text-sm font-black text-sky-500 hover:text-sky-400 hover:underline cursor-pointer ml-1"
                                        title={`คลิกเพื่อดูประวัติการรักษาของ H.N. ${patient.hn}`}
                                    >
                                        ({patient.hn} 📂)
                                    </span>
                                </h2>
                                <p className="text-slate-400">H: {patient.height} cm | W: {patient.weight} kg | อายุ: {patient.age ? `${patient.age} ปี` : '-'} | เพศ: {patient.gender === 'female' ? 'หญิง (Female)' : patient.gender === 'male' ? 'ชาย (Male)' : '-'}{patient.ward ? ` | หอผู้ป่วย: ${patient.ward}` : ''}</p>

                                {patient.allergies && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {patient.allergies.split(',').map(a => a.trim()).filter(Boolean).map((a, i) => (
                                            <span key={i} className="px-2 py-0.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-600 font-bold text-xs inline-flex items-center gap-1 animate-pulse">
                                                ⚠️ {a}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                                <div className="text-left bg-slate-800/10 dark:bg-slate-700/10 p-2 rounded-xl border border-slate-700/10 flex flex-col gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">แก้ไขประวัติแพ้ยา:</span>
                                    {/* Tag display */}
                                    {patient.allergies && (
                                        <div className="flex flex-wrap gap-1">
                                            {patient.allergies.split(',').map(a => a.trim()).filter(Boolean).map((a, i) => (
                                                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                                                    {a}
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            const parts = patient.allergies.split(',').map(x => x.trim()).filter(Boolean);
                                                            const updated = parts.filter(x => x !== a).join(', ');
                                                            const updatedPatient = { ...patient, allergies: updated };
                                                            setPatient(updatedPatient);
                                                            try { await axios.post(`${API_BASE}/patients`, updatedPatient); showNotification('อัปเดตประวัติการแพ้ยาเรียบร้อยแล้ว', 'success'); } catch { showNotification('ไม่สามารถบันทึกได้', 'error'); }
                                                        }}
                                                        className="text-rose-400 hover:text-rose-700 font-black leading-none"
                                                    >×</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {/* Add allergy selector */}
                                    <div className="flex gap-2">
                                        <select
                                            value=""
                                            onChange={async (e) => {
                                                const val = e.target.value;
                                                if (!val) return;
                                                if (val === '__custom__') {
                                                    setPatient(p => ({ ...p, _customAllergyInput: p._customAllergyInput || ' ' }));
                                                    return;
                                                }
                                                const existing = patient.allergies ? patient.allergies.split(',').map(x => x.trim()).filter(Boolean) : [];
                                                if (existing.map(x => x.toLowerCase()).includes(val.toLowerCase())) return; // no duplicates
                                                const updated = [...existing, val].join(', ');
                                                const updatedPatient = { ...patient, allergies: updated };
                                                setPatient(updatedPatient);
                                                try { await axios.post(`${API_BASE}/patients`, updatedPatient); showNotification('อัปเดตประวัติการแพ้ยาเรียบร้อยแล้ว', 'success'); } catch { showNotification('ไม่สามารถบันทึกได้', 'error'); }
                                            }}
                                            className="form-control py-1 px-2 text-xs rounded-lg font-bold min-w-[160px]"
                                        >
                                            <option value="">+ เพิ่มยาที่แพ้...</option>
                                            {drugsInfo.filter(d => d.raw?.is_active === 1).map(d => (
                                                <option key={d.id} value={d.name}>{d.name}</option>
                                            ))}
                                            <option value="__custom__">ระบุเอง (Custom)...</option>
                                        </select>
                                        {/* Clear all */}
                                        {patient.allergies && (
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    const updatedPatient = { ...patient, allergies: '' };
                                                    setPatient(updatedPatient);
                                                    try { await axios.post(`${API_BASE}/patients`, updatedPatient); showNotification('ล้างประวัติแพ้ยาแล้ว', 'success'); } catch { showNotification('ไม่สามารถบันทึกได้', 'error'); }
                                                }}
                                                className="text-[11px] font-bold text-slate-400 hover:text-rose-500 transition-colors px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 whitespace-nowrap"
                                            >ล้างทั้งหมด</button>
                                        )}
                                    </div>
                                    {/* Custom input shown when __custom__ is selected */}
                                    {patient._customAllergyInput && (
                                        <div className="flex gap-1">
                                            <input
                                                type="text"
                                                placeholder="พิมพ์ชื่อยาที่แพ้..."
                                                value={patient._customAllergyInput || ''}
                                                onChange={e => setPatient(p => ({ ...p, _customAllergyInput: e.target.value }))}
                                                onKeyDown={async (e) => {
                                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                                        const val = e.target.value.trim();
                                                        const existing = patient.allergies ? patient.allergies.split(',').map(x => x.trim()).filter(Boolean) : [];
                                                        if (!existing.map(x => x.toLowerCase()).includes(val.toLowerCase())) {
                                                            const updated = [...existing, val].join(', ');
                                                            const updatedPatient = { ...patient, allergies: updated, _customAllergyInput: '' };
                                                            setPatient(updatedPatient);
                                                            try { await axios.post(`${API_BASE}/patients`, { ...updatedPatient, _customAllergyInput: undefined }); showNotification('อัปเดตประวัติการแพ้ยาเรียบร้อยแล้ว', 'success'); } catch { showNotification('ไม่สามารถบันทึกได้', 'error'); }
                                                        } else {
                                                            setPatient(p => ({ ...p, _customAllergyInput: '' }));
                                                        }
                                                    }
                                                }}
                                                className="form-control py-1 px-2 text-xs rounded-lg font-bold flex-1"
                                                autoFocus
                                            />
                                            <span className="text-[10px] text-slate-400 self-center">Enter เพื่อเพิ่ม</span>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => {
                                    setPatient({ hn: '', title: '', name: '', height: '', weight: '', gender: '', age: '', allergies: '', ward: '' });
                                    setPrevStats({ height: '', weight: '', ward: '', doctor: '' });
                                    setPatientScr('');
                                    setUseAutoGfr(false);
                                    setAmputation('none');
                                    setWbc('');
                                    setAdminRows([{ id: Date.now(), route: '', solvent: '', startDate: '', endDate: '', rate: '', order: 1, skipped: false }]);
                                    setAnc('');
                                    setPlt('');
                                    setTbili('');
                                    setAst('');
                                    setAlt('');
                                    setAlp('');
                                    setAmpDetails({ level: 'below_knee', method: 'weight_method' });
                                    setStep('login');
                                }} className="bg-sky-600/10 text-sky-500 hover:bg-sky-600/20 px-4 py-2 rounded-lg border border-sky-500/30 transition-all font-bold cursor-pointer whitespace-nowrap">เปลี่ยนเคสผู้ป่วย</button>
                            </div>
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
                                                <option value="below_elbow">ตัดแขนท่อนล่าง (Below Elbow)</option>
                                                <option value="above_elbow">ตัดแขนท่อนบน (Above Elbow)</option>
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
                                                        <li>ตัดขาใต้เข่า (Below Knee): หักออก 6% ของน้ำหนักตัว (คิดเป็น 94% ของน้ำหนักจริง)</li>
                                                        <li>ตัดขาเหนือเข่า (Above Knee): หักออก 15% ของน้ำหนักตัว (คิดเป็น 85% ของน้ำหนักจริง)</li>
                                                        <li>ตัดแขนท่อนล่าง (Below Elbow): หักออก 3% ของน้ำหนักตัว (คิดเป็น 97% ของน้ำหนักจริง)</li>
                                                        <li>ตัดแขนท่อนบน (Above Elbow): หักออก 5% ของน้ำหนักตัว (คิดเป็น 95% ของน้ำหนักจริง)</li>
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
                                                        <li>ตัดแขนท่อนล่าง (Below Elbow): ปรับลดค่า BSA ลง 4%</li>
                                                        <li>ตัดแขนท่อนบน (Above Elbow): ปรับลดค่า BSA ลง 9%</li>
                                                     </ul>
                                                 </div>
                                             </div>
                                         </div>
                                     )}
                                </div>

                                <div className="premium-card p-6 relative z-50">
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



                                    {(() => {
                                        const calcTypeMap = {
                                            'BSA':             'BSA',
                                            'CALVERT_FORMULA': 'Calvert Formula',
                                            'FIXED_DOSE':      'Fixed Dose',
                                            'WEIGHT_BASED':    'ตามน้ำหนักตัว',
                                        };
                                        const categoryConfig = {
                                            'CHEMOTHERAPY':     { label: '💊 เคมีบำบัด (Chemotherapy)',             prefix: '💊 ' },
                                            'TARGETED_THERAPY': { label: '🎯 ยามุ่งเป้า (Targeted Therapy)',        prefix: '🎯 ' },
                                            'IMMUNOTHERAPY':    { label: '🛡️ ภูมิคุ้มกันบำบัด (Immunotherapy)',    prefix: '🛡️ ' },
                                            'SUPPORTIVE_CARE':  { label: '🩺 ยาประคับประคอง (Supportive Care)',      prefix: '🩺 ' },
                                        };
                                        const activeDrugs = drugsInfo.filter(d => d.raw?.is_active === 1);
                                        const grouped = {};
                                        activeDrugs.forEach(d => {
                                            const cat = d.raw?.drug_category || 'CHEMOTHERAPY';
                                            if (!grouped[cat]) grouped[cat] = [];
                                            grouped[cat].push(d);
                                        });
                                        return (
                                            <div className="relative mb-4 z-50" ref={drugDropdownRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setDrugDropdownOpen(!drugDropdownOpen)}
                                                    className="w-full text-left px-5 py-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all flex items-center justify-between shadow-sm"
                                                >
                                                    <span className="truncate pr-4 font-bold text-slate-700 dark:text-slate-200">
                                                        {selectedDrugs.length > 0
                                                            ? `เลือกยาแล้ว ${selectedDrugs.length} ชนิด (${selectedDrugs.map(id => drugsInfo.find(d => d.id === id)?.name || id).join(', ')})`
                                                            : 'โปรดเลือกยาอย่างน้อย 1 ชนิด'}
                                                    </span>
                                                    <ChevronDown size={18} className={`text-slate-400 transition-transform ${drugDropdownOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                {drugDropdownOpen && (
                                                    <div className="absolute top-full left-0 mt-2 w-full max-h-[400px] flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <div className="mb-3 sticky top-0 z-20">
                                                            <div className="relative">
                                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                                <input
                                                                    type="text"
                                                                    placeholder="ค้นหาชื่อยา..."
                                                                    value={drugSearchTerm}
                                                                    onChange={e => setDrugSearchTerm(e.target.value)}
                                                                    className="w-full pl-9 pr-4 py-2 text-sm font-bold border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-slate-700 dark:text-slate-200"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="overflow-y-auto flex-1 pr-1 scrollbar-thin" style={{ maxHeight: '320px' }}>
                                                            {Object.entries(grouped).map(([cat, catDrugs]) => {
                                                                const filteredDrugs = catDrugs.filter(d => {
                                                                    const label = THAI_LABEL_MAP[d.id] || d.name;
                                                                    const term = drugSearchTerm.toLowerCase();
                                                                    return label.toLowerCase().includes(term) || d.name.toLowerCase().includes(term);
                                                                });
                                                                if (filteredDrugs.length === 0) return null;

                                                                const cfg = categoryConfig[cat] || categoryConfig['CHEMOTHERAPY'];
                                                                return (
                                                                    <div key={cat} className="mb-3 last:mb-0">
                                                                        <div className="px-3 py-1.5 text-xs font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50 rounded-lg mb-2 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                                                                            {cfg.label}
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            {filteredDrugs.map(d => {
                                                                                const label = THAI_LABEL_MAP[d.id] || d.name;
                                                                                const calcLabel = calcTypeMap[d.raw?.calculation_type] || d.desc;
                                                                                const limitLabel = d.raw?.max_dose_cap ? ` · Cap ${parseFloat(d.raw.max_dose_cap)} mg` : '';
                                                                                const isChecked = selectedDrugs.includes(d.id);
                                                                                return (
                                                                                    <label
                                                                                        key={d.id}
                                                                                        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border ${isChecked ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                                                                    >
                                                                                        <div className="flex-shrink-0 mt-0.5">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                className="w-4 h-4 text-sky-500 rounded border-slate-300 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                                                                                                checked={isChecked}
                                                                                                onChange={(e) => {
                                                                                                    if (e.target.checked) {
                                                                                                        setSelectedDrugs([...selectedDrugs, d.id]);
                                                                                                    } else {
                                                                                                        setSelectedDrugs(selectedDrugs.filter(id => id !== d.id));
                                                                                                    }
                                                                                                }}
                                                                                            />
                                                                                        </div>
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <div className={`font-bold text-sm ${isChecked ? 'text-sky-700 dark:text-sky-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                                                                {cfg.prefix}{label}
                                                                                            </div>
                                                                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                                                                {calcLabel}{limitLabel}
                                                                                            </div>
                                                                                        </div>
                                                                                    </label>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                        })()}

                                    {showDrugInfo && (
                                        <div className="animate-pop mt-4 mb-6 space-y-4">
                                            {selectedDrugs.map(drugId => {
                                                    const dInfo = drugsInfo.find(d => d.id === drugId) || drugsInfo[0];
                                                    return (
                                                        <div key={dInfo.id} className={`p-5 rounded-2xl border-2 transition-all shadow-md ${dInfo.color === 'sky'
                                                            ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-500/50'
                                                            : dInfo.color === 'amber'
                                                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500/50'
                                                                : dInfo.color === 'purple'
                                                                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-500/50'
                                                                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-500/50'
                                                            }`}>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded tracking-widest ${dInfo.color === 'sky'
                                                                    ? 'bg-sky-500 text-white'
                                                                    : dInfo.color === 'amber'
                                                                        ? 'bg-amber-500 text-slate-900'
                                                                        : dInfo.color === 'purple'
                                                                            ? 'bg-purple-500 text-white'
                                                                            : 'bg-emerald-500 text-slate-900'
                                                                    }`}>
                                                                    ข้อมูลยาที่เลือก
                                                                </span>
                                                                <div className={`text-base font-black uppercase tracking-wider ${dInfo.color === 'sky'
                                                                    ? 'text-sky-700 dark:text-sky-400'
                                                                    : dInfo.color === 'amber'
                                                                        ? 'text-amber-700 dark:text-amber-400'
                                                                        : dInfo.color === 'purple'
                                                                            ? 'text-purple-700 dark:text-purple-400'
                                                                            : 'text-emerald-700 dark:text-emerald-400'
                                                                    }`}>
                                                                    {dInfo.name}
                                                                </div>
                                                            </div>
                                                            <p className="text-sm font-extrabold text-slate-800 dark:text-white leading-snug">
                                                                {dInfo.desc}
                                                            </p>
                                                            <div className="mt-3 p-3 rounded-lg bg-white/60 dark:bg-black/30 border border-slate-200 dark:border-white/5">
                                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
                                                                    {dInfo.details}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            }
                                        </div>
                                    )}

                                    {(selectedDrugs.includes('carboplatin')) && (
                                        <div className="mt-6 p-5 rounded-2xl border-2 border-amber-500/20 bg-amber-500/5 space-y-4">
                                            <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                การตั้งค่าปริมาณยา Carboplatin (Carboplatin Settings)
                                            </h3>
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
                                        </div>
                                    )}
                                </div>
                                {/* Section 05: Lab Results & Safety Checks */}
                                <div className="premium-card p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center font-black text-xs">05</div>
                                            <h2 className="text-lg font-black uppercase">ผลตรวจทางห้องปฏิบัติการ (Lab Results & Safety Checks)</h2>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Card 1: Hematology */}
                                        <div className="p-4 rounded-xl border border-slate-700/20 bg-slate-800/10 space-y-4">
                                            <h3 className="text-xs font-black text-sky-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-700/20 pb-2">
                                                <span>ผลเลือดทางโลหิตวิทยา (Hematology)</span>
                                                <label className="flex items-center cursor-pointer">
                                                    <div className="relative">
                                                        <input type="checkbox" className="sr-only" checked={enableHematology} onChange={(e) => {
                                                            setEnableHematology(e.target.checked);
                                                            if (!e.target.checked) { setWbc(''); setAnc(''); setPlt(''); }
                                                        }} />
                                                        <div className={`block w-8 h-4 rounded-full transition-colors ${enableHematology ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                                        <div className={`dot absolute left-1 top-0.5 bg-white w-3 h-3 rounded-full transition-transform duration-200 ${enableHematology ? 'transform translate-x-4' : ''}`}></div>
                                                    </div>
                                                </label>
                                            </h3>
                                            {enableHematology && (
                                            <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-2">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">WBC (cells/mm³)</label>
                                                    <input
                                                        type="number"
                                                        placeholder="ระบุค่า WBC"
                                                        value={wbc}
                                                        className="form-control text-xs"
                                                        onChange={e => setWbc(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">ANC (cells/mm³)</label>
                                                    <input
                                                        type="number"
                                                        placeholder="ระบุค่า ANC"
                                                        value={anc}
                                                        className="form-control text-xs"
                                                        onChange={e => setAnc(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Platelets (cells/mm³)</label>
                                                    <input
                                                        type="number"
                                                        placeholder="ระบุค่า Platelets"
                                                        value={plt}
                                                        className="form-control text-xs"
                                                        onChange={e => setPlt(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            )}
                                        </div>

                                        {/* Card 2: Liver Function */}
                                        <div className="p-4 rounded-xl border border-slate-700/20 bg-slate-800/10 space-y-4">
                                            <h3 className="text-xs font-black text-amber-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-700/20 pb-2">
                                                <span>การทำงานของตับ (Liver Function)</span>
                                                <label className="flex items-center cursor-pointer">
                                                    <div className="relative">
                                                        <input type="checkbox" className="sr-only" checked={enableLiver} onChange={(e) => {
                                                            setEnableLiver(e.target.checked);
                                                            if (!e.target.checked) { setTbili(''); setAst(''); setAlt(''); setAlp(''); }
                                                        }} />
                                                        <div className={`block w-8 h-4 rounded-full transition-colors ${enableLiver ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                                        <div className={`dot absolute left-1 top-0.5 bg-white w-3 h-3 rounded-full transition-transform duration-200 ${enableLiver ? 'transform translate-x-4' : ''}`}></div>
                                                    </div>
                                                </label>
                                            </h3>
                                            {enableLiver && (
                                            <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-2">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Total Bilirubin (mg/dL)</label>
                                                    <input
                                                        type="number"
                                                        placeholder="ระบุค่า T.Bili"
                                                        step="0.1"
                                                        value={tbili}
                                                        className="form-control text-xs"
                                                        onChange={e => setTbili(e.target.value)}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">AST (U/L)</label>
                                                        <input
                                                            type="number"
                                                            placeholder="AST"
                                                            value={ast}
                                                            className="form-control text-xs"
                                                            onChange={e => setAst(e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">ALT (U/L)</label>
                                                        <input
                                                            type="number"
                                                            placeholder="ALT"
                                                            value={alt}
                                                            className="form-control text-xs"
                                                            onChange={e => setAlt(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">ALP (U/L)</label>
                                                    <input
                                                        type="number"
                                                        placeholder="ระบุค่า ALP"
                                                        value={alp}
                                                        className="form-control text-xs"
                                                        onChange={e => setAlp(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            )}
                                        </div>

                                        {/* Card 3: Renal Function (CrCl) */}
                                        <div className="p-4 rounded-xl border border-slate-700/20 bg-slate-800/10 space-y-4">
                                            <h3 className="text-xs font-black text-emerald-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-700/20 pb-2">
                                                <span>การทำงานของไต (Renal - CrCl)</span>
                                                <label className="flex items-center cursor-pointer">
                                                    <div className="relative">
                                                        <input type="checkbox" className="sr-only" checked={enableRenal} onChange={(e) => {
                                                            setEnableRenal(e.target.checked);
                                                            if (!e.target.checked) { 
                                                                setDrugParams({ ...drugParams, gfr: '' });
                                                                setPatientScr('');
                                                            }
                                                        }} />
                                                        <div className={`block w-8 h-4 rounded-full transition-colors ${enableRenal ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                                        <div className={`dot absolute left-1 top-0.5 bg-white w-3 h-3 rounded-full transition-transform duration-200 ${enableRenal ? 'transform translate-x-4' : ''}`}></div>
                                                    </div>
                                                </label>
                                            </h3>
                                            {enableRenal && (
                                            <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setUseAutoGfr(false)}
                                                        className={`py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${!useAutoGfr
                                                            ? 'bg-emerald-600 text-white shadow-sm'
                                                            : 'bg-slate-700/20 text-slate-400 hover:text-slate-200'
                                                            }`}
                                                    >
                                                        Manual CrCl
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setUseAutoGfr(true)}
                                                        className={`py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${useAutoGfr
                                                            ? 'bg-emerald-600 text-white shadow-sm'
                                                            : 'bg-slate-700/20 text-slate-400 hover:text-slate-200'
                                                            }`}
                                                    >
                                                        Auto CrCl
                                                    </button>
                                                </div>

                                                {!useAutoGfr ? (
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">ระบุค่า CrCl (ml/min)</label>
                                                        <input
                                                            type="number"
                                                            placeholder="CrCl (ml/min)"
                                                            value={drugParams.gfr}
                                                            className="form-control text-xs"
                                                            onChange={e => setDrugParams({ ...drugParams, gfr: e.target.value })}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="block text-[9px] font-bold text-slate-400 mb-1">อายุ (ปี)</label>
                                                                <input
                                                                    type="number"
                                                                    placeholder="Age"
                                                                    value={patient.age}
                                                                    className="form-control text-xs"
                                                                    onChange={e => setPatient({ ...patient, age: e.target.value })}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[9px] font-bold text-slate-400 mb-1">Scr (mg/dL)</label>
                                                                <input
                                                                    type="number"
                                                                    placeholder="Scr"
                                                                    step="0.01"
                                                                    value={patientScr}
                                                                    className="form-control text-xs"
                                                                    onChange={e => setPatientScr(e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-center">
                                                            <div className="text-[9px] text-slate-400">ผลการคำนวณ CrCl (Cockcroft-Gault)</div>
                                                            <div className="text-xs font-black text-emerald-500">
                                                                {autoGfrValue !== null ? (isNaN(autoGfrValue) ? 'ว่าง' : `${autoGfrValue} ml/min`) : 'รอข้อมูลครบถ้วน...'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Warnings list in Section 05 */}
                                    {(() => {
                                        const recommendations = getLabRecommendations();
                                        if (recommendations.length === 0) return null;
                                        return (
                                            <div className="mt-4 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2.5 animate-pop">
                                                <h4 className="text-xs font-black text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                                                    ⚠️ ข้อแนะนำในการปรับขนาดยา (Clinical Safety Warnings):
                                                </h4>
                                                <ul className="list-disc pl-5 text-xs font-bold space-y-1.5 text-slate-800 dark:text-slate-300">
                                                    {recommendations.map((rec, i) => (
                                                        <li key={i} className={rec.type === 'danger' ? 'text-red-500' : 'text-amber-500'}>
                                                            {rec.message}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        );
                                    })()}
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
                                        <div className="border-t border-slate-700/20 pt-4 space-y-3">
                                            <span className="text-xs uppercase text-slate-500 font-black block text-center mb-1">Custom Regimen Doses</span>
                                            {singleDrugResults.length > 0 ? singleDrugResults.map(item => (
                                                <div key={item.id} className="flex justify-between items-center bg-slate-100 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/30">
                                                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">{item.name}</span>
                                                    <span className="text-sm font-black text-amber-600 dark:text-amber-500 flex items-baseline gap-1">
                                                        {sanitizeNaN(item.dose)}
                                                        <select
                                                            value={item.unit || (item.id === 'bleomycin' ? 'units' : 'mg')}
                                                            onChange={(e) => handleUnitChange(item.id, e.target.value)}
                                                            className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 outline-none cursor-pointer hover:border-sky-400 transition-colors"
                                                            title="เปลี่ยนหน่วย"
                                                        >
                                                            <option value="mg">mg</option>
                                                            <option value="ml">ml</option>
                                                            <option value="units">units</option>
                                                        </select>
                                                    </span>
                                                </div>
                                            )) : (
                                                <div className="text-center text-sm font-bold text-slate-400 pb-2">ยังไม่ได้เลือกยา</div>
                                            )}
                                        </div>
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
                                                ⚠️ ขนาดยายังไม่สมบูรณ์ (ว่าง) โปรดระบุค่า CrCl หรือ Creatinine เพื่อคำนวณยาให้สมบูรณ์
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 mt-4 no-print flex-col">
                                        <button
                                            onClick={handleVerify}
                                            className={`w-full btn-primary ${(singleDrugResults.length === 0 || singleDrugResults.some(r => isIncompleteDose(r.dose))) || bsa > 4.5 || bsa < 0.3
                                                ? 'opacity-50 cursor-not-allowed grayscale'
                                                : ''
                                                }`}
                                            disabled={(singleDrugResults.length === 0 || singleDrugResults.some(r => isIncompleteDose(r.dose))) || bsa > 4.5 || bsa < 0.3}
                                        >
                                            บันทึก ➔
                                        </button>
                                        <button
                                            onClick={printCalculationA4}
                                            className="w-full btn btn-secondary text-sm flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer font-bold no-print text-slate-700 dark:text-slate-300"
                                        >
                                            <Printer size={18} /> พิมพ์ผลการคำนวณ (A4)
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

                                                        {/* Section 06: Drug Administration */}
                                <div className="premium-card p-6 mt-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center font-black text-xs">06</div>
                                            <h2 className="text-lg font-black uppercase">รายละเอียดการให้ยา (DRUG ADMINISTRATION)</h2>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={printStickers}
                                                className="btn btn-secondary text-xs flex items-center gap-1 py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer font-bold no-print"
                                            >
                                                <Printer size={14} /> พิมพ์สติ๊กเกอร์
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleAddRow}
                                                className="btn btn-primary text-xs flex items-center gap-1 py-1.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow-sm transition-all cursor-pointer font-bold no-print"
                                            >
                                                + เพิ่มแถว
                                            </button>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-700/20 text-[11px] font-bold uppercase text-slate-400">
                                                    <th className="px-3 py-2.5">ชื่อยา</th>
                                                    <th className="px-3 py-2.5">วิธีให้ยา</th>
                                                    <th className="px-3 py-2.5">ตัวทำละลาย</th>
                                                    <th className="px-3 py-2.5">วันเริ่มต้น</th>
                                                    <th className="px-3 py-2.5">วันสุดท้าย</th>
                                                    <th className="px-3 py-2.5">อัตราเร็ว</th>
                                                    <th className="px-3 py-2.5 text-center">ลำดับ</th>
                                                    <th className="px-3 py-2.5 text-center w-24">ไม่ได้รับยา</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {adminRows.map((row, idx) => (
                                                    <tr
                                                        key={row.id}
                                                        className={`border-b border-slate-700/10 transition-all ${
                                                            row.skipped ? 'opacity-50 bg-red-500/5' : ''
                                                        }`}
                                                    >
                                                        <td className="px-3 py-2.5">
                                                            <div className="flex gap-2 items-center">
                                                                <input
                                                                    type="text"
                                                                    list={`drug-list-${idx}`}
                                                                    value={row.drugName || ''}
                                                                    onChange={e => {
                                                                        const val = e.target.value;
                                                                        setAdminRows(prev => prev.map((r, i) => i === idx ? { ...r, drugName: val } : r));
                                                                        checkSolventRules(val, row.solvent);
                                                                    }}
                                                                    placeholder="ค้นหา/ระบุชื่อยา..."
                                                                    className="form-control py-1.5 px-3 text-xs rounded-lg font-bold min-w-[200px]"
                                                                />
                                                                <datalist id={`drug-list-${idx}`}>
                                                                    {allAdminDrugs.map(drug => (
                                                                        <option key={drug} value={drug} />
                                                                    ))}
                                                                </datalist>
                                                                {row.drugName && !allAdminDrugs.includes(row.drugName) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const val = row.drugName.trim();
                                                                            if (!val) return;
                                                                            const newCustom = [...customAdminDrugs, val];
                                                                            setCustomAdminDrugs(newCustom);
                                                                            localStorage.setItem('customAdminDrugs', JSON.stringify(newCustom));
                                                                        }}
                                                                        className="ml-2 bg-sky-100 text-sky-600 hover:bg-sky-200 border border-sky-200 px-2 py-1.5 rounded-md text-[10px] font-bold transition-colors whitespace-nowrap animate-in fade-in"
                                                                        title="บันทึกชื่อยานี้ไว้ใช้ครั้งต่อไป"
                                                                    >
                                                                        + บันทึก
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <select
                                                                value={row.route}
                                                                onChange={e => setAdminRows(prev => prev.map((r, i) => i === idx ? { ...r, route: e.target.value } : r))}
                                                                className="form-control py-1.5 px-3 text-xs rounded-lg font-bold min-w-[140px]"
                                                            >
                                                                <option value="">-- เลือกวิธี --</option>
                                                                <option value="IV drip">IV drip</option>
                                                                <option value="IV push">IV push</option>
                                                                <option value="Intrathecal">Intrathecal</option>
                                                                <option value="Subcutaneous">Subcutaneous</option>
                                                                <option value="Oral">Oral</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="flex gap-2 items-center">
                                                                <input
                                                                    type="text"
                                                                    list={`solvent-list-${idx}`}
                                                                    value={row.solvent === 'ระบุเอง' ? '' : (row.solvent || '')}
                                                                    onChange={e => {
                                                                        const val = e.target.value;
                                                                        setAdminRows(prev => prev.map((r, i) => i === idx ? { ...r, solvent: val } : r));
                                                                        checkSolventRules(row.drugName, val);
                                                                    }}
                                                                    placeholder="ค้นหา/ระบุเอง..."
                                                                    className="form-control py-1.5 px-3 text-xs rounded-lg font-bold min-w-[200px]"
                                                                />
                                                                <datalist id={`solvent-list-${idx}`}>
                                                                    {allSolvents.map(sol => (
                                                                        <option key={sol} value={sol} />
                                                                    ))}
                                                                </datalist>
                                                                {row.solvent && row.solvent !== 'ระบุเอง' && !allSolvents.includes(row.solvent) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const val = row.solvent.trim();
                                                                            if (!val) return;
                                                                            const newCustom = [...customSolvents, val];
                                                                            setCustomSolvents(newCustom);
                                                                            localStorage.setItem('customSolvents', JSON.stringify(newCustom));
                                                                        }}
                                                                        className="ml-2 bg-sky-100 text-sky-600 hover:bg-sky-200 border border-sky-200 px-2 py-1.5 rounded-md text-[10px] font-bold transition-colors whitespace-nowrap animate-in fade-in"
                                                                        title="บันทึกตัวทำละลายนี้ไว้ใช้ครั้งต่อไป"
                                                                    >
                                                                        + บันทึก
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="relative flex items-center">
                                                                <input
                                                                    type="text"
                                                                    placeholder="วว/ดด/ปปปป"
                                                                    value={row.startDate}
                                                                    onChange={e => handleAdminDateChange(e.target.value, row.startDate, idx, 'startDate')}
                                                                    className="form-control py-1.5 px-3 text-xs rounded-lg font-bold min-w-[140px]"
                                                                    maxLength={10}
                                                                />
                                                                <input
                                                                    type="date"
                                                                    className="absolute left-0 right-0 top-0 bottom-0 opacity-0 cursor-pointer w-full h-full"
                                                                    onClick={(e) => { try { e.target.showPicker(); } catch(err){} }}
                                                                    value={(() => {
                                                                        if (row.startDate && row.startDate.length === 10) {
                                                                            const d = row.startDate.substring(0, 2);
                                                                            const m = row.startDate.substring(3, 5);
                                                                            const yNum = parseInt(row.startDate.substring(6, 10), 10);
                                                                            if (!isNaN(yNum)) {
                                                                                const gYear = yNum > 2400 ? yNum - 543 : yNum;
                                                                                return `${gYear}-${m}-${d}`;
                                                                            }
                                                                        }
                                                                        return '';
                                                                    })()}
                                                                    onChange={(e) => {
                                                                        if (!e.target.value) return;
                                                                        const [y, m, d] = e.target.value.split('-');
                                                                        const thaiYear = parseInt(y, 10) < 2400 ? parseInt(y, 10) + 543 : parseInt(y, 10);
                                                                        handleAdminDateChange(`${d}/${m}/${thaiYear}`, row.startDate, idx, 'startDate');
                                                                    }}
                                                                />
                                                                <Calendar size={14} className="absolute right-3 text-slate-400 pointer-events-none" />
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="relative flex items-center">
                                                                <input
                                                                    type="text"
                                                                    placeholder="วว/ดด/ปปปป"
                                                                    value={row.endDate}
                                                                    onChange={e => handleAdminDateChange(e.target.value, row.endDate, idx, 'endDate')}
                                                                    className="form-control py-1.5 px-3 text-xs rounded-lg font-bold min-w-[140px]"
                                                                    maxLength={10}
                                                                />
                                                                <input
                                                                    type="date"
                                                                    className="absolute left-0 right-0 top-0 bottom-0 opacity-0 cursor-pointer w-full h-full"
                                                                    onClick={(e) => { try { e.target.showPicker(); } catch(err){} }}
                                                                    value={(() => {
                                                                        if (row.endDate && row.endDate.length === 10) {
                                                                            const d = row.endDate.substring(0, 2);
                                                                            const m = row.endDate.substring(3, 5);
                                                                            const yNum = parseInt(row.endDate.substring(6, 10), 10);
                                                                            if (!isNaN(yNum)) {
                                                                                const gYear = yNum > 2400 ? yNum - 543 : yNum;
                                                                                return `${gYear}-${m}-${d}`;
                                                                            }
                                                                        }
                                                                        return '';
                                                                    })()}
                                                                    onChange={(e) => {
                                                                        if (!e.target.value) return;
                                                                        const [y, m, d] = e.target.value.split('-');
                                                                        const thaiYear = parseInt(y, 10) < 2400 ? parseInt(y, 10) + 543 : parseInt(y, 10);
                                                                        handleAdminDateChange(`${d}/${m}/${thaiYear}`, row.endDate, idx, 'endDate');
                                                                    }}
                                                                />
                                                                <Calendar size={14} className="absolute right-3 text-slate-400 pointer-events-none" />
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="flex gap-2 items-center">
                                                                <input
                                                                    type="text"
                                                                    list={`rate-list-${idx}`}
                                                                    placeholder="เช่น 100 mL/hr"
                                                                    value={row.rate || ''}
                                                                    onChange={e => setAdminRows(prev => prev.map((r, i) => i === idx ? { ...r, rate: e.target.value } : r))}
                                                                    className="form-control py-1.5 px-3 text-xs rounded-lg font-bold min-w-[130px]"
                                                                />
                                                                <datalist id={`rate-list-${idx}`}>
                                                                    {allRates.map(rate => (
                                                                        <option key={rate} value={rate} />
                                                                    ))}
                                                                </datalist>
                                                                {row.rate && !allRates.includes(row.rate) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const val = row.rate.trim();
                                                                            if (!val) return;
                                                                            const newCustom = [...customRates, val];
                                                                            setCustomRates(newCustom);
                                                                            localStorage.setItem('customRates', JSON.stringify(newCustom));
                                                                        }}
                                                                        className="ml-2 bg-sky-100 text-sky-600 hover:bg-sky-200 border border-sky-200 px-2 py-1.5 rounded-md text-[10px] font-bold transition-colors whitespace-nowrap animate-in fade-in"
                                                                        title="บันทึกอัตราเร็วนี้ไว้ใช้ครั้งต่อไป"
                                                                    >
                                                                        + บันทึก
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <input
                                                                type="number"
                                                                placeholder="1"
                                                                min="1"
                                                                value={row.order}
                                                                onChange={e => setAdminRows(prev => prev.map((r, i) => i === idx ? { ...r, order: parseInt(e.target.value) || 1 } : r))}
                                                                className="form-control py-1.5 px-3 text-xs rounded-lg font-bold w-16 text-center"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2.5 flex justify-center items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setAdminRows(prev => prev.map((r, i) => i === idx ? { ...r, skipped: !r.skipped } : r));
                                                                }}
                                                                className={`w-7 h-7 rounded border-2 flex items-center justify-center transition-all ${
                                                                    row.skipped
                                                                        ? 'bg-sky-500 border-sky-500 text-white'
                                                                        : 'bg-transparent border-slate-300 hover:border-sky-400'
                                                                }`}
                                                                title="ทำเครื่องหมายไม่ได้รับยา"
                                                            >
                                                                {row.skipped ? <span className="text-sm font-bold">✓</span> : null}
                                                            </button>
                                                            {adminRows.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setAdminRows(prev => prev.filter((_, i) => i !== idx))}
                                                                    className="text-red-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors shrink-0"
                                                                    title="ลบแถว"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {adminRows.some(r => r.skipped) && (
                                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs font-bold animate-pop">
                                            ⚠️ มีแถวที่ไม่ได้ส่งยา (ทำเครื่องหมายงดรับยา) โปรดตรวจสอบก่อนลงบันทึกประวัติ
                                        </div>
                                    )}

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