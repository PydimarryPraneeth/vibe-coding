/* ===================================================================
   VIBE WEALTH — Application Logic
   Parsing engine · State management · Cumulative metric reducer
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

  // ─── Application State ─────────────────────────────────────
  let transactions = [];
  let nextId = 1;

  // ─── DOM References ─────────────────────────────────────────
  const txnInput       = document.getElementById('txn-input');
  const btnAdd         = document.getElementById('btn-add');
  const sampleBtns     = document.getElementById('sample-btns');
  const txnList        = document.getElementById('transaction-list');
  const emptyState     = document.getElementById('empty-state');
  const totalIncomeEl  = document.getElementById('total-income');
  const totalExpenseEl = document.getElementById('total-expense');
  const totalBalanceEl = document.getElementById('total-balance');

  // ───────────────────────────────────────────────────────────
  //  PARSER: Extract structured data from raw UPI/SMS text
  // ───────────────────────────────────────────────────────────

  /**
   * Parses a raw transaction string and returns a structured object.
   * @param {string} raw  The raw SMS or UPI alert text
   * @returns {object}    Parsed transaction data
   */
  function parseTransaction(raw) {
    const text = raw.trim();
    const lower = text.toLowerCase();

    // 1. Extract amount
    const amountMatch = text.match(/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
    const amount = amountMatch
      ? parseFloat(amountMatch[1].replace(/,/g, ''))
      : 0;

    // 2. Determine direction (inflow vs outflow)
    const outflowPatterns = /\b(paid|sent|debited|spent|deducted|debit|transferred|charged)\b/i;
    const inflowPatterns  = /\b(received|credited|credit|added|deposited|refund|refunded)\b/i;

    let type = 'outflow'; // default
    if (inflowPatterns.test(lower)) {
      type = 'inflow';
    } else if (outflowPatterns.test(lower)) {
      type = 'outflow';
    }

    // 3. Auto-categorize by keyword matching
    let category = 'Miscellaneous';
    for (const [cat, keywords] of Object.entries(KEYWORD_MAP)) {
      if (keywords.some(kw => lower.includes(kw))) {
        category = cat;
        break;
      }
    }

    // 4. Build human-readable description
    const description = buildDescription(text, amount, type);

    // 5. Detect cashback / reward partner (Vibe Check)
    let hasSavings = false;
    let savingsDetail = null;
    if (type === 'outflow' && amount > 0) {
      const matchedPartner = REWARD_KEYWORDS.find(kw => lower.includes(kw));
      if (matchedPartner) {
        hasSavings = true;
        const cashbackPercent = 5;
        const cashbackAmount  = Math.round(amount * cashbackPercent / 100);
        const rewardPoints    = Math.round(amount / 50) * 2; // 2 pts per ₹50
        const partnerName     = matchedPartner.charAt(0).toUpperCase() + matchedPartner.slice(1);
        savingsDetail = {
          cashbackAmount,
          rewardPoints,
          partnerName,
          cashbackPercent
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

  /**
   * Creates a human-readable description from the raw text.
   */
  function buildDescription(raw, amount, type) {
    const amtStr = formatCurrency(amount);

    // Try to extract merchant / person name
    // Patterns: "to <Name>", "from <Name>", "for <Purpose>"
    let target = '';
    const toMatch   = raw.match(/(?:to|at)\s+(.+?)(?:\s+(?:via|using|through|on|for|$))/i);
    const fromMatch = raw.match(/(?:from)\s+(.+?)(?:\s+(?:via|using|through|on|as|for|$))/i);
    const forMatch  = raw.match(/(?:for)\s+(.+?)(?:\s+(?:via|using|through|on|$))/i);

    if (type === 'outflow') {
      target = toMatch ? toMatch[1].trim() : (forMatch ? forMatch[1].trim() : '');
      if (target) return `Paid ${amtStr} to ${target}`;
      return `Paid ${amtStr}`;
    } else {
      target = fromMatch ? fromMatch[1].trim() : '';
      if (target) return `Received ${amtStr} from ${target}`;
      return `Received ${amtStr}`;
    }
  }

  // ───────────────────────────────────────────────────────────
  //  CUMULATIVE METRIC REDUCER
  // ───────────────────────────────────────────────────────────

  function computeMetrics() {
    let totalIncome  = 0;
    let totalExpense = 0;
    const catTotals  = {};
    CATEGORIES.forEach(c => catTotals[c] = 0);

    transactions.forEach(txn => {
      if (txn.type === 'inflow') {
        totalIncome += txn.amount;
      } else {
        totalExpense += txn.amount;
      }
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

    totalIncomeEl.textContent  = formatCurrency(m.totalIncome);
    totalExpenseEl.textContent = formatCurrency(m.totalExpense);
    totalBalanceEl.textContent = (m.balance >= 0 ? '' : '- ') + formatCurrency(Math.abs(m.balance));

    // Category amounts & progress bars
    const maxCat = Math.max(...Object.values(m.catTotals), 1);

    const slugMap = {
      'Food & Dining': 'food',
      'Travel':        'travel',
      'Salary':        'salary',
      'Miscellaneous': 'misc'
    };

    CATEGORIES.forEach(cat => {
      const slug = slugMap[cat];
      const amountEl = document.getElementById(`cat-amount-${slug}`);
      const fillEl   = document.getElementById(`pf-${slug}`);
      if (amountEl) amountEl.textContent = formatCurrency(m.catTotals[cat]);
      if (fillEl)   fillEl.style.width   = Math.min((m.catTotals[cat] / maxCat) * 100, 100) + '%';
    });
  }

  function renderTransactionList() {
    // Keep only transaction cards, remove stale ones
    txnList.innerHTML = '';

    if (transactions.length === 0) {
      txnList.innerHTML = `
        <div class="empty-state" id="empty-state">
          <div class="empty-icon">🏦</div>
          <p>No transactions yet. Paste a UPI alert above or click a sample to get started.</p>
        </div>`;
      return;
    }

    // Render newest-first
    const sorted = [...transactions].reverse();
    sorted.forEach((txn, idx) => {
      const card = createTxnCard(txn, idx);
      txnList.appendChild(card);
    });
  }

  function createTxnCard(txn, idx) {
    const card = document.createElement('div');
    card.className = 'txn-card';
    card.id = `txn-${txn.id}`;
    card.style.animationDelay = `${idx * 0.04}s`;

    const isOut = txn.type === 'outflow';
    const sign  = isOut ? '−' : '+';
    const cls   = isOut ? 'outflow' : 'inflow';
    const icon  = isOut ? '↗' : '↙';

    // Build category <select>
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
              <select class="cat-select" data-txn-id="${txn.id}" aria-label="Category selector for transaction ${txn.id}">
                ${optionsHtml}
              </select>
            </div>
          </div>
        </div>
        <div class="txn-right">
          <span class="txn-amount ${cls}">${sign} ${formatCurrency(txn.amount)}</span>
          <button class="btn-delete" data-txn-id="${txn.id}" title="Delete transaction" aria-label="Delete transaction ${txn.id}">✕</button>
        </div>
      </div>
      ${savingsHtml}`;

    // Event: category change
    const select = card.querySelector('.cat-select');
    select.addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.txnId, 10);
      const txnObj = transactions.find(t => t.id === id);
      if (txnObj) {
        txnObj.category = e.target.value;
        renderMetrics(); // Re-compute metrics only
      }
    });

    // Event: delete
    const delBtn = card.querySelector('.btn-delete');
    delBtn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.txnId, 10);
      transactions = transactions.filter(t => t.id !== id);
      renderAll();
    });

    return card;
  }

  // ───────────────────────────────────────────────────────────
  //  EVENT HANDLERS
  // ───────────────────────────────────────────────────────────

  function addTransaction(rawText) {
    if (!rawText || !rawText.trim()) return;
    const txn = parseTransaction(rawText);
    if (txn.amount === 0) {
      // Still add it, but flag the amount issue visually
      txn.description = txn.type === 'outflow'
        ? `Paid ₹0 (could not parse amount)`
        : `Received ₹0 (could not parse amount)`;
    }
    transactions.push(txn);
    renderAll();
    txnInput.value = '';
    txnInput.focus();
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
    btn.textContent = msg.length > 45 ? msg.slice(0, 42) + '…' : msg;
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
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Seed with a few transactions on load ──────────────────
  const SEED = [
    'Received Rs. 45,000 from Acme Corp Salary',
    'Paid Rs. 250 to Zomato via UPI',
    'Sent Rs. 350 to Uber using UPI',
    'Paid Rs. 999 to Swiggy via Cred Cashback',
    'Rs. 500 received from Ravi Kumar via GPay'
  ];
  SEED.forEach(msg => {
    const txn = parseTransaction(msg);
    transactions.push(txn);
  });
  renderAll();

})();
