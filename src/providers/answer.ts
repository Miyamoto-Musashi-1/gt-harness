export type Answer =
  { ok: true; text: string } | { ok: false; message: string };

export type AnswerOptions = {
  onText?: (text: string) => void;
  signal?: AbortSignal;
};

export type AnswerPrompt = (
  prompt: string,
  options: AnswerOptions,
) => Promise<Answer>;
