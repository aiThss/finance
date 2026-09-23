# Túi Nhỏ design
The user's pinned ThreeUI-inspired lightweight dark visual direction is authoritative over generated alternatives. Operate mode: quick entry and financial legibility.
Near-black green-tinted surfaces, parchment text, soft sage action color. Be Vietnam Pro is self-hosted. Financial figures have tabular numerals. A quiet wallet-like balance surface leads into plain ledger rows; no chart on the dashboard. Dense screens use labels and dividers rather than nested cards.
Mobile first at 320–480px; fixed five-item bottom navigation, focused bottom sheets, 48px controls. Desktop has a narrow sidebar and a capped content width. Exact money remains visible as text. Light mode uses paper surfaces. Motion uses short page and sheet transitions and respects reduced motion.

## Readability and Android inset update — 2026-09-23
Body and inputs use 1rem (16px at default scale), supporting copy 0.875rem, navigation labels 0.75rem. Controls target 48px. Home prioritizes balance, monthly totals and recent entries. Main destinations are overview, transactions, wallets and more; budgets/reports/settings stay one level away, optional tools use disclosure. Entry shows six common/recent categories and collapses merchant/date/notes.
Route motion is a cancellable 90ms exit followed by a 220ms entrance; sheets enter in 260ms and dismiss in 160ms. Reduced-motion removes CSS movement and uses zero-duration dismissal. No loading delays or looping motion.
Android uses one SystemBars inset owner with viewport-fit=contain, reserving status/navigation/cutout and keyboard space natively before the React UI renders. Browser/PWA keeps viewport-fit=cover and CSS safe areas. The legacy status-bar plugin and full-screen keyboard resize override are removed.
