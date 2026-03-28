// 1. Konfiguration
const SUPABASE_URL = 'https://yqsiinzrkfzsrdlfkyoe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxc2lpbnpya2Z6c3JkbGZreW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjEwMjIsImV4cCI6MjA5MDE5NzAyMn0._w_0svCcdoqFx7f13sFKZNAHaVbdpC8Km7RxoL15A-E';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const GEHEIMWORT = "wackersdorf123";

// Elemente
const tableBody = document.getElementById('orderTableBody');
const loadingDiv = document.getElementById('loading');
const resetBtn = document.getElementById('resetBtn');
const menuAdminSection = document.getElementById('menuAdminSection');
const menuForm = document.getElementById('menuForm');
const currentMenuDiv = document.getElementById('currentMenu');
const drinkForm = document.getElementById('drinkForm');
const currentDrinksDiv = document.getElementById('currentDrinks');

let editMode = false;
let editId = null;
let editTable = '';

// --- FUNKTIONEN GLOBAL VERFÜGBAR MACHEN ---

// --- BEARBEITUNGS-MODUS (Eintragen, Löschen, Bearbeiten) ---
window.prepareEdit = function(id, name, preis, table, beschreibung = "") {
    editMode = true;
    editId = id;
    editTable = table;

    if (table === 'speisekarte') {
        document.getElementById('newDishName').value = name;
        document.getElementById('newDishPrice').value = preis;
        document.getElementById('newDishDesc').value = beschreibung; // Beschreibung ins Feld setzen
        const btn = menuForm.querySelector('button[type="submit"]');
        btn.textContent = "Änderung speichern";
        btn.className = "w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition shadow-md";
        menuForm.scrollIntoView({ behavior: 'smooth' });
    } else {
        // Getränke haben in deiner Datenbank keine Beschreibung, daher bleibt das hier wie gehabt
        document.getElementById('newDrinkName').value = name;
        document.getElementById('newDrinkPrice').value = preis;
        const btn = drinkForm.querySelector('button[type="submit"]');
        btn.textContent = "Änderung speichern";
        btn.className = "w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition shadow-md";
        drinkForm.scrollIntoView({ behavior: 'smooth' });
    }
};

window.deleteItem = async function(id, table) {
    if(!confirm("Eintrag wirklich löschen?")) return;
    try {
        await _supabase.from(table).delete().eq('id', id);
        if(table === 'speisekarte') loadMenuManagement();
        else loadDrinkManagement();
    } catch (err) { alert("Löschen fehlgeschlagen."); }
};

window.deleteSingleOrder = async function(id) {
    if (!confirm("Bestellung wirklich löschen?")) return;
    try {
        await _supabase.from('bestellungen').delete().eq('id', id);
        loadOrders();
    } catch (err) { alert("Löschen fehlgeschlagen."); }
};

// --- LADEN & SPEICHERN ---

async function loadMenuManagement() {
    try {
        const { data, error } = await _supabase.from('speisekarte').select('*').order('name');
        if (error) throw error;
        currentMenuDiv.innerHTML = '';
        data.forEach(dish => {
            const tag = document.createElement('div');
            tag.className = "bg-wacker-blue text-white text-xs font-bold px-3 py-2 rounded-full flex items-center gap-2 shadow-sm cursor-pointer hover:scale-105 transition";
            
            const desc = dish.beschreibung || "";
            tag.innerHTML = `
                <span onclick="window.prepareEdit('${dish.id}', '${dish.name.replace(/'/g, "\\'")}', '${(dish.preis || "").replace(/'/g, "\\'")}', 'speisekarte', '${desc.replace(/'/g, "\\'")}')">
                    ${dish.name} (${dish.preis || '—'})
                </span>
                <button onclick="window.deleteItem('${dish.id}', 'speisekarte')" class="bg-white text-wacker-blue rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-red-500 hover:text-white transition">✕</button>
            `;
            currentMenuDiv.appendChild(tag);
        });
    } catch (err) { console.error(err); }
}

async function loadDrinkManagement() {
    try {
        const { data, error } = await _supabase.from('getraenke').select('*').order('name');
        if (error) throw error;
        currentDrinksDiv.innerHTML = '';
        data.forEach(drink => {
            const tag = document.createElement('div');
            tag.className = "bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-full flex items-center gap-2 shadow-sm cursor-pointer hover:scale-105 transition";
            tag.innerHTML = `
                <span onclick="window.prepareEdit('${drink.id}', '${drink.name.replace(/'/g, "\\'")}', '${(drink.preis || "").replace(/'/g, "\\'")}', 'getraenke')">${drink.name} (${drink.preis || '—'})</span>
                <button onclick="window.deleteItem('${drink.id}', 'getraenke')" class="bg-white text-blue-500 rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-red-500 hover:text-white transition">✕</button>
            `;
            currentDrinksDiv.appendChild(tag);
        });
    } catch (err) { console.error(err); }
}

// --- SPEICHERN ESSEN ---
menuForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newDishName').value;
    const preis = document.getElementById('newDishPrice').value;
    const beschreibung = document.getElementById('newDishDesc').value; // Wert holen

    try {
        if (editMode && editTable === 'speisekarte') {
            await _supabase.from('speisekarte').update({ name, preis, beschreibung }).eq('id', editId);
        } else {
            await _supabase.from('speisekarte').insert([{ name, preis, beschreibung }]);
        }
        resetForm(menuForm, menuForm.querySelector('button'), 'bg-wacker-blue', 'Hinzufügen');
        loadMenuManagement();
    } catch (err) { alert("Fehler beim Speichern!"); }
});

// Speichern Getränke
drinkForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newDrinkName').value;
    const preis = document.getElementById('newDrinkPrice').value;
    try {
        if (editMode && editTable === 'getraenke') {
            await _supabase.from('getraenke').update({ name, preis }).eq('id', editId);
        } else {
            await _supabase.from('getraenke').insert([{ name, preis }]);
        }
        resetForm(drinkForm, drinkForm.querySelector('button'), 'bg-blue-500', 'Hinzufügen');
        loadDrinkManagement();
    } catch (err) { alert("Fehler!"); }
});

function resetForm(form, btn, oldColor, oldText) {
    form.reset();
    btn.textContent = oldText;
    btn.className = `w-full ${oldColor} text-white font-bold py-3 rounded-xl hover:opacity-90 transition shadow-md`;
    editMode = false; editId = null; editTable = '';
}

// Restliche Funktionen (loadOrders, checkAccess, resetBtn) bleiben wie vorher...
async function loadOrders() {
    loadingDiv.classList.remove('hidden');
    try {
        // 1. Alles laden: Bestellungen, Speisen und Getränke (für Preis-Abgleich)
        const { data: orders } = await _supabase.from('bestellungen').select('*').order('erstellt_am', { ascending: false });
        const { data: menu } = await _supabase.from('speisekarte').select('name, preis');
        const { data: drinks } = await _supabase.from('getraenke').select('name, preis');

        const parsePrice = (str) => {
            if (!str) return 0;
            let cleaned = str.replace(/[^0-9.,]/g, '').replace(',', '.');
            return parseFloat(cleaned) || 0;
        };

        tableBody.innerHTML = '';
        let totalSum = 0;

        orders.forEach(order => {
            // Preis für das Essen finden
            const dishData = menu.find(m => m.name === order.gericht_name);
            const dishPrice = parsePrice(dishData?.preis);

            // Preis für das Getränk finden
            const drinkData = drinks.find(d => d.name === order.getraenk);
            const drinkPrice = parsePrice(drinkData?.preis);

            const rowSum = dishPrice + drinkPrice;
            totalSum += rowSum;

            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-50 transition";
            tr.innerHTML = `
                <td class="p-4 font-bold text-gray-800">${order.spieler_name}</td>
                <td class="p-4 text-gray-700 font-medium">${order.gericht_name || '—'}</td>
                <td class="p-4 text-gray-500 italic text-sm">${order.getraenk || '—'}</td>
                <td class="p-4 font-bold text-wacker-blue">${rowSum.toFixed(2).replace('.', ',')} €</td>
                <td class="p-4 text-center no-print">
                    <button onclick="window.deleteSingleOrder('${order.id}')" class="text-red-500 hover:scale-125 transition inline-block">🗑️</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Gesamtsumme ganz unten aktualisieren
        document.getElementById('totalSumDisplay').textContent = `${totalSum.toFixed(2).replace('.', ',')} €`;

    } catch (err) { 
        console.error(err); 
    } finally { 
        loadingDiv.classList.add('hidden'); 
    }
}

function checkAccess() {
    const input = prompt("Bitte gib das Wirts-Passwort ein:");
    if (input === GEHEIMWORT) {
        menuAdminSection.classList.remove('hidden');
        loadOrders(); loadMenuManagement(); loadDrinkManagement();
    } else {
        alert("Falsches Passwort!");
        window.location.href = "index.html";
    }
}

resetBtn.addEventListener('click', async () => {
    if (confirm("Wirklich alles löschen?")) {
        await _supabase.from('bestellungen').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        loadOrders();
    }
});

checkAccess();