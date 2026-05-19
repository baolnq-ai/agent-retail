import { ConsoleLogger, type LogLevel } from '@nestjs/common';

export class JsonLogger extends ConsoleLogger {
  protected printMessages(messages: unknown[], context = '', logLevel: LogLevel = 'log'): void {
    for (const message of messages) {
      process.stdout.write(`${JSON.stringify({
        timestamp: new Date().toISOString(),
        level: logLevel,
        service: 'api',
        context,
        message: formatLogMessage(message),
      })}\n`);
    }
  }
}

function formatLogMessage(message: unknown): string {
  if (typeof message === 'string') return message;
  if (message instanceof Error) return message.stack ?? message.message;
  try {
    return JSON.stringify(message, Object.getOwnPropertyNames(message));
  } catch {
    return String(message);
  }
}
