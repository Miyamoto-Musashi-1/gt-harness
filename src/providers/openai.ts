import OpenAI from 'openai';
import type { Answer, AnswerOptions } from './answer.js';

export async function answerWithOpenAI(
  prompt: string,
  config: { apiKey: string | undefined; model: string | undefined },
  options: AnswerOptions = {},
): Promise<Answer> {
  if (options.signal?.aborted) {
    return { ok: false, message: 'Request cancelled.' };
  }
  const apiKey = config.apiKey?.trim();
  const model = config.model?.trim();
  if (!apiKey) {
    return { ok: false, message: 'Set OPENAI_API_KEY before running ask.' };
  }
  if (!model) {
    return { ok: false, message: 'Set OPENAI_MODEL before running ask.' };
  }

  const deadline = AbortSignal.timeout(60_000);
  const signal = options.signal
    ? AbortSignal.any([options.signal, deadline])
    : deadline;
  try {
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.openai.com/v1',
      timeout: 60_000,
      maxRetries: 0,
      logLevel: 'off',
    });
    const stream = await client.responses.create(
      {
        model,
        input: prompt,
        store: false,
        max_output_tokens: 2048,
        stream: true,
      },
      { signal },
    );
    let text = '';
    let completed = false;
    try {
      for await (const event of stream) {
        signal.throwIfAborted();
        if (event.type === 'response.output_text.delta') {
          text += event.delta;
          options.onText?.(event.delta);
        } else if (event.type === 'response.completed') {
          completed = true;
          break;
        } else if (
          event.type === 'response.failed' ||
          event.type === 'response.incomplete' ||
          event.type === 'error'
        ) {
          break;
        }
      }
      signal.throwIfAborted();
      if (!completed) {
        return { ok: false, message: 'OpenAI did not complete the response.' };
      }
      if (!text.trim()) {
        return { ok: false, message: 'OpenAI returned no text answer.' };
      }
      return { ok: true, text };
    } finally {
      stream.controller.abort();
    }
  } catch (error) {
    if (options.signal?.aborted) {
      return { ok: false, message: 'Request cancelled.' };
    }
    if (signal.aborted) {
      return { ok: false, message: 'The OpenAI request timed out.' };
    }
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
