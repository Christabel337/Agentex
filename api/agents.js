// x402 Payment Required — Agent endpoint
// Call 1 (no X-Payment-Hash header): returns 402 with payment details
// Call 2 (with X-Payment-Hash header): verifies payment on Stellar Horizon, runs AI task, returns result

const AGENT_SYSTEMS = {
  research: "You are a Research Agent. Thoroughly research the given topic and return comprehensive, well-organized findings in clear paragraphs. Be specific and factual.",
  data:     "You are a Data Analysis Agent. Take the provided research and structure it into clear comparisons, rankings, and bullet-point insights with specific data points.",
  summary:  "You are a Summary Agent. Synthesize all provided inputs into a polished, actionable final answer with headers and bullet points. Be genuinely useful.",
};

async function verifyPayment(txHash, expectedDestination, expectedAmount) {
  // Retry up to 5 times — Horizon can take a few seconds to index a new TX
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const opsRes = await fetch(
        `https://horizon-testnet.stellar.org/transactions/${txHash}/operations`
      );
      if (!opsRes.ok) throw new Error("TX not indexed yet");

      const opsData = await opsRes.json();
      const operations = opsData._embedded?.records || [];

      const validPayment = operations.find(op =>
        op.type === "payment" &&
        op.to === expectedDestination &&
        parseFloat(op.amount) >= parseFloat(expectedAmount)
      );

      if (validPayment) return true;
      throw new Error("No matching payment operation found");
    } catch (err) {
      if (attempt === 5) throw new Error(`Payment verification failed: ${err.message}`);
      await new Promise(r => setTimeout(r, 2000)); // wait 2s before retry
    }
  }
}

async function runTask(system, task) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1000,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: task },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Groq API error");
  return data.choices[0].message.content;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Payment-Hash");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  const { agentId, task, agentPublicKey, system, price } = req.body;
  const paymentHash    = req.headers["x-payment-hash"];
  const requiredAmount = String(parseFloat(price) || 1);
  const agentSystem    = AGENT_SYSTEMS[agentId] || system || "You are a helpful AI agent. Complete the given task thoroughly.";

  if (!agentPublicKey) return res.status(400).json({ error: { message: "agentPublicKey is required" } });
  if (!task)           return res.status(400).json({ error: { message: "task is required" } });

  // ── No payment hash → return 402 ──────────────────────────────────────────
  if (!paymentHash) {
    return res.status(402).json({
      x402:         true,
      agentId,
      amount:       requiredAmount,
      asset:        "XLM",
      network:      "Stellar Testnet",
      destination:  agentPublicKey,
      description:  `Payment required to unlock ${agentId} agent`,
      instructions: "Make a Stellar testnet payment, then retry with X-Payment-Hash header",
    });
  }

  // ── Payment hash provided → verify on Horizon → run task → return result ──
  try {
    await verifyPayment(paymentHash, agentPublicKey, requiredAmount);
    const result = await runTask(agentSystem, task);
    return res.status(200).json({ result });
  } catch (err) {
    return res.status(402).json({ error: { message: err.message } });
  }
}
