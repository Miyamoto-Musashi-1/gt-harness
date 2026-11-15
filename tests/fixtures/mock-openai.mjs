import { clearInterval, setInterval } from 'node:timers';

const event = (value) =>
  new TextEncoder().encode(`data: ${JSON.stringify(value)}\n\n`);

// Imported only by the package smoke test's child process.
globalThis.fetch = async () => {
  let keepAlive;
  const body = new ReadableStream({
    start(stream) {
      stream.enqueue(
        event({ type: 'response.output_text.delta', delta: 'Hello' }),
      );
      if (process.env.GT_HARNESS_FIXTURE_MODE === 'cancel') {
        // A real HTTP connection also keeps Node alive while waiting for data.
        keepAlive = setInterval(() => {}, 1_000);
      } else {
        stream.enqueue(
          event({ type: 'response.output_text.delta', delta: ' world' }),
        );
        stream.enqueue(
          event({
            type: 'response.completed',
            response: { status: 'completed' },
          }),
        );
        stream.close();
      }
    },
    cancel() {
      clearInterval(keepAlive);
    },
  });
  return new Response(body, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
};
