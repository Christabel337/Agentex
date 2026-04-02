export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: "GROQ_API_KEY not set in Vercel environment variables" } });
  }

  try {
    const { system, messages, max_tokens } = req.body;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: max_tokens || 1000,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          ...(messages || []),
        ],
      }),
    });

    const data = await groqRes.json();
    if (!groqRes.ok) {
      return res.status(groqRes.status).json({ error: { message: data.error?.message || "Groq API error" } });
    }

    const text = data.choices?.[0]?.message?.content || "";
    return res.status(200).json({ content: [{ text }] });
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
