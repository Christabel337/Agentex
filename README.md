# Agent Marketplace 🤖💸

> A multi-agent AI system where agents don't just use tools — they **hire other agents and pay them** to complete tasks, with every payment settled on the Stellar blockchain.

**Live Demo →** [agent-marketplace.vercel.app](https://agent-marketplace.vercel.app)

---

## 💡 The Idea

Most AI agent systems have one agent doing everything. That doesn't scale, and it doesn't reflect how real economies work.

I wanted to build something closer to how real businesses operate: a **Manager Agent** that breaks down a task, finds the right specialists, pays them for their work, and combines everything into a final answer.

The twist? The payments aren't simulated. Every transaction hits the **Stellar testnet** and is verifiable on-chain. And unlike most agent demos, anyone can register their own agent into the marketplace — define a skill, set a price, and start earning XLM.

---

## 🧠 How It Works

```
User types a task
       ↓
Manager Agent (Claude)
  → Reads all registered agents and their skills
  → Decomposes task into tailored subtasks for each agent
       ↓
For each agent (in sequence):
  1. Manager sends XLM payment via Stellar SDK
  2. TX confirmed on Stellar testnet blockchain
  3. Agent executes task using Claude API
  4. Output passed to next agent as context
       ↓
Results compiled — every agent's output viewable in tabs
Earnings logged to on-chain leaderboard
```

---

## 🏗 Three Views

### ◈ Marketplace
The main workspace. Shows all available agents with their wallet addresses, prices, and live status. You fund all wallets with one click (via Stellar Friendbot), enter a task, and watch the network coordinate in real time. Every payment appears in the Stellar Ledger panel with a clickable link to `stellar.expert`.

### + Registry
The open agent economy. Anyone can register a new specialist agent by providing a name, skill description, and price. The app generates a fresh Stellar keypair, funds it via Friendbot, and adds it to the marketplace. Custom agents immediately participate in future tasks — the Manager reads all registered agents dynamically and tailors instructions to each one's skill.

### ↑ Leaderboard
A persistent earnings table showing cumulative XLM earned by every agent across all tasks run in the app. Rankings, task counts, and average earnings per task are stored in localStorage and survive page refreshes. This makes the app feel like a real, living economy rather than a one-time demo.

---

## 🔗 Real Blockchain Payments

When you click **Generate + Fund Wallets**, the app:
1. Generates fresh Stellar keypairs for the manager and every registered agent
2. Calls [Stellar Friendbot](https://friendbot.stellar.org) in parallel to fund all wallets with testnet XLM
3. Every subsequent payment uses the real `@stellar/stellar-sdk` to build, sign, and submit transactions to Horizon testnet

Every TX hash in the UI links to [stellar.expert](https://stellar.expert/explorer/testnet) for on-chain verification.

---

## 🤖 Dynamic Agent Selection

The Manager Agent doesn't use hardcoded roles. At runtime, it:
1. Reads the full list of registered agents with their skill descriptions
2. Calls Claude to assign a tailored instruction to every agent
3. Executes agents sequentially — each agent receives all previous agents' outputs as context

This means adding a new agent to the registry immediately changes how future tasks are decomposed and executed.

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite |
| AI | Claude API (`claude-sonnet`) |
| Blockchain | Stellar SDK + Horizon testnet |
| Persistence | localStorage (leaderboard + agent registry) |
| Deployment | Vercel |

---

## 🚀 Running Locally

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/agent-marketplace.git
cd agent-marketplace

# 2. Install
npm install

# 3. Run
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

> **Note:** The app calls the Anthropic API directly from the browser. For production deployments, route API calls through a backend proxy to protect your key.

---

## 📁 Project Structure

```
agent-marketplace/
├── src/
│   ├── App.jsx        # All agent logic, Stellar payments, registry, leaderboard, UI
│   └── main.jsx       # React entry point + Buffer polyfill for Stellar SDK
├── public/
│   └── favicon.svg
├── index.html
├── vite.config.js     # Vite config with globalThis + buffer polyfill for Stellar
├── vercel.json        # SPA rewrite rules for Vercel
└── package.json
```

---

## 🔮 What's Next

- [ ] Agent reputation scores based on output quality ratings
- [ ] Multi-round tasks where agents can hire sub-agents recursively
- [ ] Stellar mainnet support with real micropayments
- [ ] Public agent registry — submit an agent anyone can hire
- [ ] Telegram bot interface to trigger the network by chat
- [ ] Agent escrow — payment held until task is verified complete

---

## 🙏 Built With

- [Anthropic Claude API](https://anthropic.com)
- [Stellar SDK](https://stellar.org)
- [Stellar Expert Explorer](https://stellar.expert)
- [Vercel](https://vercel.com)

---

*Built for the Stellar Hackathon · 2026*
