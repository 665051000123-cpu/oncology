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

    const calculateWeights = useCallback((height, weight, gender) => {
        let h = parseFloat(height);
        let w = parseFloat(weight);
        if (isNaN(h) || h <= 0 || !gender) return { ibw: null, adjBw: null };

        // Devine Formula:
        // Male: 50 + 2.3 * ((height_cm - 152.4) / 2.54)
        // Female: 45.5 + 2.3 * ((height_cm - 152.4) / 2.54)
        const heightInchesOver5Feet = (h - 152.4) / 2.54;
        let ibw = 0;
        if (gender === 'male') {
            ibw = 50 + 2.3 * heightInchesOver5Feet;
        } else if (gender === 'female') {
            ibw = 45.5 + 2.3 * heightInchesOver5Feet;
        } else {
            return { ibw: null, adjBw: null };
        }
        if (ibw < 0) ibw = 0;

        let adjBw = null;
        if (!isNaN(w) && w > 0) {
            adjBw = ibw + 0.4 * (w - ibw);
        }

        return {
            ibw: parseFloat(ibw.toFixed(2)),
            adjBw: adjBw !== null ? parseFloat(adjBw.toFixed(2)) : null
        };
    }, []);

    const calculateDose = useCallback((bsaValue, drugInput, params = {}) => {
        let dose = 0;
        let note = '';

        // If drugInput is a string, do backward compatibility for standard drug names
        if (typeof drugInput === 'string') {
            switch (drugInput.toLowerCase()) {
                case 'vincristine':
                    dose = bsaValue * 1.4; // Typical dose but cap is 2.0
                    if (dose > 2.0) {
                        dose = 2.0;
                        note = 'Dose Capped at 2.0 mg';
                    }
                    break;
                case 'carboplatin':
                    const { auc = '', gfr = '' } = params;
                    let usedAuc = parseFloat(auc);
                    let usedGfr = parseFloat(gfr);

                    if (isNaN(usedAuc)) {
                        dose = NaN;
                        note = 'Waiting for Target AUC value...';
                    } else if (isNaN(usedGfr)) {
                        dose = NaN;
                        note = 'Waiting for CrCl value...';
                    } else {
                        if (usedGfr > 125) {
                            usedGfr = 125;
                            note = 'CrCl capped at 125 ml/min';
                        }
                        dose = usedAuc * (usedGfr + 25);
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
        }

        // If drugInput is a drug configuration object from database:
        const drugObj = drugInput;
        const calcType = drugObj.calculation_type;
        const defaultWeightType = drugObj.default_weight_type || 'ACTUAL';
        
        // Target Dose pre-filled or from params:
        const targetDose = params.targetDose !== undefined && params.targetDose !== '' 
            ? parseFloat(params.targetDose) 
            : parseFloat(drugObj.standard_dose_value || 0);
        
        const doseUnit = drugObj.standard_dose_unit || 'mg';

        if (calcType === 'BSA') {
            let usedBsa = bsaValue;
            let bsaNote = '';
            
            // Check BSA cap
            if (drugObj.max_bsa_cap !== null && drugObj.max_bsa_cap !== undefined) {
                const maxBsa = parseFloat(drugObj.max_bsa_cap);
                if (usedBsa > maxBsa) {
                    usedBsa = maxBsa;
                    bsaNote = ` (BSA capped at ${maxBsa} m²)`;
                }
            }
            
            dose = usedBsa * targetDose;
            note = `BSA-based Calculation (${targetDose} ${doseUnit})${bsaNote}`;
            
            // Check dose cap
            if (drugObj.max_dose_cap !== null && drugObj.max_dose_cap !== undefined) {
                const maxDose = parseFloat(drugObj.max_dose_cap);
                if (dose > maxDose) {
                    dose = maxDose;
                    note = `Dose Capped at ${maxDose} mg${bsaNote}`;
                }
            }
        } 
        else if (calcType === 'WEIGHT_BASED') {
            const { actualWeight, ibw, adjBw } = params;
            let usedWeight = parseFloat(actualWeight || 0);
            let wtLabel = 'Actual Weight';
            
            if (defaultWeightType === 'IDEAL' && ibw !== null && ibw !== undefined) {
                usedWeight = ibw;
                wtLabel = 'Ideal Weight';
            } else if (defaultWeightType === 'ADJUSTED' && adjBw !== null && adjBw !== undefined) {
                usedWeight = adjBw;
                wtLabel = 'Adjusted Weight';
            }
            
            dose = usedWeight * targetDose;
            note = `Weight-based (${wtLabel}: ${usedWeight} kg × ${targetDose} ${doseUnit})`;
            
            // Check dose cap
            if (drugObj.max_dose_cap !== null && drugObj.max_dose_cap !== undefined) {
                const maxDose = parseFloat(drugObj.max_dose_cap);
                if (dose > maxDose) {
                    dose = maxDose;
                    note = `Dose Capped at ${maxDose} mg (${wtLabel} calculation)`;
                }
            }
        } 
        else if (calcType === 'FIXED_DOSE') {
            dose = targetDose;
            note = `Fixed Dose ${targetDose} ${doseUnit}`;
            
            // Check dose cap
            if (drugObj.max_dose_cap !== null && drugObj.max_dose_cap !== undefined) {
                const maxDose = parseFloat(drugObj.max_dose_cap);
                if (dose > maxDose) {
                    dose = maxDose;
                    note = `Fixed Dose (Capped at ${maxDose} mg)`;
                }
            }
        } 
        else if (calcType === 'CALVERT_FORMULA') {
            const { auc = '', gfr = '' } = params;
            let usedAuc = auc !== '' ? parseFloat(auc) : targetDose;
            let usedGfr = parseFloat(gfr);
            
            if (isNaN(usedAuc)) {
                dose = NaN;
                note = 'Waiting for Target AUC value...';
            } else if (isNaN(usedGfr)) {
                dose = NaN;
                note = 'Waiting for CrCl value...';
            } else {
                let gfrNote = '';
                if (drugObj.max_gfr_cap !== null && drugObj.max_gfr_cap !== undefined) {
                    const maxGfr = parseFloat(drugObj.max_gfr_cap);
                    if (usedGfr > maxGfr) {
                        usedGfr = maxGfr;
                        gfrNote = ` (CrCl capped at ${maxGfr} ml/min)`;
                    }
                }
                
                dose = usedAuc * (usedGfr + 25);
                note = `Calvert Formula (AUC ${usedAuc} × (CrCl + 25))${gfrNote}`;
                
                // Check dose cap
                if (drugObj.max_dose_cap !== null && drugObj.max_dose_cap !== undefined) {
                    const maxDose = parseFloat(drugObj.max_dose_cap);
                    if (dose > maxDose) {
                        dose = maxDose;
                        note = `Dose Capped at ${maxDose} mg${gfrNote}`;
                    }
                }
            }
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
        calculateWeights,
        calculateDose
    };
};
