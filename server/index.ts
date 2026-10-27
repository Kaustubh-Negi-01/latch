import { createApp } from './app';
import { closeBrowser } from './runner';

const port = Number(process.env.PORT || 4318);
const app = await createApp({ port });
await app.listen({ port, host: '0.0.0.0' });
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => { await app.close(); await closeBrowser(); process.exit(0); });
}
