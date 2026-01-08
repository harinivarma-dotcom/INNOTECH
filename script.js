function checkEligibility() {
    let scheme = document.getElementById("scheme").value;
    let land = parseFloat(document.getElementById("land").value);
    let result = "";

    if (scheme === "") {
        result = "Please select a scheme.";
    }
    else if (isNaN(land) || land <= 0) {
        result = "Please enter valid land in acres.";
    }
    else if (scheme === "PM Kisan") {
        if (land <= 2) {
            result = "Eligible for PM Kisan Yojana (Small & Marginal Farmer).";
        } else {
            result = "Not eligible for PM Kisan (Land exceeds 2 acres).";
        }
    }
    else if (scheme === "PMFBY") {
        if (land >= 1) {
            result = "Eligible for PM Fasal Bima Yojana.";
        } else {
            result = "Not eligible for Crop Insurance (Minimum 1 acre required).";
        }
    }
    else if (scheme === "KCC") {
        if (land >= 0.5) {
            result = "Eligible for Kisan Credit Card.";
        } else {
            result = "Not eligible for Kisan Credit Card (Minimum 0.5 acre required).";
        }
    }

    document.getElementById("eligibilityResult").innerText = result;
}

function submitApplication() {
    let name = document.getElementById("name").value;
    let scheme = document.getElementById("scheme").value;

    if (name === "" || scheme === "") {
        document.getElementById("applicationResult").innerText =
            "Please fill all details before applying.";
        return;
    }

    document.getElementById("applicationResult").innerText =
        "Application submitted successfully for " + scheme + ".";
}

function chatbot() {
    let q = document.getElementById("chatInput").value.toLowerCase();
    let ans = "Please contact the nearest agriculture office.";

    if (q.includes("insurance")) {
        ans = "PM Fasal Bima Yojana provides crop insurance.";
    } else if (q.includes("loan")) {
        ans = "Kisan Credit Card provides easy agricultural loans.";
    } else if (q.includes("scheme")) {
        ans = "PM Kisan provides income support to farmers.";
    }

    document.getElementById("chatOutput").innerText = ans;
}

function showAlert() {
    alert("Reminder: Crop insurance enrollment deadline is approaching.");
}
// Crop price data (₹ per quintal)
const cropPrices = {
    "Telangana": {
        "Rice": 2100,
        "Cotton": 6200,
        "Maize": 1850
    },
    "Andhra Pradesh": {
        "Rice": 2150,
        "Cotton": 6000,
        "Maize": 1800
    },
    "Punjab": {
        "Wheat": 2275,
        "Rice": 2200
    },
    "Maharashtra": {
        "Cotton": 6300,
        "Maize": 1900
    }
};

function showCropPrice() {
    let state = document.getElementById("priceState").value;
    let crop = document.getElementById("crop").value;

    if (state === "" || crop === "") {
        document.getElementById("priceResult").innerText =
            "Please select both state and crop.";
        return;
    }

    if (cropPrices[state] && cropPrices[state][crop]) {
        document.getElementById("priceResult").innerText =
            "Market price of " + crop + " in " + state +
            " is ₹" + cropPrices[state][crop] + " per quintal.";
    } else {
        document.getElementById("priceResult").innerText =
            "Price data not available for selected crop in this state.";
    }
}