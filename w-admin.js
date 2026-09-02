// Konfiguration
const ADMIN_PIN = '1920'; 
const SUPABASE_URL = 'https://gqmfepcoimdpakozfpbt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbWZlcGNvaW1kcGFrb3pmcGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNjAyMzYsImV4cCI6MjEwMzkzNjIzNn0.5HuP027JcJUXpQAm1HsTG3nWIv3xY0DUoVRnvidB3TQ';

// Supabase Instanz sicher erstellen ohne Variable Namenskonflikte
let supabaseClient = null;
if (typeof window.supabase !== 'undefined' && SUPABASE_URL !== 'DEINE_SUPABASE_URL') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// PIN-Prüfung global definieren
window.checkPin = function() {
    const pinInput = document.getElementById('pinInput');
    const pinOverlay = document.getElementById('pinOverlay');
    const pinError = document.getElementById('pinError');
    const adminContent = document.getElementById('adminContent');

    if (pinInput && pinInput.value === ADMIN_PIN) {
        if (pinOverlay) pinOverlay.classList.add('hidden');
        if (adminContent) adminContent.classList.remove('hidden');
        initAdmin();
    } else if (pinError) {
        pinError.classList.remove('hidden');
        if (pinInput) pinInput.value = '';
    }
};

function initAdmin() {
    const printDate = document.getElementById('printDate');
    if (printDate) {
        printDate.textContent = 'Stand: ' + new Date().toLocaleString('de-DE');
    }
    
    const dishesTableBody = document.getElementById('dishesTableBody');
    const ordersTableBody = document.getElementById('ordersTableBody');

    if (supabaseClient) {
        loadDeadlineAdmin();
        loadDishes();
        loadOrders();
    } else {
        if (dishesTableBody) dishesTableBody.innerHTML = '<tr><td colspan="3" class="p-3 text-center text-amber-400">Supabase noch nicht konfiguriert.</td></tr>';
        if (ordersTableBody) ordersTableBody.innerHTML = '<tr><td colspan="6" class="p-3 text-center text-amber-400">Supabase noch nicht konfiguriert.</td></tr>';
    }
}

// Deadline aus Supabase laden
async function loadDeadlineAdmin() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient
            .from('settings')
            .select('value')
            .eq('key', 'deadline')
            .single();

        if (data && data.value) {
            const deadlineInput = document.getElementById('deadlineInput');
            if (deadlineInput) deadlineInput.value = data.value;
        }
    } catch (err) {
        console.error('Fehler beim Laden der Deadline:', err);
    }
}

async function loadDishes() {
    if (!supabaseClient) return;
    const dishesTableBody = document.getElementById('dishesTableBody');
    if (dishesTableBody) dishesTableBody.innerHTML = '<tr><td colspan="3" class="p-3 text-center text-slate-500">Lade Speisekarte...</td></tr>';
    
    try {
        const { data: dishes, error } = await supabaseClient
            .from('speisekarte')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        if (!dishesTableBody) return;
        dishesTableBody.innerHTML = '';

        if (!dishes || dishes.length === 0) {
            dishesTableBody.innerHTML = '<tr><td colspan="3" class="p-3 text-center text-slate-500">Keine Gerichte eingetragen.</td></tr>';
            return;
        }

        dishes.forEach(dish => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-700/30 transition border-b border-slate-700/50';
            tr.innerHTML = `
                <td class="p-3 font-semibold text-white">
                    <div>${dish.name}</div>
                    ${dish.beschreibung ? `<div class="text-xs text-slate-400 font-normal mt-0.5">${dish.beschreibung}</div>` : ''}
                </td>
                <td class="p-3">${dish.preis ? Number(dish.preis).toFixed(2).replace('.', ',') + ' €' : '-'}</td>
                <td class="p-3 text-right">
                    <button onclick="deleteDish(${dish.id})" class="text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded">
                        🗑️ Löschen
                    </button>
                </td>
            `;
            dishesTableBody.appendChild(tr);
        });
    } catch (err) {
        console.error('Fehler beim Laden der Speisen:', err);
    }
}

async function loadOrders() {
    if (!supabaseClient) return;
    const ordersTableBody = document.getElementById('ordersTableBody');
    const totalOrdersCount = document.getElementById('totalOrdersCount');
    const totalAmountEl = document.getElementById('totalAmount');

    if (ordersTableBody) ordersTableBody.innerHTML = '<tr><td colspan="6" class="p-3 text-center text-slate-500">Lade Anmeldungen...</td></tr>';

    try {
        // 1. Speisekarte laden für Preis-Mapping
        const { data: menuItems, error: menuErr } = await supabaseClient
            .from('speisekarte')
            .select('*');

        if (menuErr) console.error('Fehler beim Laden der Speisekarte:', menuErr);

        const priceMap = {};
        if (menuItems) {
            menuItems.forEach(item => {
                priceMap[item.name] = Number(item.preis) || 0;
            });
        }

        // 2. Anmeldungen laden
        const { data: orders, error } = await supabaseClient
            .from('bestellungen')
            .select('*')
            .eq('getraenk', 'Weihnachtsfeier')
            .order('created_at', { ascending: true });

        if (error) throw error;
        if (!ordersTableBody) return;
        ordersTableBody.innerHTML = '';
        if (totalOrdersCount) totalOrdersCount.textContent = orders ? orders.length : 0;

        if (!orders || orders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="6" class="p-3 text-center text-slate-500">Bisher keine Anmeldungen.</td></tr>';
            if (totalAmountEl) totalAmountEl.innerHTML = '';
            return;
        }

        let grandTotal = 0;
        let totalPersons = 0;

        orders.forEach((order, index) => {
            const parts = (order.speise || '').split(' | Begleitung: ');
            const mainDish = parts[0] || '-';
            const guestDish = parts[1] || null;

            const mainPrice = priceMap[mainDish] || 0;
            const guestPrice = guestDish ? (priceMap[guestDish] || 0) : 0;
            const rowTotal = mainPrice + guestPrice;

            grandTotal += rowTotal;
            totalPersons += guestDish ? 2 : 1;

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-700/30 transition border-b border-slate-700/50';
            tr.innerHTML = `
                <td class="p-3 text-slate-400 text-sm">${index + 1}</td>
                <td class="p-3 font-semibold text-white">${order.name}</td>
                <td class="p-3 text-slate-200">
                    <div>${mainDish} ${mainPrice > 0 ? `<span class="text-xs text-slate-400">(${mainPrice.toFixed(2).replace('.', ',')} €)</span>` : ''}</div>
                    ${guestDish ? `<div class="text-xs text-indigo-300 mt-1">➕ Begleitung: ${guestDish} ${guestPrice > 0 ? `<span class="text-xs text-indigo-400">(${guestPrice.toFixed(2).replace('.', ',')} €)</span>` : ''}</div>` : ''}
                </td>
                <td class="p-3 text-slate-400 text-xs italic">${order.anmerkung || '-'}</td>
                <td class="p-3 font-bold text-emerald-400 text-right">${rowTotal > 0 ? rowTotal.toFixed(2).replace('.', ',') + ' €' : '- €'}</td>
                <td class="p-3 text-right no-print">
                    <button onclick="deleteOrder(${order.id})" class="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1 border border-red-500/30 rounded">
                        Löschen
                    </button>
                </td>
            `;
            ordersTableBody.appendChild(tr);
        });

        // Gesamtsumme anzeigen
        if (totalAmountEl) {
            totalAmountEl.innerHTML = `
                <div class="flex justify-between items-center bg-slate-900/80 p-4 rounded-xl border border-slate-700 mt-4">
                    <span class="text-slate-300 font-medium">Anmeldungen: <strong>${orders.length}</strong> (${totalPersons} Personen)</span>
                    <span class="text-lg font-bold text-emerald-400">Gesamtsumme: ${grandTotal.toFixed(2).replace('.', ',')} €</span>
                </div>
            `;
        }

    } catch (err) {
        console.error('Fehler beim Laden der Anmeldungen:', err);
    }
}

window.deleteDish = async function(id) {
    if (!supabaseClient) return;
    if (!confirm('Gericht aus der Speisekarte entfernen?')) return;
    try {
        const { error } = await supabaseClient.from('speisekarte').delete().eq('id', id);
        if (error) throw error;
        loadDishes();
    } catch (err) {
        alert('Fehler beim Löschen.');
    }
};

window.deleteOrder = async function(id) {
    if (!supabaseClient) return;
    if (!confirm('Soll diese Anmeldung wirklich manuell gelöscht werden?')) return;
    try {
        const { error } = await supabaseClient.from('bestellungen').delete().eq('id', id);
        if (error) throw error;
        loadOrders();
    } catch (err) {
        alert('Fehler beim Löschen der Anmeldung.');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const addDishForm = document.getElementById('addDishForm');
    const refreshOrdersBtn = document.getElementById('refreshOrdersBtn');
    const saveDeadlineBtn = document.getElementById('saveDeadlineBtn');

    // Deadline speichern
    if (saveDeadlineBtn) {
        saveDeadlineBtn.addEventListener('click', async () => {
            if (!supabaseClient) {
                alert('Supabase ist noch nicht verbunden!');
                return;
            }

            const val = document.getElementById('deadlineInput').value;
            if (!val) {
                alert('Bitte wähle ein gültiges Datum und eine Uhrzeit aus.');
                return;
            }

            try {
                const { error } = await supabaseClient
                    .from('settings')
                    .upsert({ key: 'deadline', value: val });

                if (error) throw error;

                const status = document.getElementById('deadlineStatus');
                if (status) {
                    status.textContent = '✅ Deadline erfolgreich gespeichert!';
                    status.className = 'text-xs text-emerald-400 mt-1';
                    status.classList.remove('hidden');
                    setTimeout(() => status.classList.add('hidden'), 3000);
                }
            } catch (err) {
                console.error('Fehler beim Speichern der Deadline:', err);
                alert('Fehler beim Speichern der Deadline.');
            }
        });
    }

    if (addDishForm) {
        addDishForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!supabaseClient) {
                alert('Supabase ist noch nicht verbunden!');
                return;
            }

            const name = document.getElementById('newDishName').value.trim();
            const priceVal = document.getElementById('newDishPrice').value;
            const descInput = document.getElementById('newDishDesc');
            
            const preis = priceVal ? parseFloat(priceVal) : null;
            const beschreibung = descInput ? descInput.value.trim() : null;

            if (!name) return;

            try {
                const { error } = await supabaseClient.from('speisekarte').insert([{ name, preis, beschreibung }]);
                if (error) throw error;
                addDishForm.reset();
                loadDishes();
            } catch (err) {
                alert('Fehler beim Hinzufügen des Gerichts.');
            }
        });
    }

    if (refreshOrdersBtn) {
        refreshOrdersBtn.addEventListener('click', loadOrders);
    }
});