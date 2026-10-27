// `npm start` serves the built client and API on one port in every shell.
process.env.NODE_ENV ??= 'production';
await import('./index');
export {};
