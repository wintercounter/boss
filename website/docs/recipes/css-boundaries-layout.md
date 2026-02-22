---
title: CSS Boundaries Layouts
---

Use boundary files to keep CSS scoped to app sections.

## Example structure

```
src/
  app/
    app.boss.css
    page.tsx
    admin/
      admin.boss.css
      page.tsx
  marketing/
    marketing.boss.css
    page.tsx
```

## Import boundaries

```tsx
// src/app/layout.tsx
import './app.boss.css'
```

```tsx
// src/app/admin/layout.tsx
import './admin.boss.css'
```

```tsx
// src/marketing/layout.tsx
import './marketing.boss.css'
```

## Tips

- Keep boundary files empty; Boss overwrites them.
- Use `css.boundaries.ignore` to skip build artifacts.
- Shared rules are hoisted to the nearest common ancestor boundary or `.bo$$/styles.css`.
