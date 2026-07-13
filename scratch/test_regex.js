
const dose1 = "30.00 mg";
const dose2 = "0.00 mg";
const dose3 = "810.96 mg";

console.log("dose1 match:", (dose1 || "").match(/[\d.]+/) ? (dose1 || "").match(/[\d.]+/)[0] : "");
console.log("dose2 match:", (dose2 || "").match(/[\d.]+/) ? (dose2 || "").match(/[\d.]+/)[0] : "");
console.log("dose3 match:", (dose3 || "").match(/[\d.]+/) ? (dose3 || "").match(/[\d.]+/)[0] : "");


