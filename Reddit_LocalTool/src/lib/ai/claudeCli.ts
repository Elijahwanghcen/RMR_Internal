import { execFile } from "child_process";
import os from "os";
import fs from "fs";
import { z } from "zod";

// Headless local Claude CLI — no API key. Prompt goes in on stdin; response
// envelope comes back as JSON on stdout. cwd is tmpdir so the CLI never picks
// up a project CLAUDE.md or asks for tool permissions.

const CLAUDE_BIN = process.env.CLAUDE_BIN ?? "claude";

export class AiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiError";
  }
}

export function claudeAvailable(): boolean {
  try {
    fs.accessSync(CLAUDE_BIN, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

// The dev server may have been launched from inside a Claude Code session, in
// which case CLAUDECODE / CLAUDE_CODE_* / CLAUDE_CONFIG_* leak into the child
// and confuse a *nested* `claude -p`. Strip them so the child runs as a clean,
// standalone headless invocation using the user's own login session.
function cleanEnv(): NodeJS.ProcessEnv {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(CLAUDECODE|CLAUDE_CODE|CLAUDE_CONFIG|CLAUDE_AGENT|ANTHROPIC_)/.test(k)) continue;
    out[k] = v;
  }
  return out as NodeJS.ProcessEnv;
}

export function runClaude(opts: {
  prompt: string;
  model?: string;
  timeoutMs?: number;
}): Promise<string> {
  const { prompt, model = "sonnet", timeoutMs = 120_000 } = opts;
  return new Promise((resolve, reject) => {
    const child = execFile(
      CLAUDE_BIN,
      ["-p", "--output-format", "json", "--model", model],
      {
        timeout: timeoutMs,
        maxBuffer: 16 * 1024 * 1024,
        cwd: os.tmpdir(),
        env: cleanEnv(),
      },
      (err, stdout, stderr) => {
        if (err) {
          const killed = (err as NodeJS.ErrnoException & { killed?: boolean }).killed;
          const detail = killed
            ? `timed out after ${timeoutMs}ms`
            : `${err.message} · stderr: ${stderr?.slice(0, 300) ?? ""} · stdout: ${stdout?.slice(0, 200) ?? ""}`;
          reject(new AiError(`claude CLI failed: ${detail}`));
          return;
        }
        try {
          const envelope = JSON.parse(stdout) as {
            is_error?: boolean;
            subtype?: string;
            result?: string;
          };
          if (envelope.is_error || typeof envelope.result !== "string") {
            reject(new AiError(`claude returned error (${envelope.subtype ?? "unknown"})`));
            return;
          }
          resolve(envelope.result);
        } catch {
          reject(new AiError(`claude output was not JSON: ${stdout.slice(0, 200)}`));
        }
      }
    );
    child.stdin?.write(prompt);
    child.stdin?.end();
  });
}

export function extractJson(text: string): unknown {
  // strip code fences, then balance-match the first {...}
  const cleaned = text.replace(/```(?:json)?/g, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) throw new AiError("no JSON object in response");
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === "{") depth++;
    else if (cleaned[i] === "}") {
      depth--;
      if (depth === 0) {
        return JSON.parse(cleaned.slice(start, i + 1));
      }
    }
  }
  throw new AiError("unbalanced JSON in response");
}

/**
 * Run claude, parse + zod-validate the JSON. One retry with the validation
 * error appended; then throws AiError.
 */
export async function runClaudeJson<T>(opts: {
  prompt: string;
  schema: z.ZodType<T>;
  model?: string;
  timeoutMs?: number;
}): Promise<T> {
  const attempt = async (prompt: string): Promise<T> => {
    const raw = await runClaude({ prompt, model: opts.model, timeoutMs: opts.timeoutMs });
    const parsed = opts.schema.safeParse(extractJson(raw));
    if (!parsed.success) {
      throw new AiError(
        `schema validation failed: ${parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")}`
      );
    }
    return parsed.data;
  };

  try {
    return await attempt(opts.prompt);
  } catch (err) {
    if (!(err instanceof AiError)) throw err;
    const retryPrompt = `${opts.prompt}\n\nYour previous response was invalid (${err.message}). Return ONLY the corrected JSON object, nothing else.`;
    return attempt(retryPrompt);
  }
}

// Small in-process queue: batch jobs run max 2 at a time so interactive calls
// aren't starved and the local CLI isn't hammered.
const queue: Array<() => void> = [];
let active = 0;
const MAX_PARALLEL = 2;

export function enqueue<T>(job: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = async () => {
      active++;
      try {
        resolve(await job());
      } catch (err) {
        reject(err);
      } finally {
        active--;
        queue.shift()?.();
      }
    };
    if (active < MAX_PARALLEL) run();
    else queue.push(run);
  });
}
