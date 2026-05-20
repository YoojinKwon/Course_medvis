// For local dev with separate backend: const API = "http://localhost:8000";
// For Vercel (same origin): const API = "";
const API = "";

async function loadPatients() {
  const res = await fetch(`${API}/api/patients`);
  const data = await res.json();

  document.getElementById('count').textContent = data.count;
  const el = document.getElementById('patients');
  if (data.patients.length === 0) {
    el.innerHTML = '<p style="color:#999; padding:1rem">No patients yet. Add one above!</p>';
    return;
  }
  el.innerHTML = data.patients.map(p => `
    <div class="patient">
      <strong>${p.name}</strong> (Age: ${p.age})
      <br>Department: ${p.department}
      ${p.notes ? `<br>Notes: ${p.notes}` : ''}
      <br><small>ID: #${p.id}</small>
    </div>
  `).join('');
}

document.getElementById('form').onsubmit = async (e) => {
  e.preventDefault();
  await fetch(`${API}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: document.getElementById('name').value,
      age: parseInt(document.getElementById('age').value),
      department: document.getElementById('department').value,
      notes: document.getElementById('notes').value,
    }),
  });
  e.target.reset();
  loadPatients();
};

loadPatients();
