import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('Warning: OPENAI_API_KEY environment variable is not set');
}

export const openai = apiKey
  ? new OpenAI({
      apiKey,
    })
  : (null as unknown as OpenAI); // Type assertion for development - will fail at runtime if used

/**
 * Check if OpenAI is properly configured
 */
export function isOpenAIConfigured(): boolean {
  return !!apiKey;
}

