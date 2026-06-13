(function () {
  'use strict';

  // === 定数 ===
  const STORAGE_CUSTOMERS = 'crm-customers';
  const STORAGE_DEALS = 'crm-deals';
  const STATUS_LABELS = { lead: '見込み', proposal: '提案', won: '成約' };
  const STATUS_ORDER = ['lead', 'proposal', 'won'];

  // === 状態 ===
  let customers = [];
  let deals = [];
  let selectedCustomerId = null;
  let searchQuery = '';

  // === ストレージ ===
  function loadData() {
    customers = JSON.parse(localStorage.getItem(STORAGE_CUSTOMERS) || '[]');
    deals = JSON.parse(localStorage.getItem(STORAGE_DEALS) || '[]');
  }

  function saveCustomers() {
    localStorage.setItem(STORAGE_CUSTOMERS, JSON.stringify(customers));
  }

  function saveDeals() {
    localStorage.setItem(STORAGE_DEALS, JSON.stringify(deals));
  }

  // === 初期データ ===
  function seedData() {
    if (customers.length > 0) return;
    const t = (offset) => new Date(Date.now() - offset).toISOString();
    customers = [
      { id: 'c_seed3', company: 'フォレスト・パートナーズ合同会社', contactName: '橘 みなみ', title: '事業開発マネージャー', email: 'tachibana@forest-p.example', phone: '', memo: '来季予算確定後に再提案予定', createdAt: t(1000) },
      { id: 'c_seed2', company: 'ミドリ工業株式会社', contactName: '坂本 龍一郎', title: '代表取締役', email: 'sakamoto@midori-ind.example', phone: '06-9876-5432', memo: '', createdAt: t(2000) },
      { id: 'c_seed1', company: '株式会社テラノバ', contactName: '北村 恵', title: '購買部長', email: 'kitamura@terranova.example', phone: '03-1234-5678', memo: '毎月第一週に定例打ち合わせあり', createdAt: t(3000) },
    ];
    const now = new Date().toISOString();
    deals = [
      { id: 'd_seed1', customerId: 'c_seed1', dealTitle: 'クラウド移行支援', amount: 1200000, status: 'won',      followUpMemo: '契約締結済み。次フェーズ検討中。', createdAt: now, updatedAt: now },
      { id: 'd_seed2', customerId: 'c_seed1', dealTitle: '業務効率化ツール導入', amount: 480000, status: 'proposal', followUpMemo: '見積書送付済み。先方確認待ち。', createdAt: now, updatedAt: now },
      { id: 'd_seed3', customerId: 'c_seed2', dealTitle: '製造ライン最適化コンサル', amount: 980000, status: 'proposal', followUpMemo: '社内稟議中。', createdAt: now, updatedAt: now },
      { id: 'd_seed4', customerId: 'c_seed3', dealTitle: '新規事業調査レポート', amount: null, status: 'lead',     followUpMemo: '', createdAt: now, updatedAt: now },
      { id: 'd_seed5', customerId: 'c_seed3', dealTitle: 'マーケティング支援契約', amount: 250000, status: 'lead', followUpMemo: '資料送付待ち。', createdAt: now, updatedAt: now },
    ];
    saveCustomers();
    saveDeals();
  }

  function genId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  }

  // === ビュー切替 ===
  // Tailwind の flex と hidden が競合するため style.display で制御する
  function switchView(view) {
    const isCust = view === 'customers';
    document.getElementById('view-customers').style.display = isCust ? 'flex' : 'none';
    document.getElementById('view-pipeline').style.display  = isCust ? 'none' : 'flex';
    document.getElementById('btn-tab-customers').classList.toggle('tab-active', isCust);
    document.getElementById('btn-tab-pipeline').classList.toggle('tab-active', !isCust);
    if (!isCust) renderPipeline();
  }

  function showPane(pane) {
    ['empty', 'customer-detail', 'customer-form', 'deal-form'].forEach(p => {
      document.getElementById('pane-' + p).classList.toggle('hidden', p !== pane);
    });
  }

  // === 顧客リスト ===
  function getFilteredCustomers() {
    const q = searchQuery.trim().toLowerCase();
    const sorted = [...customers].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!q) return sorted;
    return sorted.filter(c =>
      c.company.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q) ||
      (c.title || '').toLowerCase().includes(q)
    );
  }

  function renderCustomerList() {
    const list = document.getElementById('customer-list');
    list.innerHTML = '';
    const filtered = getFilteredCustomers();
    if (filtered.length === 0) {
      const el = document.createElement('div');
      el.className = 'p-4 text-gray-400 text-sm text-center';
      el.textContent = searchQuery ? '該当する顧客がいません' : '顧客がいません';
      list.appendChild(el);
      return;
    }
    filtered.forEach(c => list.appendChild(buildCustomerCard(c)));
  }

  function buildCustomerCard(c) {
    const card = document.createElement('div');
    card.className = 'customer-card rounded-lg mx-2 mb-1 p-3' +
      (c.id === selectedCustomerId ? ' selected' : '');
    card.dataset.id = c.id;

    const dealCount = deals.filter(d => d.customerId === c.id).length;

    const company = document.createElement('div');
    company.className = 'text-sm font-semibold text-gray-900 truncate';
    company.textContent = c.company;

    const meta = document.createElement('div');
    meta.className = 'text-xs text-gray-500 mt-0.5 truncate';
    meta.textContent = c.contactName + (c.title ? ' · ' + c.title : '') + '　商談 ' + dealCount + '件';

    card.appendChild(company);
    card.appendChild(meta);
    card.addEventListener('click', () => selectCustomer(c.id));
    return card;
  }

  function selectCustomer(id) {
    selectedCustomerId = id;
    renderCustomerList();
    renderCustomerDetail(id);
    showPane('customer-detail');
  }

  // === 顧客詳細 ===
  function renderCustomerDetail(id) {
    const c = customers.find(c => c.id === id);
    if (!c) return;
    const pane = document.getElementById('pane-customer-detail');
    pane.innerHTML = '';
    pane.appendChild(buildDetailHeader(c));
    const info = buildContactInfo(c);
    if (info) pane.appendChild(info);
    pane.appendChild(buildDealsSection(id));
  }

  function buildDetailHeader(c) {
    const wrap = document.createElement('div');
    wrap.className = 'flex items-start justify-between mb-6';

    const left = document.createElement('div');
    const company = document.createElement('h2');
    company.className = 'text-xl font-bold text-gray-900';
    company.textContent = c.company;
    const contact = document.createElement('p');
    contact.className = 'text-sm text-gray-500 mt-1';
    contact.textContent = c.contactName + (c.title ? ' · ' + c.title : '');
    left.appendChild(company);
    left.appendChild(contact);

    const btns = document.createElement('div');
    btns.className = 'flex gap-2 shrink-0 ml-4';
    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn-secondary text-sm px-3 py-1.5';
    btnEdit.textContent = '編集';
    btnEdit.addEventListener('click', () => renderCustomerForm(c.id));
    const btnDel = document.createElement('button');
    btnDel.className = 'btn-danger text-sm px-3 py-1.5';
    btnDel.textContent = '削除';
    btnDel.addEventListener('click', () => deleteCustomer(c.id));
    btns.appendChild(btnEdit);
    btns.appendChild(btnDel);

    wrap.appendChild(left);
    wrap.appendChild(btns);
    return wrap;
  }

  function buildContactInfo(c) {
    const fields = [
      ['メール', c.email],
      ['電話',   c.phone],
      ['メモ',   c.memo],
    ].filter(([, v]) => v);
    if (fields.length === 0) return null;

    const block = document.createElement('div');
    block.className = 'bg-gray-50 rounded-lg p-4 mb-6 space-y-2';
    fields.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'flex gap-3 text-sm';
      const lEl = document.createElement('span');
      lEl.className = 'text-gray-400 w-12 shrink-0';
      lEl.textContent = label;
      const vEl = document.createElement('span');
      vEl.className = 'text-gray-800 whitespace-pre-wrap break-all';
      vEl.textContent = value;
      row.appendChild(lEl);
      row.appendChild(vEl);
      block.appendChild(row);
    });
    return block;
  }

  function buildDealsSection(customerId) {
    const wrap = document.createElement('div');

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between mb-3';
    const title = document.createElement('h3');
    title.className = 'font-semibold text-gray-900';
    title.textContent = '商談';
    const btnAdd = document.createElement('button');
    btnAdd.className = 'btn-primary text-sm px-3 py-1.5';
    btnAdd.textContent = '＋ 商談を追加';
    btnAdd.addEventListener('click', () => renderDealForm(null, customerId));
    header.appendChild(title);
    header.appendChild(btnAdd);
    wrap.appendChild(header);

    const customerDeals = deals.filter(d => d.customerId === customerId);
    if (customerDeals.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'text-center text-gray-400 text-sm py-8 border border-dashed rounded-lg';
      empty.textContent = '商談がありません';
      wrap.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.className = 'space-y-2';
      customerDeals.forEach(deal => list.appendChild(buildDealRow(deal, customerId)));
      wrap.appendChild(list);
    }
    return wrap;
  }

  function buildDealRow(deal, customerId) {
    const card = document.createElement('div');
    card.className = 'deal-card deal-card-' + deal.status +
      ' bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow';
    card.addEventListener('click', () => renderDealForm(deal.id, customerId));

    const row = document.createElement('div');
    row.className = 'flex items-center justify-between gap-2';
    const titleEl = document.createElement('span');
    titleEl.className = 'text-sm font-medium text-gray-900 truncate';
    titleEl.textContent = deal.dealTitle;
    row.appendChild(titleEl);
    row.appendChild(buildStatusBadge(deal.status));
    card.appendChild(row);

    if (deal.amount !== null) {
      const amt = document.createElement('div');
      amt.className = 'text-xs text-gray-500 mt-1';
      amt.textContent = '¥' + deal.amount.toLocaleString();
      card.appendChild(amt);
    }
    return card;
  }

  function buildStatusBadge(status) {
    const el = document.createElement('span');
    el.className = 'status-badge status-' + status + ' shrink-0';
    el.textContent = STATUS_LABELS[status];
    return el;
  }

  // === 顧客フォーム ===
  function renderCustomerForm(customerId) {
    const c = customerId ? customers.find(c => c.id === customerId) : null;
    const pane = document.getElementById('pane-customer-form');
    pane.innerHTML = '';

    const heading = document.createElement('h2');
    heading.className = 'text-lg font-bold text-gray-900 mb-6';
    heading.textContent = c ? '顧客を編集' : '新規顧客';
    pane.appendChild(heading);

    const form = document.createElement('form');
    form.className = 'space-y-4';
    form.addEventListener('submit', e => { e.preventDefault(); saveCustomer(customerId); });

    [
      { id: 'input-company',      label: '会社名',   required: true,  value: c?.company      || '', type: 'text' },
      { id: 'input-contact-name', label: '担当者名', required: true,  value: c?.contactName  || '', type: 'text' },
      { id: 'input-title',        label: '役職',     required: false, value: c?.title        || '', type: 'text' },
      { id: 'input-email',        label: 'メール',   required: false, value: c?.email        || '', type: 'email' },
      { id: 'input-phone',        label: '電話',     required: false, value: c?.phone        || '', type: 'tel' },
    ].forEach(f => form.appendChild(buildInputField(f)));

    form.appendChild(buildTextareaField('input-memo', 'メモ', c?.memo || '', 4));
    form.appendChild(buildFormButtons(
      () => saveCustomer(customerId),
      () => {
        if (customerId) { renderCustomerDetail(customerId); showPane('customer-detail'); }
        else { selectedCustomerId = null; renderCustomerList(); showPane('empty'); }
      }
    ));

    pane.appendChild(form);
    showPane('customer-form');
  }

  function buildInputField({ id, label, required, value, type }) {
    const wrap = document.createElement('div');
    const lEl = document.createElement('label');
    lEl.htmlFor = id;
    lEl.className = 'block text-sm font-medium text-gray-700 mb-1';
    lEl.textContent = label + (required ? ' *' : '');
    const input = document.createElement('input');
    input.type = type; input.id = id; input.className = 'form-input';
    input.value = value; input.required = required;
    wrap.appendChild(lEl); wrap.appendChild(input);
    return wrap;
  }

  function buildTextareaField(id, label, value, rows) {
    const wrap = document.createElement('div');
    const lEl = document.createElement('label');
    lEl.htmlFor = id; lEl.className = 'block text-sm font-medium text-gray-700 mb-1';
    lEl.textContent = label;
    const ta = document.createElement('textarea');
    ta.id = id; ta.className = 'form-input'; ta.rows = rows; ta.value = value;
    wrap.appendChild(lEl); wrap.appendChild(ta);
    return wrap;
  }

  function buildFormButtons(onSave, onCancel, onDelete) {
    const row = document.createElement('div');
    row.className = 'flex gap-3 pt-2';

    const btnSave = document.createElement('button');
    btnSave.type = 'submit';
    btnSave.className = 'btn-primary px-5 py-2 text-sm';
    btnSave.textContent = '保存';

    const btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.className = 'btn-secondary px-5 py-2 text-sm';
    btnCancel.textContent = 'キャンセル';
    btnCancel.addEventListener('click', onCancel);

    row.appendChild(btnSave);
    row.appendChild(btnCancel);

    if (onDelete) {
      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn-danger px-5 py-2 text-sm ml-auto';
      btnDel.textContent = '削除';
      btnDel.addEventListener('click', onDelete);
      row.appendChild(btnDel);
    }
    return row;
  }

  function saveCustomer(customerId) {
    const company = document.getElementById('input-company').value.trim();
    const contactName = document.getElementById('input-contact-name').value.trim();
    if (!company || !contactName) return;

    const data = {
      company,
      contactName,
      title:  document.getElementById('input-title').value.trim(),
      email:  document.getElementById('input-email').value.trim(),
      phone:  document.getElementById('input-phone').value.trim(),
      memo:   document.getElementById('input-memo').value.trim(),
    };

    if (customerId) {
      const idx = customers.findIndex(c => c.id === customerId);
      customers[idx] = { ...customers[idx], ...data };
    } else {
      const newC = { id: genId('c'), ...data, createdAt: new Date().toISOString() };
      customers.unshift(newC);
      customerId = newC.id;
    }

    saveCustomers();
    selectedCustomerId = customerId;
    renderCustomerList();
    renderCustomerDetail(customerId);
    showPane('customer-detail');
  }

  function deleteCustomer(id) {
    if (!confirm('この顧客と紐付く商談をすべて削除しますか？\nこの操作は元に戻せません。')) return;
    customers = customers.filter(c => c.id !== id);
    deals     = deals.filter(d => d.customerId !== id);
    saveCustomers();
    saveDeals();
    selectedCustomerId = null;
    renderCustomerList();
    showPane('empty');
  }

  // === 商談フォーム ===
  function renderDealForm(dealId, customerId) {
    const deal = dealId ? deals.find(d => d.id === dealId) : null;
    const pane = document.getElementById('pane-deal-form');
    pane.innerHTML = '';

    const heading = document.createElement('h2');
    heading.className = 'text-lg font-bold text-gray-900 mb-6';
    heading.textContent = deal ? '商談を編集' : '商談を追加';
    pane.appendChild(heading);

    const form = document.createElement('form');
    form.className = 'space-y-4';
    form.addEventListener('submit', e => { e.preventDefault(); saveDeal(dealId, customerId); });

    form.appendChild(buildInputField({
      id: 'input-deal-title', label: '商談タイトル', required: true,
      value: deal?.dealTitle || '', type: 'text',
    }));
    form.appendChild(buildAmountField(deal?.amount ?? ''));
    form.appendChild(buildStatusSelect(deal?.status || 'lead'));
    form.appendChild(buildTextareaField('input-follow-up-memo', 'フォローアップメモ', deal?.followUpMemo || '', 4));
    form.appendChild(buildFormButtons(
      () => saveDeal(dealId, customerId),
      () => { renderCustomerDetail(customerId); showPane('customer-detail'); },
      dealId ? () => deleteDeal(dealId, customerId) : null
    ));

    pane.appendChild(form);
    showPane('deal-form');
  }

  function buildAmountField(value) {
    const wrap = document.createElement('div');
    const lEl = document.createElement('label');
    lEl.htmlFor = 'input-deal-amount';
    lEl.className = 'block text-sm font-medium text-gray-700 mb-1';
    lEl.textContent = '金額（円）';
    const input = document.createElement('input');
    input.type = 'number'; input.id = 'input-deal-amount';
    input.className = 'form-input'; input.min = '0'; input.step = '1';
    input.value = value !== null && value !== '' ? value : '';
    wrap.appendChild(lEl); wrap.appendChild(input);
    return wrap;
  }

  function buildStatusSelect(currentStatus) {
    const wrap = document.createElement('div');
    const lEl = document.createElement('label');
    lEl.htmlFor = 'input-deal-status';
    lEl.className = 'block text-sm font-medium text-gray-700 mb-1';
    lEl.textContent = 'ステータス *';
    const sel = document.createElement('select');
    sel.id = 'input-deal-status'; sel.className = 'form-input';
    STATUS_ORDER.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = STATUS_LABELS[s];
      if (s === currentStatus) opt.selected = true;
      sel.appendChild(opt);
    });
    wrap.appendChild(lEl); wrap.appendChild(sel);
    return wrap;
  }

  function saveDeal(dealId, customerId) {
    const dealTitle = document.getElementById('input-deal-title').value.trim();
    if (!dealTitle) return;
    const amtVal = document.getElementById('input-deal-amount').value;
    const amount = amtVal !== '' ? parseInt(amtVal, 10) : null;
    const status = document.getElementById('input-deal-status').value;
    const followUpMemo = document.getElementById('input-follow-up-memo').value.trim();
    const now = new Date().toISOString();

    if (dealId) {
      const idx = deals.findIndex(d => d.id === dealId);
      deals[idx] = { ...deals[idx], dealTitle, amount, status, followUpMemo, updatedAt: now };
    } else {
      deals.push({ id: genId('d'), customerId, dealTitle, amount, status, followUpMemo, createdAt: now, updatedAt: now });
    }

    saveDeals();
    renderCustomerDetail(customerId);
    showPane('customer-detail');
  }

  function deleteDeal(dealId, customerId) {
    if (!confirm('この商談を削除しますか？')) return;
    deals = deals.filter(d => d.id !== dealId);
    saveDeals();
    renderCustomerDetail(customerId);
    showPane('customer-detail');
  }

  // === パイプライン ===
  function renderPipeline() {
    const board = document.getElementById('pipeline-board');
    board.innerHTML = '';
    STATUS_ORDER.forEach((status, colIdx) => {
      if (colIdx > 0) board.appendChild(buildColDivider());
      board.appendChild(buildPipelineColumn(status, colIdx));
    });
  }

  function buildColDivider() {
    const sep = document.createElement('div');
    sep.className = 'w-px bg-gray-200 mx-3 shrink-0 self-stretch';
    return sep;
  }

  function buildPipelineColumn(status, colIdx) {
    const col = document.createElement('div');
    col.className = 'flex flex-col flex-1 min-w-0';

    const colDeals = deals.filter(d => d.status === status);

    const header = document.createElement('div');
    header.className = 'font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200 flex items-center gap-2';
    const titleEl = document.createElement('span');
    titleEl.textContent = STATUS_LABELS[status];
    const countEl = document.createElement('span');
    countEl.className = 'text-xs font-normal text-gray-400';
    countEl.textContent = colDeals.length + '件';
    header.appendChild(titleEl);
    header.appendChild(countEl);
    col.appendChild(header);

    const cardList = document.createElement('div');
    cardList.className = 'space-y-3 flex-1 overflow-y-auto';
    colDeals.forEach(deal => {
      const customer = customers.find(c => c.id === deal.customerId);
      cardList.appendChild(buildPipelineCard(deal, customer, colIdx));
    });
    col.appendChild(cardList);
    return col;
  }

  function buildPipelineCard(deal, customer, colIdx) {
    const card = document.createElement('div');
    card.className = 'pipeline-card deal-card-' + deal.status +
      ' bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow transition-shadow';

    const titleEl = document.createElement('div');
    titleEl.className = 'text-sm font-medium text-gray-900 mb-1';
    titleEl.textContent = deal.dealTitle;
    card.appendChild(titleEl);

    const companyEl = document.createElement('div');
    companyEl.className = 'text-xs text-gray-500';
    companyEl.textContent = customer ? customer.company : '（顧客なし）';
    card.appendChild(companyEl);

    if (deal.amount !== null) {
      const amtEl = document.createElement('div');
      amtEl.className = 'text-xs text-gray-600 mt-1';
      amtEl.textContent = '¥' + deal.amount.toLocaleString();
      card.appendChild(amtEl);
    }

    card.appendChild(buildPipelineNavRow(deal, colIdx));
    card.addEventListener('click', () => openDealFromPipeline(deal));
    return card;
  }

  function buildPipelineNavRow(deal, colIdx) {
    const row = document.createElement('div');
    row.className = 'flex justify-end gap-1 mt-2';

    if (colIdx > 0) {
      const btn = document.createElement('button');
      btn.className = 'pipeline-nav-btn';
      btn.textContent = '←';
      btn.title = STATUS_LABELS[STATUS_ORDER[colIdx - 1]] + 'に移動';
      btn.addEventListener('click', e => { e.stopPropagation(); moveDeal(deal.id, STATUS_ORDER[colIdx - 1]); });
      row.appendChild(btn);
    }
    if (colIdx < STATUS_ORDER.length - 1) {
      const btn = document.createElement('button');
      btn.className = 'pipeline-nav-btn';
      btn.textContent = '→';
      btn.title = STATUS_LABELS[STATUS_ORDER[colIdx + 1]] + 'に移動';
      btn.addEventListener('click', e => { e.stopPropagation(); moveDeal(deal.id, STATUS_ORDER[colIdx + 1]); });
      row.appendChild(btn);
    }
    return row;
  }

  function moveDeal(dealId, newStatus) {
    const idx = deals.findIndex(d => d.id === dealId);
    if (idx === -1) return;
    deals[idx] = { ...deals[idx], status: newStatus, updatedAt: new Date().toISOString() };
    saveDeals();
    renderPipeline();
    if (selectedCustomerId === deals[idx].customerId) renderCustomerDetail(selectedCustomerId);
  }

  function openDealFromPipeline(deal) {
    switchView('customers');
    selectedCustomerId = deal.customerId;
    renderCustomerList();
    renderDealForm(deal.id, deal.customerId);
  }

  // === イベント登録 ===
  function setupEventListeners() {
    document.getElementById('btn-tab-customers').addEventListener('click', () => switchView('customers'));
    document.getElementById('btn-tab-pipeline').addEventListener('click', () => switchView('pipeline'));
    document.getElementById('btn-new-customer').addEventListener('click', () => {
      selectedCustomerId = null;
      renderCustomerList();
      renderCustomerForm(null);
    });
    document.getElementById('input-search').addEventListener('input', e => {
      searchQuery = e.target.value;
      renderCustomerList();
    });
  }

  // === 起動 ===
  function init() {
    loadData();
    seedData();
    setupEventListeners();
    renderCustomerList();
    switchView('customers');
    showPane('empty');
  }

  init();
})();
