/* ===================================================================
   VIBE WEALTH — Application Engine v3
   Parser · State · Reducer · Renderer · Toasts
   =================================================================== */

(function () {
  'use strict';

  // ─── Categories ─────────────────────────────────────────────
  const CATEGORIES = ['Food & Dining', 'Travel', 'Salary', 'Miscellaneous'];

  // ─── Keyword → Category Mapping ─────────────────────────────
  const KEYWORD_MAP = {
    'Food & Dining': [
      'zomato', 'swiggy', 'kfc', 'mcdonalds', 'mcdonald', 'dominos', 'domino',
      'starbucks', 'pizza hut', 'pizzahut', 'burger king', 'subway', 'dunkin',
      'haldirams', 'haldiram', 'barbeque nation', 'cafe coffee day', 'ccd',
      'restaurant', 'resto', 'dhaba', 'biryani', 'food', 'dining', 'eat',
      'bakery', 'chai', 'tea post', 'baskin robbins', 'ice cream'
    ],
    'Travel': [
      'uber', 'ola', 'rapido', 'makemytrip', 'mmt', 'indigo', 'air india',
      'railways', 'irctc', 'metro', 'auto', 'rickshaw', 'cab', 'taxi',
      'spicejet', 'vistara', 'goibibo', 'yatra', 'redbus', 'bus', 'flight',
      'train', 'petrol', 'fuel', 'toll', 'parking', 'lyft'
    ],
    'Salary': [
      'salary', 'stipend', 'bonus', 'payout', 'payroll', 'wage', 'compensation',
      'freelance payment', 'invoice paid'
    ]
  };

  // ─── Cashback / Reward Partner Keywords ─────────────────────
  const REWARD_KEYWORDS = [
    'cashback', 'cred', 'hdfc', 'amex', 'amazon pay', 'amazonpay',
    'supercard', 'paytm', 'simpl', 'lazypay', 'slice', 'onecard',
    'reward', 'points', 'freecharge', 'mobikwik'
  ];

  // ─── Sample messages ───────────────────────────────────────
  const SAMPLE_MSGS = [
    'Paid Rs. 250 to Zomato via UPI',
    'Received Rs. 45,000 from Acme Corp Salary',
    'Sent Rs. 350 to Uber using UPI',
    'Rs. 1,200 credited from Private Company Ltd',
    'Paid Rs. 999 to Swiggy via Cred Cashback',
    'Debited Rs. 150 for Metro Smart Card Recharge',
    'Rs. 500 received from Ravi Kumar via GPay',
    'Paid Rs. 1,500 to MakeMyTrip for flight booking',
    'Sent Rs. 200 to Dominos Pizza via Amazon Pay',
    'Credited Rs. 8,000 Freelance Payment from Upwork'
  ];

  // ─── Category Styles ───────────────────────────────────────
  const CAT_STYLES = {
    'Food & Dining': { slug: 'food',   color: '#f59e0b', emoji: '🍔' },
    'Travel':        { slug: 'travel', color: '#06b6d4', emoji: '✈️' },
    'Salary':        { slug: 'salary', color: '#10b981', emoji: '💰' },
    'Miscellaneous': { slug: 'misc',   color: '#8b5cf6', emoji: '📦' }
  };

  // ─── Application State ─────────────────────────────────────
  let transactions = [];
  let nextId = 1;

  // ─── DOM References ─────────────────────────────────────────
  const txnInput       = document.getElementById('txn-input');
  const btnAdd         = document.getElementById('btn-add');
  const sampleBtns     = document.getElementById('sample-btns');
  const txnList        = document.getElementById('transaction-list');
  const totalIncomeEl  = document.getElementById('total-income');
  const totalExpenseEl = document.getElementById('total-expense');
  const totalBalanceEl = document.getElementById('total-balance');
  const toastContainer = document.getElementById('toast-container');

  // ───────────────────────────────────────────────────────────
  //  PARSER
  // ───────────────────────────────────────────────────────────

  function parseTransaction(raw) {
    const text = raw.trim();
    const lower = text.toLowerCase();

    // 1. Extract amount
    const amountMatch = text.match(/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
    const amount = amountMatch
      ? parseFloat(amountMatch[1].replace(/,/g, ''))
      : 0;

    // 2. Direction
    const outflowRe = /\b(paid|sent|debited|spent|deducted|debit|transferred|charged)\b/i;
    const inflowRe  = /\b(received|credited|credit|added|deposited|refund|refunded)\b/i;

    let type = 'outflow';
    if (inflowRe.test(lower))       type = 'inflow';
    else if (outflowRe.test(lower)) type = 'outflow';

    // 3. Auto-categorize
    let category = 'Miscellaneous';
    for (const [cat, keywords] of Object.entries(KEYWORD_MAP)) {
      if (keywords.some(kw => lower.includes(kw))) {
        category = cat;
        break;
      }
    }

    // 4. Description
    const description = buildDescription(text, amount, type);

    // 5. Cashback / Savings detection
    let hasSavings = false;
    let savingsDetail = null;
    if (type === 'outflow' && amount > 0) {
      const partner = REWARD_KEYWORDS.find(kw => lower.includes(kw));
      if (partner) {
        hasSavings = true;
        const pct = 5;
        const cashback = Math.round(amount * pct / 100);
        const points   = Math.round(amount / 50) * 2;
        savingsDetail = {
          cashbackAmount: cashback,
          rewardPoints: points,
          partnerName: partner.charAt(0).toUpperCase() + partner.slice(1),
          cashbackPercent: pct
        };
      }
    }

    return {
      id: nextId++,
      raw: text,
      description,
      amount,
      type,
      category,
      hasSavings,
      savingsDetail,
      timestamp: new Date()
    };
  }

  function buildDescription(raw, amount, type) {
    const amtStr = formatCurrency(amount);
    const toMatch   = raw.match(/(?:to|at)\s+(.+?)(?:\s+(?:via|using|through|on|for|$))/i);
    const fromMatch = raw.match(/(?:from)\s+(.+?)(?:\s+(?:via|using|through|on|as|for|$))/i);
    const forMatch  = raw.match(/(?:for)\s+(.+?)(?:\s+(?:via|using|through|on|$))/i);

    if (type === 'outflow') {
      const target = toMatch ? toMatch[1].trim() : (forMatch ? forMatch[1].trim() : '');
      return target ? `Paid ${amtStr} to ${target}` : `Paid ${amtStr}`;
    } else {
      const target = fromMatch ? fromMatch[1].trim() : '';
      return target ? `Received ${amtStr} from ${target}` : `Received ${amtStr}`;
    }
  }

  // ───────────────────────────────────────────────────────────
  //  CUMULATIVE METRIC REDUCER
  // ───────────────────────────────────────────────────────────

  function computeMetrics() {
    let totalIncome = 0, totalExpense = 0;
    const catTotals = {};
    CATEGORIES.forEach(c => catTotals[c] = 0);

    transactions.forEach(txn => {
      if (txn.type === 'inflow') totalIncome  += txn.amount;
      else                       totalExpense += txn.amount;
      catTotals[txn.category] = (catTotals[txn.category] || 0) + txn.amount;
    });

    return { totalIncome, totalExpense, balance: totalIncome - totalExpense, catTotals };
  }

  // ───────────────────────────────────────────────────────────
  //  RENDERING
  // ───────────────────────────────────────────────────────────

  function renderAll() {
    renderMetrics();
    renderTransactionList();
  }

  function renderMetrics() {
    const m = computeMetrics();

    animateValue(totalIncomeEl,  m.totalIncome);
    animateValue(totalExpenseEl, m.totalExpense);
    animateValue(totalBalanceEl, Math.abs(m.balance), m.balance < 0 ? '- ' : '');

    const maxCat = Math.max(...Object.values(m.catTotals), 1);

    CATEGORIES.forEach(cat => {
      const s = CAT_STYLES[cat];
      const amountEl = document.getElementById(`cat-amount-${s.slug}`);
      const fillEl   = document.getElementById(`pf-${s.slug}`);
      if (amountEl) amountEl.textContent = formatCurrency(m.catTotals[cat]);
      if (fillEl)   fillEl.style.width   = Math.min((m.catTotals[cat] / maxCat) * 100, 100) + '%';
    });
  }

  function animateValue(el, target, prefix = '') {
    const current = parseInt(el.textContent.replace(/[^0-9]/g, ''), 10) || 0;
    if (current === target) { el.textContent = prefix + formatCurrency(target); return; }

    const duration = 400;
    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const value = Math.round(current + (target - current) * eased);
      el.textContent = prefix + formatCurrency(value);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function renderTransactionList() {
    txnList.innerHTML = '';

    if (transactions.length === 0) {
      txnList.innerHTML = `
        <div class="empty-state" id="empty-state">
          <div class="empty-icon">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity=".3">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <p class="empty-title">No transactions yet</p>
          <p>Paste a UPI alert above or click a sample to get started.</p>
        </div>`;
      return;
    }

    const sorted = [...transactions].reverse();
    sorted.forEach((txn, idx) => {
      const card = createTxnCard(txn, idx);
      txnList.appendChild(card);
    });
  }

  function createTxnCard(txn, idx) {
    const card = document.createElement('div');
    const isOut = txn.type === 'outflow';
    card.className = `txn-card ${isOut ? 'outflow-card' : 'inflow-card'}`;
    card.id = `txn-${txn.id}`;
    card.style.animationDelay = `${idx * 0.04}s`;

    const sign = isOut ? '−' : '+';
    const cls  = isOut ? 'outflow' : 'inflow';
    const icon = isOut
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="7" x2="7" y2="17"/><polyline points="17 17 7 17 7 7"/></svg>';

    const optionsHtml = CATEGORIES.map(cat =>
      `<option value="${cat}" ${cat === txn.category ? 'selected' : ''}>${cat}</option>`
    ).join('');

    let savingsHtml = '';
    if (txn.hasSavings && txn.savingsDetail) {
      const s = txn.savingsDetail;
      savingsHtml = `
        <div class="savings-row">
          <span class="savings-icon">🎁</span>
          <span class="savings-text">
            Expected Savings: <span class="savings-value">₹${s.cashbackAmount.toLocaleString('en-IN')}</span>
            &nbsp;/&nbsp; ${s.rewardPoints} Reward Points
          </span>
          <span class="savings-badge">${s.partnerName} · ${s.cashbackPercent}% back</span>
        </div>`;
    }

    card.innerHTML = `
      <div class="txn-card-body">
        <div class="txn-left">
          <div class="txn-icon ${cls}">${icon}</div>
          <div class="txn-info">
            <div class="txn-desc">${escapeHtml(txn.description)}</div>
            <div class="txn-raw">${escapeHtml(txn.raw)}</div>
            <div class="txn-meta">
              <span class="txn-time">${formatTime(txn.timestamp)}</span>
              <select class="cat-select" data-txn-id="${txn.id}" aria-label="Category for transaction ${txn.id}">
                ${optionsHtml}
              </select>
            </div>
          </div>
        </div>
        <div class="txn-right">
          <span class="txn-amount ${cls}">${sign} ${formatCurrency(txn.amount)}</span>
          <button class="btn-delete" data-txn-id="${txn.id}" title="Delete" aria-label="Delete transaction ${txn.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      ${savingsHtml}`;

    // Category change
    card.querySelector('.cat-select').addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.txnId, 10);
      const t = transactions.find(x => x.id === id);
      if (t) {
        const oldCat = t.category;
        t.category = e.target.value;
        renderMetrics();
        showToast(`Moved to ${e.target.value}`, 'info', '🏷️');
      }
    });

    // Delete
    card.querySelector('.btn-delete').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const id = parseInt(btn.dataset.txnId, 10);
      const cardEl = document.getElementById(`txn-${id}`);
      if (cardEl) {
        cardEl.style.transition = 'all .35s var(--ease-out)';
        cardEl.style.opacity = '0';
        cardEl.style.transform = 'translateX(40px) scale(.95)';
        setTimeout(() => {
          transactions = transactions.filter(x => x.id !== id);
          renderAll();
          showToast('Transaction removed', 'warning', '🗑️');
        }, 350);
      }
    });

    return card;
  }

  // ───────────────────────────────────────────────────────────
  //  TOAST SYSTEM
  // ───────────────────────────────────────────────────────────

  function showToast(message, type = 'info', icon = 'ℹ️') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3200);
  }

  // ───────────────────────────────────────────────────────────
  //  EVENT HANDLERS
  // ───────────────────────────────────────────────────────────

  function addTransaction(rawText) {
    if (!rawText || !rawText.trim()) return;
    const txn = parseTransaction(rawText);
    if (txn.amount === 0) {
      txn.description = txn.type === 'outflow'
        ? 'Paid ₹0 (could not parse amount)'
        : 'Received ₹0 (could not parse amount)';
    }
    transactions.push(txn);
    renderAll();
    txnInput.value = '';
    txnInput.focus();

    const catStyle = CAT_STYLES[txn.category];
    const typeLabel = txn.type === 'inflow' ? 'Received' : 'Paid';
    showToast(
      `${typeLabel} ${formatCurrency(txn.amount)} → ${txn.category}`,
      txn.type === 'inflow' ? 'success' : 'info',
      txn.type === 'inflow' ? '📥' : '📤'
    );
  }

  btnAdd.addEventListener('click', () => addTransaction(txnInput.value));

  txnInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addTransaction(txnInput.value);
    }
  });

  // ─── Sample Buttons ─────────────────────────────────────────
  SAMPLE_MSGS.forEach(msg => {
    const btn = document.createElement('button');
    btn.className = 'btn-sample';
    btn.textContent = msg.length > 44 ? msg.slice(0, 41) + '…' : msg;
    btn.title = msg;
    btn.addEventListener('click', () => {
      txnInput.value = msg;
      addTransaction(msg);
    });
    sampleBtns.appendChild(btn);
  });

  // ───────────────────────────────────────────────────────────
  //  HELPERS
  // ───────────────────────────────────────────────────────────

  function formatCurrency(n) {
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  function formatTime(date) {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      + ' · '
      + date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ─── Seed data ──────────────────────────────────────────────
  const SEED = [
    'Received Rs. 45,000 from Acme Corp Salary',
    'Paid Rs. 250 to Zomato via UPI',
    'Sent Rs. 350 to Uber using UPI',
    'Paid Rs. 999 to Swiggy via Cred Cashback',
    'Rs. 500 received from Ravi Kumar via GPay',
    'Paid Rs. 1,500 to MakeMyTrip for flight booking',
    'Sent Rs. 200 to Dominos Pizza via Amazon Pay'
  ];
  SEED.forEach(msg => {
    const txn = parseTransaction(msg);
    transactions.push(txn);
  });
  renderAll();

})();
