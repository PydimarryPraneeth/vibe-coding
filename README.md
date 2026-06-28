# 💎 Vibe Wealth — UPI Transaction Summary & Categorization

An automated money manager web application that mimics a digital banking statements page. Paste raw UPI/bank transaction alerts, and the app parses them, auto-categorizes spending, and visualizes your financial habits — all in real time.

![Dashboard Preview](https://img.shields.io/badge/Status-Live-brightgreen) ![HTML](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white) ![CSS](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

---

## 📌 Problem Statement

Build an automated money manager application that:
1. Parses **unstructured transaction alerts** (raw UPI/bank SMS messages).
2. **Auto-categorizes** transactions using keyword matching (e.g., "Zomato" → Food & Dining).
3. **Visualizes spending habits** with category-wise progress bars and summary metrics.
4. Detects **cashback/reward partner** keywords and injects simulated "Expected Savings" projections.

---

## ✨ Features

### Frontend UI & Interaction
| Feature | Description |
|---------|-------------|
| **Transaction Stream** | Chronological, scrollable timeline of parsed transactions. Each card shows a description, amount (color-coded), and an interactive category dropdown. |
| **Visual Analytics Block** | Four animated progress bars (Food & Dining, Travel, Salary, Miscellaneous) that expand in real time as transactions are added. |
| **Header Metrics** | Live-updating Income, Expenses, and Net Balance pills at the top of the dashboard. |
| **UPI Alert Simulator** | A text input area to paste raw SMS alerts, with one-click sample buttons for quick testing. |

### Backend Logic & State Management
| Feature | Description |
|---------|-------------|
| **Automated Keyword Tagging Parser** | Regex-based engine that extracts amounts, detects transaction direction (inflow/outflow), and auto-assigns categories via merchant keyword matching. |
| **Cumulative Metric Reducer** | Aggregates all transactions, isolates income from expenses, computes per-category totals, and updates the UI in real time. |
| **Expected Savings (Vibe Check)** | Outbound transactions mentioning "Cashback" or reward partners (Cred, Amazon Pay, HDFC, etc.) trigger a green sub-metric row showing projected cashback and reward points. |

---

## 🗂️ Project Structure

```
vibe-wealth/
├── index.html      # Application shell — semantic HTML5 structure
├── style.css       # Glassmorphic dark design system & animations
├── app.js          # Parsing engine, state management, UI rendering
└── README.md       # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, Safari)
- (Optional) Python 3 or any static file server for local hosting

### Run Locally

**Option 1 — Direct file open:**
Simply open `index.html` in your browser.

**Option 2 — Local server (recommended):**
```bash
# Using Python
cd vibe-wealth
python -m http.server 8080

# Then open http://localhost:8080 in your browser
```

No build step, no dependencies, no `npm install` — it just works.

---

## 🔍 How It Works

### 1. Parsing Pipeline

When a raw SMS like `"Paid Rs. 999 to Swiggy via Cred Cashback"` is entered:

```
Raw Text
  │
  ├─ Amount Extraction ──────► ₹999  (regex: Rs./INR/₹ followed by digits)
  │
  ├─ Direction Detection ────► Outflow  (keyword: "Paid")
  │
  ├─ Keyword Category Match ─► Food & Dining  (keyword: "Swiggy")
  │
  ├─ Cashback Detection ────► ✅ Triggered  (keyword: "Cred", "Cashback")
  │
  └─ Output ─────────────────► Transaction Object
```

### 2. Keyword → Category Mapping

| Category | Keywords |
|----------|----------|
| **Food & Dining** | Zomato, Swiggy, KFC, McDonalds, Dominos, Starbucks, Pizza Hut, Subway, etc. |
| **Travel** | Uber, Ola, Rapido, MakeMyTrip, Indigo, IRCTC, Metro, Petrol, etc. |
| **Salary** | Salary, Stipend, Bonus, Payout, Payroll, Freelance Payment, etc. |
| **Miscellaneous** | Everything else (default fallback) |

### 3. Cashback / Reward Partners

| Partner Keywords | Action |
|-----------------|--------|
| Cashback, Cred, HDFC, Amex, Amazon Pay, Supercard, Slice, OneCard, etc. | Green "Expected Savings" sub-row injected below the transaction card |

Savings calculation:
- **Cashback**: 5% of transaction amount
- **Reward Points**: 2 points per ₹50 spent

---

## 🎨 Design Details

- **Theme**: Premium glassmorphic dark mode
- **Fonts**: [Outfit](https://fonts.google.com/specimen/Outfit) (headings) + [Inter](https://fonts.google.com/specimen/Inter) (body)
- **Colors**: Deep indigo (#6C63FF), Emerald (#34D399), Amber (#F59E0B), Crimson (#EF4444)
- **Effects**: `backdrop-filter: blur()`, radial gradient mesh background, card slide-in animations, savings pulse glow
- **Responsive**: Fully responsive across desktop, tablet, and mobile viewports

---

## 🧪 Test Cases

| Input SMS | Expected Category | Type | Savings Row? |
|-----------|-------------------|------|--------------|
| `"Paid Rs. 250 to Zomato via UPI"` | Food & Dining | Outflow | ❌ |
| `"Received Rs. 45,000 from Acme Corp Salary"` | Salary | Inflow | ❌ |
| `"Sent Rs. 350 to Uber using UPI"` | Travel | Outflow | ❌ |
| `"Paid Rs. 999 to Swiggy via Cred Cashback"` | Food & Dining | Outflow | ✅ (Cred · 5% back) |
| `"Paid Rs. 500 to KFC via Amazon Pay"` | Food & Dining | Outflow | ✅ (Amazon Pay · 5% back) |
| `"Rs. 500 received from Ravi Kumar via GPay"` | Miscellaneous | Inflow | ❌ |

---

## 🛠️ Tech Stack

| Technology | Usage |
|------------|-------|
| **HTML5** | Semantic structure, SEO metadata |
| **CSS3** | Glassmorphism, CSS Grid/Flexbox, keyframe animations, custom properties |
| **Vanilla JavaScript** | State management, regex parsing, DOM manipulation, event handling |

No frameworks. No build tools. Pure web fundamentals.

---

## 📄 License

This project is open source and available for educational purposes.

---

<p align="center">
  Built with 💎 by Vibe Coding
</p>
