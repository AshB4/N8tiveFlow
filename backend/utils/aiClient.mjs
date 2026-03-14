const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function resolveAiConfig(overrides = {}) {
  const provider = String(
    overrides.provider || process.env.POSTPUNK_AI_PROVIDER || "ollama",
  ).toLowerCase();

  if (provider === "openai") {
    return {
      provider,
      model:
        overrides.model ||
        process.env.POSTPUNK_OPENAI_MODEL ||
        process.env.OPENAI_MODEL ||
        "gpt-4o-mini",
      baseUrl:
        overrides.baseUrl ||
        process.env.POSTPUNK_OPENAI_BASE_URL ||
        process.env.OPENAI_BASE_URL ||
        DEFAULT_OPENAI_BASE_URL,
      apiKey:
        overrides.apiKey ||
        process.env.POSTPUNK_OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY ||
        "",
    };
  }

  if (provider === "ollama") {
    return {
      provider,
      model:
        overrides.model ||
        process.env.POSTPUNK_OLLAMA_MODEL ||
        process.env.OLLAMA_MODEL ||
        "llama3.1:8b",
      baseUrl:
        overrides.baseUrl ||
        process.env.POSTPUNK_OLLAMA_BASE_URL ||
        process.env.OLLAMA_HOST ||
        DEFAULT_OLLAMA_BASE_URL,
      apiKey: "",
    };
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

async function callOpenAI(config, prompt) {
  const apiKey = config.apiKey || requireEnv("OPENAI_API_KEY");
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a structured SEO assistant. Return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

async function callOllama(config, prompt) {
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      prompt,
      stream: false,
      format: "json",
      options: {
        temperature: 0.4,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data?.response || "";
}

export async function generateStructuredText(prompt, overrides = {}) {
  const config = resolveAiConfig(overrides);
  if (config.provider === "openai") {
    return callOpenAI(config, prompt);
  }
  return callOllama(config, prompt);
}
