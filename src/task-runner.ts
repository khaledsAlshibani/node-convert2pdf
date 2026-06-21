import type { ProgressStage } from './ui/progress.js';
import type { ProgressEvent, ProgressStep } from './types.js';

export type TaskContext = {
  silent: boolean;
  onProgress?: (event: ProgressEvent) => void;
};

function emitStart(
  emit: ((event: ProgressEvent) => void) | undefined,
  event: {
    step: ProgressStep;
    message: string;
    inputPath: string;
    inputSize?: number;
  },
): void {
  if (!emit) {
    return;
  }

  emit({
    type: 'start',
    step: event.step,
    message: event.message,
    inputPath: event.inputPath,
    ...(event.inputSize !== undefined ? { inputSize: event.inputSize } : {}),
  });
}

function getStageText(stages: ProgressStage[], elapsedMs: number): string {
  let current = stages[0]?.text ?? '';

  for (const stage of stages) {
    if (elapsedMs >= stage.afterMs) {
      current = stage.text;
    }
  }

  return current;
}

export async function runTaskWithProgress<T>(
  context: TaskContext,
  config: {
    step: ProgressStep;
    title: string;
    inputPath: string;
    inputSize?: number;
    stages: ProgressStage[];
    detail: () => string;
    runSpinner: (task: () => Promise<T>) => Promise<T>;
    onSuccess: (result: T, elapsedMs: number) => string;
  },
  task: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  const emit = context.onProgress;

  if (context.silent) {
    emitStart(emit, {
      step: config.step,
      message: config.title,
      inputPath: config.inputPath,
      ...(config.inputSize !== undefined ? { inputSize: config.inputSize } : {}),
    });

    const interval = emit
      ? setInterval(() => {
          const elapsedMs = Date.now() - startedAt;
          emit({
            type: 'stage',
            step: config.step,
            message: getStageText(config.stages, elapsedMs),
            elapsedMs,
            detail: config.detail(),
          });
        }, 200)
      : undefined;

    try {
      const result = await task();
      emit?.({
        type: 'complete',
        step: config.step,
        message: config.onSuccess(result, Date.now() - startedAt),
        elapsedMs: Date.now() - startedAt,
      });
      return result;
    } finally {
      if (interval) {
        clearInterval(interval);
      }
    }
  }

  const result = await config.runSpinner(task);
  emit?.({
    type: 'complete',
    step: config.step,
    message: config.onSuccess(result, Date.now() - startedAt),
    elapsedMs: Date.now() - startedAt,
  });
  return result;
}
