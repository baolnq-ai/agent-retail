export async function withTransientPrismaRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isTransientPrismaError(error)) throw error;
      await sleep(120 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Prisma operation failed');
}

function isTransientPrismaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  return (
    code === 'P1001'
    || code === 'P1002'
    || code === 'P1017'
    || /server has closed the connection|connection.*closed|connection terminated|econnreset|can't reach database|socket hang up/i.test(message)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
