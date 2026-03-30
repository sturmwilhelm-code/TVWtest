const SUPABASE_URL = 'https://yqsiinzrkfzsrdlfkyoe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxc2lpbnpya2Z6c3JkbGZreW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjEwMjIsImV4cCI6MjA5MDE5NzAyMn0._w_0svCcdoqFx7f13sFKZNAHaVbdpC8Km7RxoL15A-E';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const dishSelect = document.getElementById('dishSelect');
const drinkSelect = document.getElementById('drinkSelect');
const submitBtn = document.getElementById('submitBtn');
const orderForm = document.getElementById('orderForm');
const dishDescContainer = document.getElementById('dishDescriptionContainer');
const dishDescDisplay = document.getElementById('dishDescription');
const myOrderSection = document.getElementById('myOrderSection');
const myOrderDetails = document.getElementById('myOrderDetails');
const myOrderPrice = document.getElementById('myOrderPrice');
const cancelOrderBtn = document.getElementById('cancelOrderBtn');
const dateDisplay = document.getElementById('sitzungDatumDisplay');

// Funktion zum Laden des Datums
async function loadSitzungDatum() {
    if (!dateDisplay) return;

    try {
        const { data, error } = await _supabase
            .from('config')
            .select('value')
            .eq('key', 'sitzung_datum')
            .single();

        if (error) throw error;
        if (data) {
            dateDisplay.textContent = data.value;
            dateDisplay.classList.remove('opacity-0');
            dateDisplay.classList.add('transition-opacity', 'duration-500', 'opacity-100');
        }
    } catch (err) {
        console.error("Fehler beim Laden des Datums:", err);
        dateDisplay.textContent = "Fehler";
        dateDisplay.classList.remove('opacity-0');
        dateDisplay.classList.add('transition-opacity', 'duration-500', 'opacity-100');
    }
}

// Prüfen, ob der Spieler schon etwas bestellt hat
async function checkExistingOrder() {
    const savedOrderId = localStorage.getItem('wacker_order_id');
    
    if (savedOrderId) {
        const { data, error } = await _supabase.from('bestellungen').select('*').eq('id', savedOrderId).single();
        
        if (data) {
            myOrderDetails.textContent = `${data.gericht_name || 'Kein Essen'} & ${data.getraenk || 'Kein Getränk'}`;
            myOrderSection.classList.remove('hidden');
            // Formular verstecken, damit man nicht doppelt bestellt
            orderForm.classList.add('hidden'); 
        } else {
            // Bestellung existiert in DB nicht mehr (z.B. vom Wirt gelöscht)
            localStorage.removeItem('wacker_order_id');
            myOrderSection.classList.add('hidden');
            orderForm.classList.remove('hidden');
        }
    }
}

// 1. Daten laden und Dropdowns füllen
async function loadData() {
    try {
        const { data: dishes } = await _supabase.from('speisekarte').select('*').order('name');
        
        // WICHTIG: Sicherstellen, dass das Element existiert, bevor wir innerHTML setzen
        if (dishSelect) {
            dishSelect.innerHTML = '<option value="" data-price="0" data-desc="">Nichts zu essen</option>';
            
            dishes.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.name;
                opt.textContent = `${item.name} (${item.preis || '0,00 €'})`;
                opt.dataset.price = item.preis || "0";
                opt.dataset.desc = item.beschreibung || ""; 
                dishSelect.appendChild(opt);
            });
        }

        const { data: drinks } = await _supabase.from('getraenke').select('*').order('name');
        if (drinkSelect) {
            drinkSelect.innerHTML = '<option value="" data-price="0">Nichts zu trinken</option>';
            drinks.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.name;
                opt.textContent = `${item.name} (${item.preis || '0,00 €'})`;
                opt.dataset.price = item.preis || "0";
                drinkSelect.appendChild(opt);
            });
        }

        updateButton();
    } catch (err) { 
        console.error("Fehler beim Laden:", err); 
    }
}

// 2. Preis berechnen und Beschreibung anzeigen
function updateButton() {
    const selectedDish = dishSelect.options[dishSelect.selectedIndex];
    
    // --- Logik für die Beschreibung (deine Skizze) ---
    const desc = selectedDish?.dataset.desc || "";
    if (desc && desc.trim() !== "") {
        dishDescDisplay.textContent = desc;
        dishDescContainer.classList.remove('hidden'); // Zeigt den Bereich an
    } else {
        dishDescContainer.classList.add('hidden'); // Versteckt den Bereich
    }

    // --- Preis-Berechnung ---
    const dishPriceStr = selectedDish?.dataset.price || "0";
    const drinkPriceStr = drinkSelect.options[drinkSelect.selectedIndex]?.dataset.price || "0";

    const parsePrice = (str) => {
        if (!str) return 0;
        let cleaned = str.replace(/[^0-9.,]/g, '').replace(',', '.');
        let num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    };

    const total = parsePrice(dishPriceStr) + parsePrice(drinkPriceStr);
    
    if (total > 0) {
        submitBtn.textContent = `Für ${total.toFixed(2).replace('.', ',')} € bestellen`;
        // Wir nutzen hier direkt Farben, falls classList.replace mal zickt
        submitBtn.style.backgroundColor = "#16a34a"; // Green-600
        submitBtn.disabled = false;
    } else {
        submitBtn.textContent = "Bitte wählen...";
        submitBtn.style.backgroundColor = "#1d4e89"; // Wacker-Blau
        submitBtn.disabled = true;
    }
}

// Event Listener für Änderungen
dishSelect.addEventListener('change', updateButton);
drinkSelect.addEventListener('change', updateButton);

// 3. Bestellung abschicken
orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('playerName').value;
    const dish = dishSelect.value;
    const drink = drinkSelect.value;
    const sonderwunsch = document.getElementById('specialRequest').value;

    submitBtn.disabled = true;
    submitBtn.textContent = "Wird gesendet...";

    try {
        const { data, error } = await _supabase.from('bestellungen').insert([
            { 
                spieler_name: name, 
                gericht_name: dish, 
                getraenk: drink, 
                sonderwunsch: sonderwunsch 
            }
        ]).select();

        if (error) throw error;

        // ID im Handy speichern
        localStorage.setItem('wacker_order_id', data[0].id);
        
        alert("Mahlzeit! Deine Bestellung wurde gespeichert.");
        checkExistingOrder();
    } catch (err) {
        alert("Fehler beim Senden.");
        submitBtn.disabled = false;
    }
});

// Bestellung stornieren (Löschen)
cancelOrderBtn.addEventListener('click', async () => {
    const savedOrderId = localStorage.getItem('wacker_order_id');
    if (!confirm("Möchtest du deine Bestellung wirklich löschen?")) return;

    try {
        const { error } = await _supabase.from('bestellungen').delete().eq('id', savedOrderId);
        if (error) throw error;

        localStorage.removeItem('wacker_order_id');
        alert("Bestellung wurde storniert.");
        myOrderSection.classList.add('hidden');
        orderForm.classList.remove('hidden');
        orderForm.reset();
        updateButton();
    } catch (err) {
        alert("Löschen fehlgeschlagen.");
    }
});

loadData();
checkExistingOrder();
loadSitzungDatum();