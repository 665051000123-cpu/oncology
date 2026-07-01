import { useState, useCallback } from 'react';

export const useCalculations = () => {
    const [bsa, setBsa] = useState(0);
    const [finalDose, setFinalDose] = useState(0);
    const [calculationDetails, setCalculationDetails] = useState({
        formulaUsed: '',
        amputation: 'None',
        pharmacistNote: ''
    });

    const calculateBSA = useCallback((height, weight, formula) => {
        let h = parseFloat(height);
        let w = parseFloat(weight);
        if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0) return 0;

        let result = 0;
        if (formula === 'mosteller') {
            result = Math.sqrt((h * w) / 3600);
        } else if (formula === 'dubois') {
            result = 0.20247 * Math.pow(h / 100, 0.725) * Math.pow(w, 0.425);
        }
        return result;
    }, []);

    const calculateDose = useCallback((bsaValue, drug, params = {}) => {
        let dose = 0;
        let note = '';

        switch (drug) {
            case 'vincristine':
                dose = bsaValue * 1.4; // Typical dose but cap is 2.0
                if (dose > 2.0) {
                    dose = 2.0;
                    note = 'Dose Capped at 2.0 mg';
                }
                break;
            case 'carboplatin':
                const { auc = 5, gfr = '' } = params;
                let usedGfr = parseFloat(gfr);

                // If GFR is empty or invalid, return NaN to signal incomplete data
                if (isNaN(usedGfr)) {
                    dose = NaN;
                    note = 'Waiting for eGFR value...';
                } else {
                    if (usedGfr > 125) {
                        usedGfr = 125;
                        note = 'eGFR capped at 125 ml/min';
                    }
                    dose = auc * (usedGfr + 25);
                }
                break;
            case 'bleomycin':
                dose = 30;
                note = 'Fixed Dose 30 units';
                break;
            case 'cisplatin':
                const { targetDose = 75 } = params;
                dose = bsaValue * parseFloat(targetDose);
                note = `BSA-based Calculation (${targetDose} mg/m²)`;
                break;
            default:
                dose = 0;
        }

        const finalDoseValue = isNaN(dose) ? 'ว่าง' : dose.toFixed(2);
        return { dose: finalDoseValue, note };
    }, []);

    return {
        bsa,
        setBsa,
        finalDose,
        setFinalDose,
        calculationDetails,
        setCalculationDetails,
        calculateBSA,
        calculateDose
    };
};
