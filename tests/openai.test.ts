import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { answerWithOpenAI } from '../src/providers/openai.js';

const config = { apiKey: 'test-key', model: 'test-model' };
const transport = vi.fn<typeof fetch>();

beforeEach(() => {
  transport.mockReset();
  vi.stubGlobal('fetch', transport);
});

afterEach(() => vi.unstubAllGlobals());

it.each([
  { config: { ...config, apiKey: ' ' }, variable: 'OPENAI_API_KEY' },
  { config: { ...config, model: undefined }, variable: 'OPENAI_MODEL' },
])(
  'requires $variable before making a request',
  async ({ config, variable }) => {
    expect(await answerWithOpenAI('prompt', config)).toEqual({
      ok: false,
      message: `Set ${variable} before running ask.`,
    });
    expect(transport).not.toHaveBeenCalled();
  },
);

it('sends a bounded Responses API request and extracts the assistant text', async () => {
  transport.mockResolvedValueOnce(
    Response.json({
      object: 'response',
      status: 'completed',
      output: [
        { type: 'message', content: [{ type: 'output_text', text: 'Hello.' }] },
      ],
    }),
  );

  expect(await answerWithOpenAI('prompt', config)).toEqual({
    ok: true,
    text: 'Hello.',
  });
  expect(transport).toHaveBeenCalledTimes(1);
  const [url, request] = transport.mock.calls[0] ?? [];
  expect(String(url)).toBe('https://api.openai.com/v1/responses');
  expect(request?.method).toBe('POST');
  expect(JSON.parse(String(request?.body))).toEqual({
    model: 'test-model',
    input: 'prompt',
    store: false,
    max_output_tokens: 2048,
  });
});

it.each([
  { status: 'incomplete', message: 'OpenAI did not complete the response.' },
  { status: 'completed', message: 'OpenAI returned no text answer.' },
])(
  'handles a $status response without usable text',
  async ({ status, message }) => {
    transport.mockResolvedValueOnce(
      Response.json({ object: 'response', status, output: [] }),
    );

    expect(await answerWithOpenAI('prompt', config)).toEqual({
      ok: false,
      message,
    });
  },
);

it('reports rate limits without retries or exposing the provider error body', async () => {
  transport.mockResolvedValueOnce(
    Response.json(
      { error: { message: 'Provider details containing test-key' } },
      { status: 429 },
    ),
  );

  expect(await answerWithOpenAI('prompt', config)).toEqual({
    ok: false,
    message:
      'OpenAI rejected the request due to a rate limit or quota. Check your usage limits.',
  });
  expect(transport).toHaveBeenCalledTimes(1);
});
