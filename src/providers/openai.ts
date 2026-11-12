import OpenAI from 'openai';
import type { Answer } from './answer.js';

export async function answerWithOpenAI(
  prompt: string,
  config: { apiKey: string | undefined; model: string | undefined },
): Promise<Answer> {
  const apiKey = config.apiKey?.trim();
  const model = config.model?.trim();
  if (!apiKey) {
    return { ok: false, message: 'Set OPENAI_API_KEY before running ask.' };
  }
  if (!model) {
    return { ok: false, message: 'Set OPENAI_MODEL before running ask.' };
  }

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.openai.com/v1',
      timeout: 60_000,
      maxRetries: 0,
      logLevel: 'off',
    });
    const response = await client.responses.create({
      model,
      input: prompt,
      store: false,
      max_output_tokens: 2048,
    });

    if (response.status !== 'completed') {
      return { ok: false, message: 'OpenAI did not complete the response.' };
    }
    if (!response.output_text?.trim()) {
      return { ok: false, message: 'OpenAI returned no text answer.' };
    }
    return { ok: true, text: response.output_text };
  } catch (error) {
    return { ok: false, message: describeFailure(error) };
  }
}

function describeFailure(error: unknown): string {
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return 'The OpenAI request timed out.';
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return 'Could not connect to OpenAI. Check your network connection.';
  }
  if (error instanceof OpenAI.APIError) {
    switch (error.status) {
      case 401:
        return 'OpenAI rejected the credentials. Check OPENAI_API_KEY.';
      case 403:
      case 404:
        return 'OpenAI could not access the model. Check OPENAI_MODEL and project permissions.';
      case 429:
        return 'OpenAI rejected the request due to a rate limit or quota. Check your usage limits.';
    }
  }
  return 'The OpenAI request failed.';
}
