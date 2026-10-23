const CPU_STARTUP_NOTICE = "INFO: Created TensorFlow Lite XNNPACK delegate for CPU.";
let activeInitializations = 0;
let restoreLogging: (() => void) | undefined;

/** WASM captures console.error as stderr during initialization, including INFO notices. */
export async function initializeMediaPipe<T>(initialize: () => Promise<T>): Promise<T> {
  if (activeInitializations === 0) {
    const originalError = console.error;
    const info = console.info.bind(console);
    const routedError: typeof console.error = (...args: unknown[]) => {
      if (args.length === 1 && args[0] === CPU_STARTUP_NOTICE) {
        info(CPU_STARTUP_NOTICE);
      } else {
        originalError.apply(console, args);
      }
    };
    console.error = routedError;
    restoreLogging = () => {
      if (console.error === routedError) console.error = originalError;
    };
  }
  activeInitializations += 1;
  try {
    return await initialize();
  } finally {
    activeInitializations -= 1;
    if (activeInitializations === 0) {
      restoreLogging?.();
      restoreLogging = undefined;
    }
  }
}
