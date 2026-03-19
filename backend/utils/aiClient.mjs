const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_OPENAI_TIMEOUT_MS = 90_000;
const DEFAULT_OLLAMA_TIMEOUT_MS = 120_000;

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
      timeoutMs:
        overrides.timeoutMs ||
        Number(process.env.POSTPUNK_OPENAI_TIMEOUT_MS || process.env.OPENAI_TIMEOUT_MS) ||
        DEFAULT_OPENAI_TIMEOUT_MS,
    };
  }

  if (provider === "ollama") {
    return {
      provider,
      model:
        overrides.model ||
        process.env.POSTPUNK_OLLAMA_MODEL ||
        process.env.OLLAMA_MODEL ||
        "stable-code:3b-code-q4_0",
      baseUrl:
        overrides.baseUrl ||
        process.env.POSTPUNK_OLLAMA_BASE_URL ||
        process.env.OLLAMA_HOST ||
        DEFAULT_OLLAMA_BASE_URL,
      apiKey: "",
      timeoutMs:
        overrides.timeoutMs ||
        Number(process.env.POSTPUNK_OLLAMA_TIMEOUT_MS || process.env.OLLAMA_TIMEOUT_MS) ||
        DEFAULT_OLLAMA_TIMEOUT_MS,
    };
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

async function callOpenAI(config, prompt) {
  const apiKey = config.apiKey || requireEnv("OPENAI_API_KEY");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs || DEFAULT_OPENAI_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
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
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        `OpenAI took too long to respond (${config.timeoutMs}ms). Try a shorter prompt, a smaller output, or increase POSTPUNK_OPENAI_TIMEOUT_MS.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

async function callOllama(config, prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs || DEFAULT_OLLAMA_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/api/generate`, {
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
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        `Ollama took too long to respond (${config.timeoutMs}ms). Try a lighter model, a shorter prompt, or OpenAI.`,
      );
    }
    const timeoutCode =
      error?.cause?.code ||
      error?.code ||
      "";
    if (timeoutCode === "UND_ERR_HEADERS_TIMEOUT") {
      throw new Error(
        `Ollama timed out waiting for response headers. Try a lighter model, a shorter prompt, or increase POSTPUNK_OLLAMA_TIMEOUT_MS.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

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
