const API = "/api";
const els = {
  total: document.getElementById("totalStat"),
  high: document.getElementById("highStat"),
  duplicates: document.getElementById("duplicateStat"),
  industries: document.getElementById("industryStat"),
  body: document.getElementById("leadsBody"),
  results: document.getElementById("resultsLabel"),
  search: document.getElementById("searchInput"),
  industry: document.getElementById("industryFilter"),
  location: document.getElementById("locationFilter"),
  tier: document.getElementById("tierFilter"),
  modal: document.getElementById("modalBackdrop"),
  form: document.getElementById("addForm"),
  toast: document.getElementById("toast"),
};
let allLeads = [];
let toastTimer;

function escapeHTML(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch],
  );
}
function domainLabel(url) {
  try {
    return new URL(
      url.startsWith("http") ? url : `https://${url}`,
    ).hostname.replace(/^www\./, "");
  } catch {
    return url || "Website not provided";
  }
}
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2600);
}
function filters() {
  return {
    search: els.search.value.trim(),
    industry: els.industry.value,
    location: els.location.value.trim(),
    tier: els.tier.value,
  };
}
function queryString(values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  return params.toString();
}
async function api(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
async function loadSummary() {
  const data = await api(`${API}/summary`);
  els.total.textContent = data.total;
  els.high.textContent = data.high_priority;
  els.duplicates.textContent = data.duplicates;
  els.industries.textContent = data.industries;
}
async function loadLeads() {
  els.body.innerHTML =
    '<tr><td colspan="6" class="empty">Loading leads…</td></tr>';
  try {
    const data = await api(`${API}/leads?${queryString(filters())}`);
    allLeads = data.leads;
    renderLeads(allLeads);
  } catch (error) {
    els.body.innerHTML = `<tr><td colspan="6" class="empty">${escapeHTML(error.message)}. Is the Flask server running?</td></tr>`;
    els.results.textContent = "Unable to load leads";
  }
}
async function populateIndustries() {
  const current = els.industry.value;
  const data = await api(`${API}/industries`);
  const industries = data.industries || [];
  const options = [
    '<option value="">All industries</option>',
    ...industries.map(
      (x) => `<option value="${escapeHTML(x)}">${escapeHTML(x)}</option>`,
    ),
  ];
  els.industry.innerHTML = options.join("");
  if (industries.includes(current)) els.industry.value = current;
}
function renderLeads(leads) {
  els.results.textContent = `${leads.length} lead${leads.length === 1 ? "" : "s"} found`;
  if (!leads.length) {
    els.body.innerHTML =
      '<tr><td colspan="7" class="empty">No leads match these filters. Try changing your search.</td></tr>';
    return;
  }
  els.body.innerHTML = leads
    .map((lead) => {
      const initials = (lead.company || "?")
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => s[0] || "")
        .join("")
        .toUpperCase();
      const duplicate = lead.duplicate;
      const dataQuality = [
        lead.website,
        lead.industry,
        lead.location,
        lead.employees > 0 ? lead.employees : null,
      ].filter(Boolean).length;
      const scoreWidth = Math.min(100, lead.score);
      return `<tr>
      <td><div class="company-cell"><div class="company-avatar">${escapeHTML(initials)}</div><div><div class="company-name">${escapeHTML(lead.company)}</div><div class="company-domain">${escapeHTML(domainLabel(lead.website))}</div></div></div></td>
      <td><div>${escapeHTML(lead.industry || "Unspecified")}</div><div class="secondary-text">${escapeHTML(lead.location || "Location missing")}</div></td>
      <td>${lead.employees ? Number(lead.employees).toLocaleString() : "—"}<div class="secondary-text">${lead.revenue_k ? `$${Number(lead.revenue_k).toLocaleString()}k est. revenue` : "No revenue estimate"}</div></td>
      <td><div class="score-wrap"><div class="score-track"><div class="score-fill" style="width:${scoreWidth}%"></div></div><span class="score-num">${lead.score}</span></div></td>
      <td><span class="tier tier-${escapeHTML(lead.tier)}">${lead.tier === "A" ? "A · High" : lead.tier === "B" ? "B · Medium" : "C · Explore"}</span></td>
      <td><span class="${duplicate ? "duplicate" : "clean"}">${duplicate ? "⚠ Duplicate" : "✓ Unique"}</span><div class="secondary-text">${dataQuality}/4 key fields present</div></td>
      <td>
       <button class="button button-secondary"
         data-edit-id="${lead.id}"
         type="button">Edit</button>
        <button class="button button-secondary"
         data-delete-id="${lead.id}"
         type="button">Delete</button>
      </td>
    </tr>`;
    })
    .join("");
}

els.body.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-id]");
  if (!button) return;

  const id = button.dataset.deleteId;

  if (!confirm("Are you sure you want to delete this lead?")) {
    return;
  }

  try {
    await api(`${API}/leads/${id}`, {
      method: "DELETE",
    });

    await Promise.all([loadSummary(), populateIndustries(), loadLeads()]);

    showToast("Lead deleted successfully.");
  } catch (error) {
    showToast("Delete failed: " + error.message);
  }
});

els.body.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-edit-id]");
  if (!button) return;

  const id = button.dataset.editId;

  try {
    const response = await api(`${API}/leads`);
    const lead = response.leads.find((item) => String(item.id) === String(id));

    if (!lead) {
      showToast("Lead not found.");
      return;
    }

    const company = prompt("Company name:", lead.company);
    if (company === null) return;

    const website = prompt("Website:", lead.website || "");
    if (website === null) return;

    const industry = prompt("Industry:", lead.industry || "");
    if (industry === null) return;

    const location = prompt("Location:", lead.location || "");
    if (location === null) return;

    const employees = prompt("Number of employees:", lead.employees || 0);
    if (employees === null) return;

    const revenue = prompt(
      "Estimated revenue in thousands ($k):",
      lead.revenue_k || 0,
    );
    if (revenue === null) return;

    await api(`${API}/leads/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        company,
        website,
        industry,
        location,
        employees: Number(employees),
        revenue_k: Number(revenue),
      }),
    });

    await Promise.all([loadSummary(), populateIndustries(), loadLeads()]);

    showToast("Lead updated successfully.");
  } catch (error) {
    showToast("Update failed: " + error.message);
  }
});

let debounceTimer;
function scheduleLoad() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadLeads, 180);
}
[els.search, els.industry, els.location, els.tier].forEach((el) => {
  el.addEventListener(
    el === els.search || el === els.location ? "input" : "change",
    scheduleLoad,
  );
});
document.getElementById("resetBtn").addEventListener("click", () => {
  els.search.value = "";
  els.industry.value = "";
  els.location.value = "";
  els.tier.value = "";
  loadLeads();
});
document.getElementById("exportBtn").addEventListener("click", () => {
  const qs = queryString(filters());
  window.location.href = `${API}/export.csv${qs ? `?${qs}` : ""}`;
  showToast("Preparing CSV export…");
});
function openModal() {
  els.modal.classList.remove("hidden");
  document.querySelector('[name="company"]').focus();
}
function closeModal() {
  els.modal.classList.add("hidden");
}
document.getElementById("openAdd").addEventListener("click", openModal);
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelAdd").addEventListener("click", closeModal);
els.modal.addEventListener("click", (event) => {
  if (event.target === els.modal) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});
els.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(els.form);
  const payload = Object.fromEntries(formData.entries());
  payload.revenue_k = Number(payload.revenue_k || 0);
  payload.employees = Number(payload.employees || 0);
  try {
    await api(`${API}/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    els.form.reset();
    closeModal();
    await Promise.all([loadSummary(), populateIndustries(), loadLeads()]);
    showToast("Lead saved successfully.");
  } catch (error) {
    showToast(error.message);
  }
});
(async function init() {
  try {
    await api(`${API}/health`);
    await Promise.all([loadSummary(), populateIndustries(), loadLeads()]);
  } catch (error) {
    els.body.innerHTML =
      '<tr><td colspan="6" class="empty">Could not connect to backend. Follow the README setup steps.</td></tr>';
    showToast("Backend is not running.");
  }
})();
