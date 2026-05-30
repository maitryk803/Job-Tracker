/* ============================================================
   JobTrackr — Vanilla JavaScript
   Handles: state, CRUD, search/filter, dashboard stats,
   theme toggle, and localStorage persistence.
   ============================================================ */

// ---- LocalStorage keys ----
const STORAGE_KEY = "jobtrackr_applications";
const THEME_KEY = "jobtrackr_theme";

// ---- Sample data (used on first visit) ----
const SAMPLE_DATA = [
  { id: 1, company: "Google",    role: "Frontend Engineer Intern",  location: "Bangalore, IN", salary: "₹80k/mo",   date: "2025-05-10", status: "Interview",  notes: "Phone screen scheduled with recruiter." },
  { id: 2, company: "Microsoft", role: "SWE Intern",                 location: "Hyderabad, IN", salary: "₹85k/mo",   date: "2025-05-12", status: "Assessment", notes: "Online assessment due May 20." },
  { id: 3, company: "Amazon",    role: "SDE Intern",                 location: "Remote",        salary: "₹90k/mo",   date: "2025-04-28", status: "Rejected",   notes: "Got the rejection email after OA." },
  { id: 4, company: "Adobe",     role: "Product Intern",             location: "Noida, IN",     salary: "₹70k/mo",   date: "2025-05-15", status: "Applied",    notes: "Applied via campus portal." },
  { id: 5, company: "Accenture", role: "Associate Software Engineer",location: "Pune, IN",      salary: "₹4.5 LPA",  date: "2025-05-05", status: "Offer",      notes: "Offer letter received! Decision by June 1." },
  { id: 6, company: "Deloitte",  role: "Analyst",                    location: "Mumbai, IN",    salary: "₹5 LPA",    date: "2025-05-18", status: "Applied",    notes: "Referral from college senior." },
  { id: 7, company: "TCS",       role: "Digital Trainee",            location: "Chennai, IN",   salary: "₹3.5 LPA",  date: "2025-04-22", status: "Interview",  notes: "Technical round next week." },
  { id: 8, company: "Infosys",   role: "Systems Engineer",           location: "Bangalore, IN", salary: "₹3.6 LPA",  date: "2025-04-30", status: "Assessment", notes: "InfyTQ assessment pending." },
  { id: 9, company: "Wipro",     role: "Project Engineer",           location: "Pune, IN",      salary: "₹3.5 LPA",  date: "2025-05-02", status: "Rejected",   notes: "Did not clear written test." },
];

// ---- State ----
let applications = loadApplications();
let editingId = null;

// ============================================================
// PERSISTENCE
// ============================================================
function loadApplications() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    // First visit — seed sample data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_DATA));
    return [...SAMPLE_DATA];
  }
  try { return JSON.parse(raw); } catch { return []; }
}

function saveApplications() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
}

// ============================================================
// NAVIGATION (Dashboard / Applications tabs)
// ============================================================
document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const target = link.dataset.target;
    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    link.classList.add("active");
    document.getElementById(target).classList.add("active");
  });
});

// ============================================================
// THEME TOGGLE (light / dark)
// ============================================================
const themeBtn = document.getElementById("themeToggle");

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  localStorage.setItem(THEME_KEY, theme);
}

applyTheme(localStorage.getItem(THEME_KEY) || "light");

themeBtn.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

// ============================================================
// DASHBOARD STATS
// ============================================================
function renderDashboard() {
  const total = applications.length;
  const interviews = applications.filter(a => a.status === "Interview").length;
  const offers = applications.filter(a => a.status === "Offer").length;
  const rejected = applications.filter(a => a.status === "Rejected").length;
  const rate = total ? Math.round((offers / total) * 100) : 0;

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statInterviews").textContent = interviews;
  document.getElementById("statOffers").textContent = offers;
  document.getElementById("statRejected").textContent = rejected;
  document.getElementById("successRate").textContent = rate;
  document.getElementById("progressBar").style.width = rate + "%";

  // Recent activity — last 5 applications by date
  const recent = [...applications]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const list = document.getElementById("recentList");
  list.innerHTML = recent.length
    ? recent.map(a => `
        <li>
          <span><strong>${escapeHtml(a.company)}</strong> — ${escapeHtml(a.role)}</span>
          <span class="time">${formatDate(a.date)} · <span class="badge badge-${a.status}">${a.status}</span></span>
        </li>`).join("")
    : `<li class="muted">No activity yet.</li>`;
}

// ============================================================
// APPLICATIONS TABLE (with search, filter, sort)
// ============================================================
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const sortOrder = document.getElementById("sortOrder");

[searchInput, statusFilter, sortOrder].forEach(el =>
  el.addEventListener("input", renderTable)
);

function renderTable() {
  const q = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  const order = sortOrder.value;

  let list = applications.filter(a => {
    const matchQ = !q || a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q);
    const matchS = status === "all" || a.status === status;
    return matchQ && matchS;
  });

  list.sort((a, b) => order === "newest"
    ? new Date(b.date) - new Date(a.date)
    : new Date(a.date) - new Date(b.date));

  const tbody = document.getElementById("appTableBody");
  const empty = document.getElementById("emptyState");

  if (!list.length) {
    tbody.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  tbody.innerHTML = list.map(a => `
    <tr>
      <td class="company-cell">${escapeHtml(a.company)}</td>
      <td>${escapeHtml(a.role)}</td>
      <td>${escapeHtml(a.location || "—")}</td>
      <td>${escapeHtml(a.salary || "—")}</td>
      <td>${formatDate(a.date)}</td>
      <td><span class="badge badge-${a.status}">${a.status}</span></td>
      <td>
        <div class="row-actions">
          <button onclick="viewApp(${a.id})">View</button>
          <button onclick="editApp(${a.id})">Edit</button>
          <button class="danger" onclick="deleteApp(${a.id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

// ============================================================
// CRUD: Add / Edit / Delete / View
// ============================================================
const modal = document.getElementById("modal");
const form = document.getElementById("appForm");

document.getElementById("addBtn").addEventListener("click", () => openForm());
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelBtn").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

function openForm(app = null) {
  editingId = app ? app.id : null;
  document.getElementById("modalTitle").textContent = app ? "Edit Application" : "Add Application";
  document.getElementById("appId").value = app ? app.id : "";
  document.getElementById("company").value  = app ? app.company  : "";
  document.getElementById("role").value     = app ? app.role     : "";
  document.getElementById("location").value = app ? app.location : "";
  document.getElementById("salary").value   = app ? app.salary   : "";
  document.getElementById("date").value     = app ? app.date     : new Date().toISOString().slice(0,10);
  document.getElementById("status").value   = app ? app.status   : "Applied";
  document.getElementById("notes").value    = app ? app.notes    : "";
  modal.hidden = false;
}

function closeModal() {
  modal.hidden = true;
  editingId = null;
  form.reset();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = {
    company:  document.getElementById("company").value.trim(),
    role:     document.getElementById("role").value.trim(),
    location: document.getElementById("location").value.trim(),
    salary:   document.getElementById("salary").value.trim(),
    date:     document.getElementById("date").value,
    status:   document.getElementById("status").value,
    notes:    document.getElementById("notes").value.trim(),
  };

  if (editingId) {
    // Update existing
    applications = applications.map(a => a.id === editingId ? { ...a, ...data } : a);
    showToast("Application updated");
  } else {
    // Create new
    const id = applications.length ? Math.max(...applications.map(a => a.id)) + 1 : 1;
    applications.push({ id, ...data });
    showToast("Application added");
  }

  saveApplications();
  renderAll();
  closeModal();
});

// Expose to inline onclick handlers
window.editApp = function(id) {
  const app = applications.find(a => a.id === id);
  if (app) openForm(app);
};

window.deleteApp = function(id) {
  if (!confirm("Delete this application? This cannot be undone.")) return;
  applications = applications.filter(a => a.id !== id);
  saveApplications();
  renderAll();
  showToast("Application deleted");
};

window.viewApp = function(id) {
  const a = applications.find(x => x.id === id);
  if (!a) return;
  document.getElementById("detailsBody").innerHTML = `
    <p><strong>Company:</strong> ${escapeHtml(a.company)}</p>
    <p><strong>Role:</strong> ${escapeHtml(a.role)}</p>
    <p><strong>Location:</strong> ${escapeHtml(a.location || "—")}</p>
    <p><strong>Salary:</strong> ${escapeHtml(a.salary || "—")}</p>
    <p><strong>Applied on:</strong> ${formatDate(a.date)}</p>
    <p><strong>Status:</strong> <span class="badge badge-${a.status}">${a.status}</span></p>
    <p><strong>Notes:</strong><br>${escapeHtml(a.notes || "No notes added.")}</p>
  `;
  document.getElementById("detailsModal").hidden = false;
};

document.getElementById("closeDetails").addEventListener("click", () => {
  document.getElementById("detailsModal").hidden = true;
});
document.getElementById("detailsModal").addEventListener("click", (e) => {
  if (e.target.id === "detailsModal") e.target.hidden = true;
});

// ============================================================
// HELPERS
// ============================================================
function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.hidden = true; }, 2200);
}

function renderAll() {
  renderDashboard();
  renderTable();
}

// ---- Initial render ----
renderAll();