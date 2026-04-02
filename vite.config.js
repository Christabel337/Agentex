import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// ── shared helpers ─────────────────────────────────────────────────────────────
async function groqCall(apiKey, system, messages, max_tokens = 1000) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        ...(messages || []),
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Groq error");
  return data.choices[0].message.content;
}

async function verifyPayment(txHash, expectedDestination, expectedAmount) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(
        `https://horizon-testnet.stellar.org/transactions/${txHash}/operations`
      );
      if (!res.ok) throw new Error("TX not indexed yet");
      const data = await res.json();
      const ops  = data._embedded?.records || [];
      const ok   = ops.find(op =>
        op.type === "payment" &&
        op.to === expectedDestination &&
        parseFloat(op.amount) >= parseFloat(expectedAmount)
      );
      if (ok) return true;
      throw new Error("No matching payment found");
    } catch (err) {
      if (attempt === 5) throw new Error(`Payment verification failed: ${err.message}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
    req.on("error", reject);
  });
}

function sendJSON(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// ── vite config ────────────────────────────────────────────────────────────────
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      {
        name: "api-proxy",
        configureServer(server) {

          // /api/claude — manager planning calls
          server.middlewares.use("/api/claude", async (req, res) => {
            if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }
            try {
              const body   = await readBody(req);
              const apiKey = env.GROQ_API_KEY;
              if (!apiKey) throw new Error("GROQ_API_KEY missing from .env file");
              const text = await groqCall(apiKey, body.system, body.messages, body.max_tokens);
              sendJSON(res, 200, { content: [{ text }] });
            } catch (err) {
              sendJSON(res, 500, { error: { message: err.message } });
            }
          });

          // /api/agents — x402 payment-gated agent endpoints
          server.middlewares.use("/api/agents", async (req, res) => {
            if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }
            try {
              const body           = await readBody(req);
              const paymentHash    = req.headers["x-payment-hash"];
              const { agentId, task, agentPublicKey, system, price } = body;
              const requiredAmount = String(parseFloat(price) || 1);
              const apiKey         = env.GROQ_API_KEY;

              if (!apiKey)         throw new Error("GROQ_API_KEY missing from .env file");
              if (!agentPublicKey) throw new Error("agentPublicKey is required");
              if (!task)           throw new Error("task is required");

              // No payment hash → 402
              if (!paymentHash) {
                sendJSON(res, 402, {
                  x402:         true,
                  agentId,
                  amount:       requiredAmount,
                  asset:        "XLM",
                  network:      "Stellar Testnet",
                  destination:  agentPublicKey,
                  description:  `Payment required to unlock ${agentId} agent`,
                  instructions: "Make a Stellar testnet payment, then retry with X-Payment-Hash header",
                });
                return;
              }

              // Payment hash present → verify on Horizon → run task
              await verifyPayment(paymentHash, agentPublicKey, requiredAmount);
              const agentSystem = system || "You are a helpful AI agent. Complete the given task thoroughly.";
              const result = await groqCall(apiKey, agentSystem, [{ role: "user", content: task }]);
              sendJSON(res, 200, { result });
            } catch (err) {
              sendJSON(res, 402, { error: { message: err.message } });
            }
          });

        },
      },
    ],
    define: {
      global: "globalThis",
    },
  };
});
