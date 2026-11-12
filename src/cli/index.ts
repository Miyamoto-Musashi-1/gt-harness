#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { answerWithOpenAI } from '../providers/openai.js';
import { runCli } from './run.js';

// Both src/cli and dist/cli are two levels below the package manifest.
const manifest = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string };
const controller = new AbortController();
const cancel = () => controller.abort();
process.on('SIGINT', cancel);
try {
  const result = await runCli(
    process.argv.slice(2),
    manifest.version,
    (prompt, options) =>
      answerWithOpenAI(
        prompt,
        {
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL,
        },
        options,
      ),
    {
      signal: controller.signal,
      onText: (text) => {
        process.stdout.write(text);
      },
    },
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
} finally {
  process.off('SIGINT', cancel);
}
