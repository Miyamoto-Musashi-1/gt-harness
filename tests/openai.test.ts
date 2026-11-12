import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { answerWithOpenAI } from '../src/providers/openai.js';

const config = { apiKey: 'test-key', model: 'test-model' };
const transport = vi.fn<typeof fetch>();

beforeEach(() => {
  transport.mockReset();
  vi.stubGlobal('fetch', transport);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function events(...values: unknown[]): Response {
  return new Response(
    values.map((value) => `data: ${JSON.stringify(value)}\n\n`).join(''),
    {
      headers: { 'Content-Type': 'text/event-stream' },
    },
  );
}

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
    events(
      { type: 'response.created' },
      { type: 'response.output_text.delta', delta: 'Hel' },
      { type: 'response.output_text.delta', delta: 'lo.' },
      { type: 'response.completed', response: { status: 'completed' } },
    ),
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
    stream: true,
  });
});

it.each([
  { status: 'incomplete', message: 'OpenAI did not complete the response.' },
  { status: 'completed', message: 'OpenAI returned no text answer.' },
])(
  'handles a $status response without usable text',
  async ({ status, message }) => {
    transport.mockResolvedValueOnce(
      events({ type: `response.${status}`, response: { status } }),
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

it('requires a completion event even after receiving text', async () => {
  transport.mockResolvedValueOnce(
    events({ type: 'response.output_text.delta', delta: 'Partial' }),
  );
  const onText = vi.fn();
  expect(await answerWithOpenAI('prompt', config, { onText })).toEqual({
    ok: false,
    message: 'OpenAI did not complete the response.',
  });
  expect(onText).toHaveBeenCalledExactlyOnceWith('Partial');
});

it('cancels before sending a request when the signal is already aborted', async () => {
  expect(
    await answerWithOpenAI('prompt', config, { signal: AbortSignal.abort() }),
  ).toEqual({
    ok: false,
    message: 'Request cancelled.',
  });
  expect(transport).not.toHaveBeenCalled();
});

it.each(['user', 'deadline'])(
  'aborts a stalled stream after %s cancellation',
  async (source) => {
    const controller = new AbortController();
    const cancelBody = vi.fn();
    if (source === 'deadline') {
      vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    }
    transport.mockResolvedValueOnce(
      new Response(
        new ReadableStream({
          start(stream) {
            stream.enqueue(
              new TextEncoder().encode(
                'data: {"type":"response.output_text.delta","delta":"Partial"}\n\n',
              ),
            );
          },
          cancel: cancelBody,
        }),
        { headers: { 'Content-Type': 'text/event-stream' } },
      ),
    );

    const result = await answerWithOpenAI('prompt', config, {
      ...(source === 'user' ? { signal: controller.signal } : {}),
      onText: () => controller.abort(),
    });
    expect(result).toEqual({
      ok: false,
      message:
        source === 'user'
          ? 'Request cancelled.'
          : 'The OpenAI request timed out.',
    });
    expect(cancelBody).toHaveBeenCalledTimes(1);
  },
);
