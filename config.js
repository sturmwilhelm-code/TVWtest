// Kopiere deine Supabase Zugangsdaten hier rein
const SUPABASE_URL = 'https://yqsiinzrkfzsrdlfkyoe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxc2lpbnpya2Z6c3JkbGZreW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjEwMjIsImV4cCI6MjA5MDE5NzAyMn0._w_0svCcdoqFx7f13sFKZNAHaVbdpC8Km7RxoL15A-E';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const dateInput = document.getElementById('dateInput');
const saveDateBtn = document.getElementById('saveDateBtn');
const statusMessage = document.getElementById('statusMessage');

// Passwort-Schutz (einfach gehalten, wie besprochen)
function checkAuth() {
    const promptPass = prompt("Bitte Admin-Passwort eingeben:");
    if (promptPass !== "wackersdorf123") { 
        alert("Falsches Passwort!");
        window.location.href = "index.html";
    }
}

// Nachricht anzeigen
function showStatus(text, type) {
    statusMessage.textContent = text;
    statusMessage.classList.remove('hidden', 'text-green-600', 'text-red-600');
    statusMessage.classList.add(type === 'error' ? 'text-red-600' : 'text-green-600');
    
    // Nach 3 Sekunden ausblenden
    setTimeout(() => statusMessage.classList.add('hidden'), 3000);
}

// 1. Das aktuelle Datum laden
async function loadConfig() {
    saveDateBtn.disabled = true;
    try {
        const { data, error } = await _supabase
            .from('config')
            .select('value')
            .eq('key', 'sitzung_datum')
            .single();

        if (error) throw error;
        if (data) {
            dateInput.value = data.value;
        }
    } catch (err) {
        showStatus("Fehler beim Laden des Datums.", "error");
        console.error(err);
    } finally {
        saveDateBtn.disabled = false;
    }
}

// 2. Das neue Datum speichern
saveDateBtn.addEventListener('click', async () => {
    const newDate = dateInput.value;
    if (!newDate) return;

    saveDateBtn.disabled = true;
    saveDateBtn.textContent = "Speichert...";

    try {
        const { error } = await _supabase
            .from('config')
            .update({ value: newDate })
            .eq('key', 'sitzung_datum');

        if (error) throw error;
        showStatus("Datum erfolgreich aktualisiert!", "success");
    } catch (err) {
        showStatus("Fehler beim Speichern.", "error");
        console.error(err);
    } finally {
        saveDateBtn.disabled = false;
        saveDateBtn.textContent = "Speichern";
    }
});

// Start
checkAuth();
loadConfig();