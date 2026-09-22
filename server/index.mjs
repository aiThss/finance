import { createApp } from "./app.mjs";
const server = createApp().listen(
  Number(process.env.PORT) || 3000,
  "0.0.0.0",
  () => console.info("Túi Nhỏ server ready"),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
