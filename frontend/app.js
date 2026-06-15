const API_URL = "https://tiptracker-api.onrender.com";
let isLoginMode = true; // Permet de savoir si on est en mode connexion ou inscription
let currentDisplayedDate = new Date(); // Garde une trace du mois affiché à l'écran
let allShifts = []; // Stockera tous les shifts récupérés du backend
let currentEditingShiftId = null; // 💡 Garde en mémoire l'ID du shift sélectionné pour modif/suppression


// ⚡ AU CHARGEMENT DE LA PAGE
document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    
    // Mettre la date d'aujourd'hui par défaut dans l'input
    const dateInput = document.getElementById("shift-date");
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    if (token) {
        document.getElementById("page-auth").classList.add("hidden");
        document.getElementById("page-dashboard").classList.remove("hidden");
        await fetchShifts();
    }
});

// 🔄 BASCULER ENTRE CONNEXION ET INSCRIPTION
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById("auth-title");
    const submitBtn = document.getElementById("btn-auth-submit");
    const toggleText = document.getElementById("auth-toggle-text");
    const toggleBtn = document.getElementById("btn-auth-toggle");

    if (isLoginMode) {
        title.innerText = "Connexion";
        submitBtn.innerText = "Se connecter";
        toggleText.innerText = "Pas encore de compte ?";
        toggleBtn.innerText = "Créer un compte";
    } else {
        title.innerText = "Inscription";
        submitBtn.innerText = "S'inscrire";
        toggleText.innerText = "Déjà un compte ?";
        toggleBtn.innerText = "Se connecter";
    }
}

// 🔑 GÉRER LA SOUMISSION (CONNEXION OU INSCRIPTION)
async function handleAuthSubmit() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-pass").value;

    if (!email || !password) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    if (isLoginMode) {
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: formData
            });
            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("token", data.access_token);
                document.getElementById("page-auth").classList.add("hidden");
                document.getElementById("page-dashboard").classList.remove("hidden");
                await fetchShifts();
            } else {
                alert(`Erreur : ${data.detail || "Identifiants invalides"}`);
            }
        } catch (error) {
            alert("Erreur de connexion au serveur backend.");
        }
    } else {
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email, password: password })
            });
            const data = await response.json();

            if (response.ok) {
                alert("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
                toggleAuthMode();
            } else {
                alert(`Erreur Inscription : ${data.detail || "Impossible de créer le compte"}`);
            }
        } catch (error) {
            alert("Erreur de connexion au serveur lors de l'inscription.");
        }
    }
}

// 📝 ENREGISTRER OU MODIFIER UN QUART
async function saveShift(event) {
    event.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;

    const hours = parseFloat(document.getElementById("hours").value);
    const tips = parseFloat(document.getElementById("tips").value);
    const wage = parseFloat(document.getElementById("wage").value);
    const selectedDate = document.getElementById("shift-date").value;

    const shiftData = {
        date: selectedDate,
        hours_worked: hours,
        sales: 0.0,
        tips: tips,
        hourly_wage: wage
    };

    let url = `${API_URL}/shifts/`;
    let method = "POST";

    if (currentEditingShiftId) {
        url = `${API_URL}/shifts/${currentEditingShiftId}`;
        method = "PUT";
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(shiftData)
        });

        if (response.ok) {
            alert(currentEditingShiftId ? "Quart mis à jour avec succès !" : "Quart enregistré avec succès !");
            
            // On mémorise la date pour la laisser sélectionnée après l'enregistrement
            const savedDate = selectedDate; 
            resetShiftForm(); 
            await fetchShifts(); // Relance la récupération des données
            selectDate(savedDate); // Actualise instantanément la liste du jour sous le calendrier
        } else {
            const errData = await response.json();
            alert(`Erreur : ${errData.detail || "Action impossible"}`);
        }
    } catch (error) {
        console.error("Erreur lors de l'enregistrement:", error);
        alert("Impossible de joindre le serveur.");
    }
}

// 🔄 CHARGER LES SHIFTS DEPUIS LE SERVEUR
async function fetchShifts() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/shifts/`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            const shifts = await response.json();
            updateUI(shifts);
        }
    } catch (error) {
        console.error(error);
    }
}

// 🔄 CHANGEMENT DE MOIS
function changeMonth(direction) {
    currentDisplayedDate.setMonth(currentDisplayedDate.getMonth() + direction);
    renderCalendar();
}

// 🎨 CONSTRUIRE LE CALENDRIER DYNAMIQUE
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const monthYearLabel = document.getElementById("calendar-month-year");
    if (!grid || !monthYearLabel) return;

    grid.innerHTML = "";

    const year = currentDisplayedDate.getFullYear();
    const month = currentDisplayedDate.getMonth();

    const options = { month: 'long', year: 'numeric' };
    monthYearLabel.innerText = currentDisplayedDate.toLocaleDateString('fr-FR', options);

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "p-2 bg-gray-50 border border-transparent";
        grid.appendChild(emptyDiv);
    }

    for (let day = 1; day <= totalDays; day++) {
        const dayDiv = document.createElement("div");
        dayDiv.className = "p-1 min-h-[60px] bg-gray-50 border border-gray-200 rounded flex flex-col justify-between relative hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer";
        
        const dayNumber = document.createElement("span");
        dayNumber.className = "text-xs font-semibold text-gray-400 self-start";
        dayNumber.innerText = day;
        dayDiv.appendChild(dayNumber);

        const currentCaseDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        dayDiv.onclick = () => selectDate(currentCaseDate);

        // 🕵️‍♂️ RECHERCHE MULTIPLE : On prend TOUS les shifts de cette journée
        const shiftsForDay = allShifts.filter(s => s.date === currentCaseDate);

        if (shiftsForDay.length > 0) {
            dayDiv.classList.add("bg-green-50", "border-green-300");
            
            // On calcule le cumul des tips de la journée
            const totalTipsForDay = shiftsForDay.reduce((sum, s) => sum + s.tips, 0);
            
            const tipBadge = document.createElement("span");
            tipBadge.className = "text-[10px] font-bold text-green-700 bg-green-200 px-1 rounded text-center truncate w-full mt-1";
            tipBadge.innerText = `+${totalTipsForDay.toFixed(2)}$`;
            
            // Si l'utilisateur a fait un split ou cumulé deux jobs, on affiche le nombre de quarts (ex: "2 Q")
            if (shiftsForDay.length > 1) {
                const countBadge = document.createElement("span");
                countBadge.className = "text-[9px] text-gray-500 bg-gray-200 px-1 rounded self-end mt-1 font-mono font-bold";
                countBadge.innerText = `${shiftsForDay.length} Q`;
                dayDiv.appendChild(countBadge);
            }
            
            dayDiv.title = `${shiftsForDay.length} quart(s) travaillé(s). Total pourboires : ${totalTipsForDay}$`;
            dayDiv.appendChild(tipBadge);
        }

        grid.appendChild(dayDiv);
    }

    calculateGlobalAverage();
}

// 📊 CALCULER LA MOYENNE GÉNÉRALE D'HEURES/POURBOIRES
function calculateGlobalAverage() {
    const avgElement = document.getElementById("stat-avg");
    if (!avgElement) return;

    if (allShifts.length === 0) {
        avgElement.innerText = "0";
        return;
    }

    let totalGains = 0;
    let totalHours = 0;

    allShifts.forEach(shift => {
        totalGains += (shift.hourly_wage * shift.hours_worked) + shift.tips;
        totalHours += shift.hours_worked;
    });

    avgElement.innerText = totalHours > 0 ? (totalGains / totalHours).toFixed(2) : "0";
}

// 🎯 SÉLECTIONNER UNE DATE ET DEPLIER LES SHIFTS DU JOUR
function selectDate(dateString) {
    const dateInput = document.getElementById("shift-date");
    const formTitle = document.getElementById("form-title");
    const dailyContainer = document.getElementById("daily-shifts-container");
    const dailyList = document.getElementById("daily-shifts-list");
    
    if (!dateInput) return;

    dateInput.value = dateString;

    const localizedDate = new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    });

    // Cherche tous les shifts existants pour cette date
    const dayShifts = allShifts.filter(s => s.date === dateString);

    if (dayShifts.length > 0) {
        dailyContainer.classList.remove("hidden");
        dailyList.innerHTML = ""; 

        dayShifts.forEach((shift, index) => {
            const li = document.createElement("li");
            li.className = "py-2 flex justify-between items-center text-xs";
            li.innerHTML = `
                <div>
                    <span class="font-bold text-gray-800">Quart #${index + 1} :</span> 
                    <span>${shift.hours_worked}h à ${shift.hourly_wage}$/h</span>
                    <span class="text-green-600 font-semibold ml-1">(+${shift.tips}$ tips)</span>
                </div>
                <button onclick="loadShiftIntoForm('${shift._id}')" class="bg-gray-200 hover:bg-blue-500 hover:text-white px-2 py-1 rounded transition text-[11px] font-medium cursor-pointer">
                    ✏️ Modifier
                </button>
            `;
            dailyList.appendChild(li);
        });

        formTitle.innerHTML = `Ajouter un autre quart pour le <span class="text-blue-600">${localizedDate}</span>`;
    } else {
        dailyContainer.classList.add("hidden");
        formTitle.innerHTML = `Ajouter un quart pour le <span class="text-blue-600">${localizedDate}</span>`;
    }

    // On reset le formulaire pour être prêt à ajouter (sans toucher à la date sélectionnée)
    resetShiftForm(false); 
    dateInput.value = dateString;
}

// 🔌 SÉLECTIONNER ET CHARGER UN SHIFT PRÉCIS DANS LE FORMULAIRE
function loadShiftIntoForm(shiftId) {
    const shift = allShifts.find(s => s._id === shiftId);
    if (!shift) return;

    currentEditingShiftId = shift._id; 

    document.getElementById("shift-date").value = shift.date;
    document.getElementById("hours").value = shift.hours_worked;
    document.getElementById("tips").value = shift.tips;
    document.getElementById("wage").value = shift.hourly_wage;

    const submitBtn = document.getElementById("btn-submit-shift");
    const deleteBtn = document.getElementById("btn-delete-shift");
    const formTitle = document.getElementById("form-title");

    const localizedDate = new Date(shift.date).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    });

    if (formTitle) formTitle.innerHTML = `Modifier un quart du <span class="text-orange-600">${localizedDate}</span>`;
    if (submitBtn) {
        submitBtn.innerText = "Mettre à jour";
        submitBtn.className = "flex-1 bg-blue-500 text-white p-2 rounded font-bold hover:bg-blue-600 transition";
    }
    if (deleteBtn) {
        deleteBtn.classList.remove("hidden");
    }

    document.getElementById("shift-form").scrollIntoView({ behavior: 'smooth' });
}

// 🗑️ SUPPRIMER LE QUART SELECTIONNÉ
async function deleteCurrentShift() {
    if (!currentEditingShiftId) return;
    
    if (!confirm("Voulez-vous vraiment supprimer ce quart de travail ?")) {
        return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/shifts/${currentEditingShiftId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            alert("Quart de travail supprimé avec succès.");
            const deletedDate = document.getElementById("shift-date").value;
            
            resetShiftForm(); 
            await fetchShifts(); 
            selectDate(deletedDate); // Recalcule la liste pour voir s'il reste d'autres shifts ce jour-là
        } else {
            alert("Impossible de supprimer ce quart.");
        }
    } catch (error) {
        console.error("Erreur suppression:", error);
    }
}

// 🧹 REINITIALISER LE FORMULAIRE EN MODE AJOUT
function resetShiftForm(clearDate = true) {
    currentEditingShiftId = null;
    document.getElementById("shift-form").reset();
    
    const submitBtn = document.getElementById("btn-submit-shift");
    const deleteBtn = document.getElementById("btn-delete-shift");
    const formTitle = document.getElementById("form-title");
    
    if (submitBtn) {
        submitBtn.innerText = "Enregistrer";
        submitBtn.className = "flex-1 bg-green-500 text-white p-2 rounded font-bold hover:bg-green-600 transition";
    }
    
    if (deleteBtn) {
        deleteBtn.classList.add("hidden");
    }
    
    if (formTitle) {
        formTitle.innerText = "Ajouter un quart";
    }
    
    if (clearDate) {
        const dateInput = document.getElementById("shift-date");
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        const dailyContainer = document.getElementById("daily-shifts-container");
        if (dailyContainer) dailyContainer.classList.add("hidden");
    }
}

// 🔄 RE-ROUTE VERS LE CALENDRIER
function updateUI(shifts) {
    allShifts = shifts; 
    renderCalendar();   
}

// 🚪 DECONNEXION
function logout() {
    localStorage.removeItem("token");
    document.getElementById("page-dashboard").classList.add("hidden");
    document.getElementById("page-auth").classList.remove("hidden");
    document.getElementById("login-email").value = "";
    document.getElementById("login-pass").value = "";
}
