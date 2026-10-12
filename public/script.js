
/* ============================================================
   DeployTrack — Frontend logic
   Expects backend at /api/deployments (Express + MySQL)
   ============================================================ */

const API = '/api/deployments';

// DOM refs
const $ = (id) => document.getElementById(id);
const rowsEl    = $('rows');
const totalEl   = $('total');
const successEl = $('success');
const failedEl  = $('failed');
const progressEl= $('progress');
const noticeEl  = $('notice');
const dlg       = $('dlg');
const form      = $('form');
const formtitle = $('formtitle');
const errEl     = $('error');

// State
let allDeployments = [];

// ---------- Utilities ----------
const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

const envClass = (env) => String(env || '').toLowerCase();

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  return dt.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
};

const showNotice = (msg, isError = false) => {
  noticeEl.textContent = msg;
  noticeEl.style.color = isError ? '#fca5a5' : '#8b97b3';
};

// ---------- API ----------
async function fetchDeployments() {
  try {
    rowsEl.innerHTML = '<tr><td colspan="7" class="loading">Loading deployments…</td></tr>';
    const res = await fetch(API);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allDeployments = await res.json();
    render();
  } catch (err) {
    rowsEl.innerHTML = `<tr><td colspan="7" class="loading" style="color:#fca5a5">Failed to load: ${escapeHtml(err.message)}</td></tr>`;
    showNotice('Could not reach API. Check server is running.', true);
  }
}

async function createDeployment(payload) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function updateDeployment(id, payload) {
  const res = await fetch(`${API}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ---------- Rendering ----------
function render() {
  // Filters
  const search = $('search').value.trim().toLowerCase();
  const sf = $('sf').value;
  const ef = $('ef').value;

  let list = allDeployments.slice();

  if (search) {
    list = list.filter(d =>
      (d.service_name || d.project_name || d.project || '')
        .toLowerCase().includes(search)
    );
  }
  if (sf) list = list.filter(d => d.status === sf);
  if (ef) list = list.filter(d => d.environment === ef);

  // Stats reflect ALL deployments (not filtered)
  const counts = allDeployments.reduce((acc, d) => {
    acc.total++;
    if (d.status === 'SUCCESS')        acc.success++;
    else if (d.status === 'FAILED')    acc.failed++;
    else if (d.status === 'IN_PROGRESS') acc.progress++;
    return acc;
  }, { total: 0, success: 0, failed: 0, progress: 0 });

  totalEl.textContent    = counts.total;
  successEl.textContent  = counts.success;
  failedEl.textContent   = counts.failed;
  progressEl.textContent = counts.progress;

  // Table
  if (!list.length) {
    rowsEl.innerHTML = '<tr><td colspan="7" class="loading">No deployments found</td></tr>';
    showNotice(search || sf || ef ? `${list.length} result(s) — filters active` : '');
    return;
  }

  rowsEl.innerHTML = list.map(d => {
    const name    = d.service_name || d.project_name || d.project || '—';
    const build   = d.build_number ?? d.version ?? '—';
    const env     = d.environment || '—';
    const status  = d.status || 'IN_PROGRESS';
    const by      = d.deployed_by || '—';
    const started = d.deployed_at || d.started_at || d.created_at;

    return `
      <tr>
        <td><strong>${escapeHtml(name)}</strong></td>
        <td class="mono">#${escapeHtml(build)}</td>
        <td><span class="env-tag ${envClass(env)}">${escapeHtml(env)}</span></td>
        <td><span class="badge ${escapeHtml(status)}">${escapeHtml(status.replace('_', ' '))}</span></td>
        <td>${escapeHtml(by)}</td>
        <td class="mono">${escapeHtml(fmtDate(started))}</td>
        <td>
          <div class="actions-cell">
            <button class="icon-btn" title="Edit" onclick="editDeployment(${d.id})">✎</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  showNotice(`${list.length} of ${allDeployments.length} deployments shown`);
}

// ---------- Dialog ----------
function openDialog(deployment = null) {
  errEl.textContent = '';
  form.reset();

  if (deployment) {
    formtitle.textContent = 'Edit deployment';
    $('id').value      = deployment.id;
    $('project').value = deployment.service_name || deployment.project_name || '';
    $('version').value = deployment.version || '';
    $('build').value   = deployment.build_number ?? '';
    $('env').value     = deployment.environment || 'Development';
    $('status').value  = deployment.status || 'SUCCESS';
    $('by').value      = deployment.deployed_by || 'manual';
    $('image').value   = deployment.docker_image || '';
    $('commit').value  = deployment.commit_hash || '';
    $('logs').value    = deployment.notes || '';
  } else {
    formtitle.textContent = 'Record deployment';
    $('id').value = '';
    $('by').value = 'manual';
  }

  dlg.showModal();
}

function closeDialog() {
  dlg.close();
}

// ---------- Form submit ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errEl.textContent = '';

  const id = $('id').value;
  const payload = {
    service_name: $('project').value.trim(),
    version:      $('version').value.trim(),
    build_number: $('build').value.trim(),
    environment:  $('env').value,
    status:       $('status').value,
    deployed_by:  $('by').value.trim() || 'manual',
    docker_image: $('image').value.trim() || null,
    commit_hash:  $('commit').value.trim() || null,
    notes:        $('logs').value.trim() || null
  };

  try {
    if (id) {
      await updateDeployment(id, payload);
      showNotice('Deployment updated ✓');
    } else {
      await createDeployment(payload);
      showNotice('Deployment recorded ✓');
    }
    closeDialog();
    fetchDeployments();
  } catch (err) {
    errEl.textContent = err.message;
  }
});

// ---------- Global handlers ----------
window.editDeployment = (id) => {
  const d = allDeployments.find(x => Number(x.id) === Number(id));
  if (d) openDialog(d);
};

// ---------- Wire events ----------
$('new').addEventListener('click', () => openDialog());
$('refresh').addEventListener('click', () => {
  fetchDeployments();
  showNotice('Refreshed');
});
$('close').addEventListener('click', closeDialog);
$('cancel').addEventListener('click', closeDialog);

$('search').addEventListener('input', render);
$('sf').addEventListener('change', render);
$('ef').addEventListener('change', render);

// Close on backdrop click
dlg.addEventListener('click', (e) => {
  if (e.target === dlg) closeDialog();
});

// ---------- Boot ----------
fetchDeployments();
