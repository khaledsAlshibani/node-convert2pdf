import ora, { type Ora } from 'ora';

import { formatDuration } from '../utils/format.js';
import { theme } from './theme.js';
import { symbols } from './theme.js';

export type ProgressStage = {
  afterMs: number;
  text: string;
};

export type LiveSpinnerOptions = {
  title: string;
  detail?: () => string;
  stages?: ProgressStage[];
};

function getStageText(stages: ProgressStage[] | undefined, elapsedMs: number): string {
  if (!stages?.length) {
    return '';
  }

  let current = stages[0]?.text ?? '';
  for (const stage of stages) {
    if (elapsedMs >= stage.afterMs) {
      current = stage.text;
    }
  }

  return current;
}

function formatSpinnerText(
  options: LiveSpinnerOptions,
  elapsedMs: number,
): string {
  const elapsed = formatDuration(elapsedMs);
  const stage = getStageText(options.stages, elapsedMs);
  const detail = options.detail?.();
  const parts = [theme.primary(options.title), theme.dim(`(${elapsed})`)];

  if (stage) {
    parts.push(theme.dim('—'), theme.info(stage));
  }

  if (detail) {
    parts.push(theme.dim('·'), theme.dim(detail));
  }

  return parts.join(' ');
}

export function createSpinner(text: string): Ora {
  return ora({
    text: theme.primary(text),
    color: 'cyan',
  }).start();
}

export async function runWithLiveSpinner<T>(
  options: LiveSpinnerOptions,
  task: () => Promise<T>,
): Promise<{ result: T; spinner: Ora; elapsedMs: number }> {
  const startedAt = Date.now();
  const spinner = ora({
    text: formatSpinnerText(options, 0),
    color: 'cyan',
  }).start();

  const interval = setInterval(() => {
    spinner.text = formatSpinnerText(options, Date.now() - startedAt);
  }, 200);

  try {
    const result = await task();
    return { result, spinner, elapsedMs: Date.now() - startedAt };
  } finally {
    clearInterval(interval);
  }
}

export function succeedSpinner(spinner: Ora, text: string): void {
  spinner.succeed(`${symbols.success} ${theme.success(text)}`);
}

export function failSpinner(spinner: Ora, text: string): void {
  spinner.fail(`${symbols.error} ${theme.error(text)}`);
}

export function infoLine(text: string): void {
  console.log(`  ${theme.dim(text)}`);
}

export function stepLine(label: string, value: string): void {
  console.log(`  ${theme.dim(`${label}:`)} ${value}`);
}
