const vendors = [
  { id: "zepto", name: "Zepto", color: "#6b3fd6" },
  { id: "blinkit", name: "Blinkit", color: "#f0b800" },
  { id: "toing", name: "Toing", color: "#df654c" },
  { id: "jiomart", name: "JioMart", color: "#1976d2" },
  { id: "amazonNow", name: "Amazon Now", color: "#1f9a9a" }
];

const sampleState = {
  location: "Bengaluru - Indiranagar",
  items: [
    {
      id: "milk",
      name: "Amul Taaza Milk",
      quantity: 2,
      unit: "L",
      category: "Dairy",
      prices: { zepto: 136, blinkit: 138, toing: 134, jiomart: 132, amazonNow: 140 },
      available: { zepto: true, blinkit: true, toing: true, jiomart: true, amazonNow: true }
    },
    {
      id: "eggs",
      name: "Eggs",
      quantity: 12,
      unit: "pcs",
      category: "Fresh",
      prices: { zepto: 92, blinkit: 96, toing: 90, jiomart: 99, amazonNow: 94 },
      available: { zepto: true, blinkit: true, toing: true, jiomart: false, amazonNow: true }
    },
    {
      id: "atta",
      name: "Aashirvaad Atta",
      quantity: 5,
      unit: "kg",
      category: "Pantry",
      prices: { zepto: 255, blinkit: 249, toing: 265, jiomart: 238, amazonNow: 252 },
      available: { zepto: true, blinkit: true, toing: true, jiomart: true, amazonNow: true }
    },
    {
      id: "tomato",
      name: "Tomato",
      quantity: 1,
      unit: "kg",
      category: "Fresh",
      prices: { zepto: 42, blinkit: 39, toing: 44, jiomart: 36, amazonNow: 45 },
      available: { zepto: true, blinkit: true, toing: true, jiomart: true, amazonNow: false }
    }
  ],
  vendorMeta: {
    zepto: { deliveryFee: 29, platformFee: 9, discount: 35, eta: 10, serviceable: true },
    blinkit: { deliveryFee: 25, platformFee: 6, discount: 20, eta: 12, serviceable: true },
    toing: { deliveryFee: 19, platformFee: 5, discount: 15, eta: 18, serviceable: true },
    jiomart: { deliveryFee: 0, platformFee: 0, discount: 25, eta: 55, serviceable: true },
    amazonNow: { deliveryFee: 30, platformFee: 7, discount: 30, eta: 35, serviceable: true }
  }
};

const storageKey = "cartpilot-india-v2";
const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const state = loadState();

const elements = {
  locationName: document.querySelector("#locationName"),
  saveLocationBtn: document.querySelector("#saveLocationBtn"),
  itemForm: document.querySelector("#itemForm"),
  vendorSettings: document.querySelector("#vendorSettings"),
  priority: document.querySelector("#priority"),
  maxEta: document.querySelector("#maxEta"),
  minAvailability: document.querySelector("#minAvailability"),
  onlyServiceable: document.querySelector("#onlyServiceable"),
  bestVendor: document.querySelector("#bestVendor"),
  bestTotal: document.querySelector("#bestTotal"),
  savings: document.querySelector("#savings"),
  itemCount: document.querySelector("#itemCount"),
  contextLine: document.querySelector("#contextLine"),
  recommendation: document.querySelector("#recommendation"),
  vendorCards: document.querySelector("#vendorCards"),
  matrixHead: document.querySelector("#priceMatrix thead"),
  matrixBody: document.querySelector("#priceMatrix tbody"),
  emptyState: document.querySelector("#emptyState"),
  resetBtn: document.querySelector("#resetBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  importInput: document.querySelector("#importInput")
};

elements.locationName.value = state.location;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Array.isArray(saved.items) && saved.vendorMeta) {
      return normalizeState(saved);
    }
  } catch {
    return cloneSample();
  }
  return cloneSample();
}

function cloneSample() {
  return normalizeState(JSON.parse(JSON.stringify(sampleState)));
}

function normalizeState(nextState) {
  nextState.location ||= sampleState.location;
  nextState.items ||= [];
  nextState.vendorMeta ||= {};
  vendors.forEach((vendor) => {
    nextState.vendorMeta[vendor.id] = {
      deliveryFee: 0,
      platformFee: 0,
      discount: 0,
      eta: 30,
      serviceable: true,
      ...(nextState.vendorMeta[vendor.id] || {})
    };
    nextState.items.forEach((item) => {
      item.id ||= crypto.randomUUID();
      item.prices ||= {};
      item.available ||= {};
      item.prices[vendor.id] = Number(item.prices[vendor.id] || 0);
      item.available[vendor.id] = item.available[vendor.id] !== false;
    });
  });
  return nextState;
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function vendorSubtotal(vendorId) {
  return state.items.reduce((sum, item) => {
    if (!item.available[vendorId]) return sum;
    return sum + Number(item.prices[vendorId] || 0);
  }, 0);
}

function vendorMissingItems(vendorId) {
  return state.items.filter((item) => !item.available[vendorId]);
}

function vendorAvailability(vendorId) {
  if (!state.items.length) return 0;
  const available = state.items.length - vendorMissingItems(vendorId).length;
  return Math.round((available / state.items.length) * 100);
}

function vendorTotal(vendorId) {
  const meta = state.vendorMeta[vendorId];
  return Math.max(0, vendorSubtotal(vendorId) + Number(meta.deliveryFee) + Number(meta.platformFee) - Number(meta.discount));
}

function rankVendors() {
  const maxEta = Number(elements.maxEta.value);
  const minAvailability = Number(elements.minAvailability.value);
  const priority = elements.priority.value;
  const rows = vendors.map((vendor) => {
    const missing = vendorMissingItems(vendor.id);
    const availability = vendorAvailability(vendor.id);
    const meta = state.vendorMeta[vendor.id];
    const total = vendorTotal(vendor.id);
    return { ...vendor, ...meta, missing, availability, total, subtotal: vendorSubtotal(vendor.id) };
  }).filter((vendor) => {
    const serviceOk = !elements.onlyServiceable.checked || vendor.serviceable;
    return serviceOk && Number(vendor.eta) <= maxEta && vendor.availability >= minAvailability;
  });

  const complete = rows.filter((vendor) => vendor.missing.length === 0);
  const basis = priority === "cheap" || !complete.length ? rows : complete;
  const fastest = Math.min(...basis.map((vendor) => Number(vendor.eta) || 1));
  const cheapest = Math.min(...basis.map((vendor) => vendor.total || 1));

  return rows.map((vendor) => {
    let score = 0;
    if (priority === "fast") {
      score = (fastest / Math.max(Number(vendor.eta), 1)) * 70 + (vendor.availability / 100) * 30;
    } else if (priority === "available") {
      score = vendor.availability * 0.8 + (cheapest / Math.max(vendor.total, 1)) * 20;
    } else if (priority === "cheap") {
      score = (cheapest / Math.max(vendor.total, 1)) * 100;
    } else {
      score = (cheapest / Math.max(vendor.total, 1)) * 70 + (fastest / Math.max(Number(vendor.eta), 1)) * 15 + (vendor.availability / 100) * 15;
      if (vendor.missing.length) score -= 40;
    }
    return { ...vendor, score };
  }).sort((a, b) => b.score - a.score || a.total - b.total);
}

function render() {
  renderVendorSettings();
  renderMatrix();
  renderResults();
}

function renderResults() {
  const ranked = rankVendors();
  const best = ranked[0];
  const totals = ranked.map((vendor) => vendor.total);
  const highest = totals.length ? Math.max(...totals) : 0;

  elements.contextLine.textContent = `Comparing grocery apps for ${state.location}`;
  elements.itemCount.textContent = String(state.items.length);
  elements.bestVendor.textContent = best ? best.name : "-";
  elements.bestTotal.textContent = best ? currency.format(best.total) : currency.format(0);
  elements.savings.textContent = best ? currency.format(Math.max(0, highest - best.total)) : currency.format(0);
  elements.emptyState.hidden = state.items.length > 0;
  elements.recommendation.hidden = !best;

  if (best) {
    const missingCopy = best.missing.length
      ? `${best.missing.length} item${best.missing.length === 1 ? "" : "s"} missing: ${best.missing.map((item) => escapeHtml(item.name)).join(", ")}.`
      : "All cart items are available.";
    elements.recommendation.innerHTML = `<strong>${escapeHtml(best.name)}</strong> is the best checkout choice at <strong>${currency.format(best.total)}</strong>. ${missingCopy} ETA is ${best.eta} min after ${currency.format(best.discount)} discount and fees.`;
  }

  elements.vendorCards.innerHTML = ranked.map((vendor, index) => vendorCard(vendor, index === 0)).join("");
}

function renderVendorSettings() {
  elements.vendorSettings.innerHTML = vendors.map((vendor) => {
    const meta = state.vendorMeta[vendor.id];
    return `
      <section class="vendor-setting" style="--vendor-color: ${vendor.color}">
        <div class="vendor-setting-head">
          <span class="vendor-dot"></span>
          <strong>${vendor.name}</strong>
          <label class="mini-toggle">
            <input type="checkbox" data-meta="${vendor.id}" data-field="serviceable" ${meta.serviceable ? "checked" : ""}>
            <span>On</span>
          </label>
        </div>
        <div class="charge-grid">
          <label>Delivery<input type="number" min="0" data-meta="${vendor.id}" data-field="deliveryFee" value="${meta.deliveryFee}"></label>
          <label>Platform<input type="number" min="0" data-meta="${vendor.id}" data-field="platformFee" value="${meta.platformFee}"></label>
          <label>Discount<input type="number" min="0" data-meta="${vendor.id}" data-field="discount" value="${meta.discount}"></label>
          <label>ETA min<input type="number" min="1" data-meta="${vendor.id}" data-field="eta" value="${meta.eta}"></label>
        </div>
      </section>
    `;
  }).join("");
}

function renderMatrix() {
  elements.matrixHead.innerHTML = `
    <tr>
      <th>Item</th>
      ${vendors.map((vendor) => `<th>${vendor.name}</th>`).join("")}
      <th></th>
    </tr>
  `;

  elements.matrixBody.innerHTML = state.items.map((item) => `
    <tr>
      <td class="item-cell">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${item.quantity} ${escapeHtml(item.unit)} · ${escapeHtml(item.category)}</span>
      </td>
      ${vendors.map((vendor) => matrixCell(item, vendor)).join("")}
      <td>
        <button class="small-icon" data-delete-item="${item.id}" type="button" title="Remove item" aria-label="Remove ${escapeHtml(item.name)}">
          <svg viewBox="0 0 24 24"><path d="M5 7h14m-9 4v6m4-6v6M9 7l1-3h4l1 3m-8 0 1 14h8l1-14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </td>
    </tr>
  `).join("");
}

function matrixCell(item, vendor) {
  const checked = item.available[vendor.id] ? "checked" : "";
  const disabled = item.available[vendor.id] ? "" : "disabled";
  return `
    <td>
      <label class="price-cell">
        <span class="availability">
          <input type="checkbox" data-item="${item.id}" data-vendor="${vendor.id}" data-kind="available" ${checked}>
          <span>Available</span>
        </span>
        <input type="number" min="0" step="1" data-item="${item.id}" data-vendor="${vendor.id}" data-kind="price" value="${item.prices[vendor.id]}" ${disabled}>
      </label>
    </td>
  `;
}

function vendorCard(vendor, isBest) {
  const missingText = vendor.missing.length ? `${vendor.missing.length} missing` : "Complete cart";
  const serviceClass = vendor.serviceable ? "stock" : "out";
  return `
    <article class="offer-card ${isBest ? "best" : ""}" style="--vendor-color: ${vendor.color}">
      <div class="platform">
        <span class="platform-badge">${vendor.name.charAt(0)}</span>
        <div>
          <strong>${vendor.name}</strong>
          <span>${vendor.availability}% available · ${vendor.eta} min ETA</span>
        </div>
      </div>
      <div class="price-block">
        <strong>${currency.format(vendor.total)}</strong>
        <span>${currency.format(vendor.subtotal)} items + ${currency.format(Number(vendor.deliveryFee) + Number(vendor.platformFee))} fees - ${currency.format(vendor.discount)}</span>
      </div>
      <div class="offer-meta">
        <span class="pill ${serviceClass}">${vendor.serviceable ? "Serviceable" : "Not serviceable"}</span>
        <span class="pill">${missingText}</span>
        <div>${Math.round(vendor.score)} score</div>
      </div>
    </article>
  `;
}

function addItem(formData) {
  const item = {
    id: crypto.randomUUID(),
    name: formData.get("name").trim(),
    quantity: Number(formData.get("quantity")),
    unit: formData.get("unit").trim() || "pack",
    category: formData.get("category"),
    prices: {},
    available: {}
  };
  vendors.forEach((vendor) => {
    item.prices[vendor.id] = 0;
    item.available[vendor.id] = true;
  });
  state.items.push(item);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}

elements.saveLocationBtn.addEventListener("click", () => {
  state.location = elements.locationName.value.trim() || "My delivery area";
  saveState();
  render();
});

elements.itemForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addItem(new FormData(elements.itemForm));
  elements.itemForm.reset();
  elements.itemForm.elements.quantity.value = 1;
  elements.itemForm.elements.unit.value = "pack";
  saveState();
  render();
});

function updateVendorMeta(event) {
  const target = event.target;
  const vendorId = target.dataset.meta;
  if (!vendorId) return;
  const field = target.dataset.field;
  state.vendorMeta[vendorId][field] = field === "serviceable" ? target.checked : Number(target.value);
  saveState();
  renderResults();
}

elements.vendorSettings.addEventListener("input", updateVendorMeta);
elements.vendorSettings.addEventListener("change", updateVendorMeta);

function updateMatrixValue(event) {
  const target = event.target;
  const itemId = target.dataset.item;
  const vendorId = target.dataset.vendor;
  const item = state.items.find((candidate) => candidate.id === itemId);
  if (!item || !vendorId) return;

  if (target.dataset.kind === "available") {
    item.available[vendorId] = target.checked;
    const priceInput = target.closest(".price-cell")?.querySelector('input[data-kind="price"]');
    if (priceInput) priceInput.disabled = !target.checked;
  }
  if (target.dataset.kind === "price") {
    item.prices[vendorId] = Number(target.value);
  }
  saveState();
  renderResults();
}

elements.matrixBody.addEventListener("input", updateMatrixValue);
elements.matrixBody.addEventListener("change", updateMatrixValue);

elements.matrixBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-item]");
  if (!button) return;
  state.items = state.items.filter((item) => item.id !== button.dataset.deleteItem);
  saveState();
  render();
});

[elements.priority, elements.maxEta, elements.minAvailability, elements.onlyServiceable].forEach((control) => {
  control.addEventListener("input", render);
});

elements.resetBtn.addEventListener("click", () => {
  Object.assign(state, cloneSample());
  elements.locationName.value = state.location;
  saveState();
  render();
});

elements.exportBtn.addEventListener("click", () => {
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cartpilot-india-comparison.json";
  link.click();
  URL.revokeObjectURL(url);
});

elements.importInput.addEventListener("change", async () => {
  const file = elements.importInput.files[0];
  if (!file) return;
  const imported = normalizeState(JSON.parse(await file.text()));
  Object.assign(state, imported);
  elements.locationName.value = state.location;
  saveState();
  render();
});

saveState();
render();
