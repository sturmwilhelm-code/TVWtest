// Konfiguration
const SUPABASE_URL = 'https://gqmfepcoimdpakozfpbt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbWZlcGNvaW1kcGFrb3pmcGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNjAyMzYsImV4cCI6MjEwMzkzNjIzNn0.5HuP027JcJUXpQAm1HsTG3nWIv3xY0DUoVRnvidB3TQ';

// Supabase Client sicher initialisieren
let supabaseClient = null;
try {
    if (typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.error("Supabase Init Error:", e);
}

// Globales Objekt für Speisen-Beschreibungen
const dishDescriptions = {};

// DOM Elemente
const wfOrderForm = document.getElementById('wfOrderForm');
const submitBtn = document.getElementById('submitBtn');
const statusDiv = document.getElementById('status');
const myOrderSection = document.getElementById('myOrderSection');
const myOrderDetails = document.getElementById('myOrderDetails');
const myGuestDetails = document.getElementById('myGuestDetails');
const cancelOrderBtn = document.getElementById('cancelOrderBtn');
const dishSelect = document.getElementById('dishSelect');
const guestDishSelect = document.getElementById('guestDishSelect');

// Beim Laden der Seite Deadline prüfen, Speisen laden & bestehende Bestellung prüfen
document.addEventListener('DOMContentLoaded', async () => {
    const isExpired = await checkDeadline();
    if (!isExpired) {
        await loadDishesFromSupabase();
        setupDescriptionListeners();
    }
    await checkExistingRegistration();
});

// Deadline aus Supabase prüfen
async function checkDeadline() {
    if (!supabaseClient) return false;

    try {
        const { data, error } = await supabaseClient
            .from('settings')
            .select('value')
            .eq('key', 'deadline')
            .single();

        if (error || !data || !data.value) return false;

        const deadlineDate = new Date(data.value);
        const now = new Date();

        if (now > deadlineDate) {
            if (wfOrderForm) {
                wfOrderForm.innerHTML = `
                    <div class="bg-amber-100 border border-amber-300 p-6 rounded-2xl text-center space-y-3">
                        <div class="text-3xl">⏳</div>
                        <h3 class="text-xl font-bold text-amber-900">Anmeldeschluss erreicht</h3>
                        <p class="text-base text-slate-800 leading-relaxed font-medium">
                            Keine Bestellung mehr möglich!<br>
                            Kurzfristige Bestellungen bitte direkt bei <strong>Willi</strong> melden.
                        </p>
                    </div>
                `;
            }
            return true; // Deadline ist abgelaufen
        }
    } catch (err) {
        console.error('Fehler bei Deadline-Prüfung:', err);
    }
    return false;
}

// Speisen dynamisch aus Supabase laden
async function loadDishesFromSupabase() {
    if (!supabaseClient) return;
    try {
        const { data: dishes, error } = await supabaseClient
            .from('speisekarte')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        // Dropdowns zurücksetzen
        if (dishSelect) dishSelect.innerHTML = '<option value="">Bitte wählen...</option>';
        if (guestDishSelect) guestDishSelect.innerHTML = '<option value="">Bitte wählen...</option>';

        if (dishes && dishes.length > 0) {
            dishes.forEach(dish => {
                // Beschreibung im Objekt speichern
                dishDescriptions[dish.name] = dish.beschreibung || '';

                const opt1 = document.createElement('option');
                opt1.value = dish.name;
                opt1.textContent = dish.name;
                if (dishSelect) dishSelect.appendChild(opt1);

                const opt2 = document.createElement('option');
                opt2.value = dish.name;
                opt2.textContent = dish.name;
                if (guestDishSelect) guestDishSelect.appendChild(opt2);
            });
        } else {
            if (dishSelect) dishSelect.innerHTML = '<option value="">Keine Gerichte verfügbar</option>';
            if (guestDishSelect) guestDishSelect.innerHTML = '<option value="">Keine Gerichte verfügbar</option>';
        }

    } catch (err) {
        console.error('Fehler beim Laden der Speisekarte:', err);
        if (dishSelect) dishSelect.innerHTML = '<option value="">Fehler beim Laden der Gerichte</option>';
    }
}

// Event-Listener für Beschreibungsanzeige unter den Dropdowns
function setupDescriptionListeners() {
    if (dishSelect) {
        dishSelect.addEventListener('change', (e) => {
            updateDishDescription(e.target.value, 'dishDescription');
        });
    }

    if (guestDishSelect) {
        guestDishSelect.addEventListener('change', (e) => {
            updateDishDescription(e.target.value, 'guestDishDescription');
        });
    }
}

// Hilfsfunktion: Infobox ein-/ausblenden oder erstellen
function updateDishDescription(selectedName, elementId) {
    let descEl = document.getElementById(elementId);
    const text = dishDescriptions[selectedName] || '';

    if (text) {
        if (!descEl) {
            const targetSelect = elementId === 'dishDescription' ? dishSelect : guestDishSelect;
            if (targetSelect) {
                descEl = document.createElement('p');
                descEl.id = elementId;
                // Angepasstes Styling für optimale Lesbarkeit auf hellem Hintergrund
                descEl.className = 'text-sm text-slate-800 mt-2 bg-slate-100 border border-slate-300 p-3 rounded-xl italic font-medium shadow-sm';
                targetSelect.parentNode.insertBefore(descEl, targetSelect.nextSibling);
            }
        }
        if (descEl) {
            descEl.textContent = `ℹ️ ${text}`;
            descEl.classList.remove('hidden');
        }
    } else if (descEl) {
        descEl.classList.add('hidden');
    }
}

// Bestehende Anmeldung prüfen
async function checkExistingRegistration() {
    if (!supabaseClient) return;
    const savedOrderId = localStorage.getItem('tvw_weihnachten_order_id');
    if (!savedOrderId) return;

    try {
        const { data: order, error } = await supabaseClient
            .from('bestellungen')
            .select('*')
            .eq('id', savedOrderId)
            .single();

        if (error || !order) {
            localStorage.removeItem('tvw_weihnachten_order_id');
            if (wfOrderForm) wfOrderForm.classList.remove('hidden');
            return;
        }

        // Aktive Bestellung gefunden: Formular ausblenden & Übersicht anzeigen
        if (wfOrderForm) wfOrderForm.classList.add('hidden');
        displayMyOrder(order);
    } catch (e) {
        console.error('Fehler beim Laden der bestehenden Bestellung:', e);
    }
}

// Formular-Submission verarbeiten
if (wfOrderForm) {
    wfOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!supabaseClient) {
            showStatus('Datenbankverbindung nicht verfügbar.', 'bg-red-100 text-red-900 border border-red-300 font-medium');
            return;
        }

        const playerName = document.getElementById('playerName').value.trim();
        const guestRadio = document.querySelector('input[name="hasGuest"]:checked');
        const hasGuest = guestRadio ? guestRadio.value === 'yes' : false;
        const selectedDish = dishSelect ? dishSelect.value : '';
        const selectedGuestDish = guestDishSelect ? guestDishSelect.value : '';
        const specialRequestInput = document.getElementById('specialRequest');
        const specialRequest = specialRequestInput ? specialRequestInput.value.trim() : '';

        if (!playerName || !selectedDish) {
            showStatus('Bitte fülle alle Pflichtfelder aus.', 'bg-red-100 text-red-900 border border-red-300 font-medium');
            return;
        }

        if (hasGuest && !selectedGuestDish) {
            showStatus('Bitte wähle auch ein Gericht für deine Begleitung aus.', 'bg-red-100 text-red-900 border border-red-300 font-medium');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Wird abgesendet...';
        }

        let speiseText = selectedDish;
        let nameText = playerName;

        if (hasGuest) {
            nameText += ' (+1 Begleitung)';
            speiseText += ` | Begleitung: ${selectedGuestDish}`;
        }

        try {
            const { data, error } = await supabaseClient
                .from('bestellungen')
                .insert([{
                    name: nameText,
                    speise: speiseText,
                    getraenk: 'Weihnachtsfeier',
                    anmerkung: specialRequest,
                    gesamtpreis: 0
                }])
                .select()
                .single();

            if (error) throw error;

            localStorage.setItem('tvw_weihnachten_order_id', data.id);

            showStatus('Anmeldung erfolgreich abgesendet! 🎄', 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-medium');
            wfOrderForm.reset();
            if (typeof toggleGuestOption === 'function') toggleGuestOption(false);
            
            // Beschreibungsfelder ausblenden nach Reset
            updateDishDescription('', 'dishDescription');
            updateDishDescription('', 'guestDishDescription');

            // Formular ausblenden & Bestellung anzeigen
            wfOrderForm.classList.add('hidden');
            displayMyOrder(data);

        } catch (error) {
            console.error('Fehler beim Speichern:', error);
            showStatus('Fehler beim Absenden. Bitte versuche es erneut.', 'bg-red-100 text-red-900 border border-red-300 font-medium');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Anmeldung abschicken';
            }
        }
    });
}

// Stornierung
if (cancelOrderBtn) {
    cancelOrderBtn.addEventListener('click', async () => {
        if (!supabaseClient) return;
        const savedOrderId = localStorage.getItem('tvw_weihnachten_order_id');
        if (!savedOrderId) return;

        if (!confirm('Möchtest du deine Anmeldung zur Weihnachtsfeier wirklich stornieren?')) {
            return;
        }

        try {
            const { error } = await supabaseClient
                .from('bestellungen')
                .delete()
                .eq('id', savedOrderId);

            if (error) throw error;

            localStorage.removeItem('tvw_weihnachten_order_id');
            if (myOrderSection) myOrderSection.classList.add('hidden');
            
            // Formular nach Stornierung wieder freischalten
            if (wfOrderForm) wfOrderForm.classList.remove('hidden');

            showStatus('Deine Anmeldung wurde erfolgreich storniert.', 'bg-amber-100 text-amber-900 border border-amber-300 font-medium');

        } catch (error) {
            console.error('Fehler beim Stornieren:', error);
            alert('Fehler beim Stornieren der Anmeldung.');
        }
    });
}

function displayMyOrder(order) {
    if (!myOrderSection) return;
    myOrderSection.classList.remove('hidden');
    const parts = order.speise.split(' | Begleitung: ');
    if (myOrderDetails) myOrderDetails.innerHTML = `<strong>${order.name}:</strong> ${parts[0]}`;
    
    if (parts[1] && myGuestDetails) {
        myGuestDetails.innerHTML = `<strong>Begleitung:</strong> ${parts[1]}`;
        myGuestDetails.classList.remove('hidden');
    } else if (myGuestDetails) {
        myGuestDetails.classList.add('hidden');
    }
}

function showStatus(text, cssClasses) {
    if (!statusDiv) return;
    statusDiv.textContent = text;
    statusDiv.className = `mt-6 text-center text-base p-4 rounded-xl ${cssClasses}`;
    statusDiv.classList.remove('hidden');

    setTimeout(() => {
        statusDiv.classList.add('hidden');
    }, 5000);
}
