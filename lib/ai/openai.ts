/**
 * OpenAI client - server-side only
 * Uses environment variable OPENAI_API_KEY for authentication
 */

import OpenAI from "openai";

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.trim() === "") {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env or .env.local in the project root, then restart the dev server."
    );
  }
  return key;
}

let clientInstance: OpenAI | null = null;

/**
 * Get a singleton OpenAI client instance.
 * Throws if OPENAI_API_KEY is not configured.
 */
export function getOpenAIClient(): OpenAI {
  if (clientInstance) {
    return clientInstance;
  }
  clientInstance = new OpenAI({
    apiKey: getApiKey(),
  });
  return clientInstance;
}

/**
 * Check if OpenAI is configured (API key present).
 * Use this for graceful degradation when key is optional.
 */
export function isOpenAIConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return !!key && key.trim() !== "";
}
