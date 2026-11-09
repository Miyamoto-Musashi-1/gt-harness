export type Answer =
  { ok: true; text: string } | { ok: false; message: string };

export type AnswerPrompt = (prompt: string) => Promise<Answer>;
