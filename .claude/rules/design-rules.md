# Design System Rules

## Three Core Principles

**1. User-friendly** — Every interaction has visible feedback. Touch targets minimum 44px. Empty states always guide users toward action. Error messages are specific and placed inline. Loading states use Skeleton matching final layout shape.

**2. Minimalism** — Color only carries meaning, never decoration. Use whitespace to establish hierarchy. Limit active colors per view. Prefer border elevation over shadow elevation on cards.

**3. Refinement** — Consistent spacing grid (8px base). Negative letter-spacing on headings. Inter font. Faster transitions than MUI default. Every design decision is intentional.

---

## Theme Configuration

Only these values are customized in `createTheme`. No `components` overrides.

```ts
createTheme({
  cssVariables: true,
  colorSchemes: { light: {...}, dark: {...} },
  typography: {
    fontFamily: '"Inter", -apple-system, sans-serif',
    fontSize: 14,          // base body size 14px, not 16px
    button: {
      textTransform: 'none',   // no uppercase buttons
      fontWeight: 500,
    },
    h1: { letterSpacing: '-0.03em' },
    h2: { letterSpacing: '-0.025em' },
    h3: { letterSpacing: '-0.02em' },
    h4: { letterSpacing: '-0.015em' },
    h5: { letterSpacing: '-0.01em' },
    h6: { letterSpacing: '-0.005em' },
  },
  shape: {
    borderRadius: 8,       // default 4px → 8px
  },
  transitions: {
    duration: {
      standard: 200,       // default 300ms → 200ms
      short: 150,
      entering: 200,
      leaving: 150,
    },
  },
  spacing: 8,              // 8px base grid
})
```

Everything else uses MUI defaults as-is.

---

## Color Rules

- All colors via `theme.palette.*` — never hardcode hex in components
- Dark mode styles via `theme.applyStyles('dark', {...})` — never check `palette.mode`
- Status: `error` = destructive actions, `warning` = caution, `success` = positive, `info` = neutral
- Background hierarchy (dark): `#09090b` default → `#141414` paper (defined once in theme config)
- Primary color is configurable — 4 presets (Zinc / Blue / Purple / Green) + custom

---

## Typography Rules

- Base size: **14px** (body1) — not 16px
- Headings: `fontWeight 600–700` + negative `letterSpacing`
- Minimum font size: **12px** in all UI. Exception: table column headers and overline labels may use 11px
- Never use `fontWeight` below 400

---

## Spacing Rules

- Always use `theme.spacing()` or MUI `sx` shorthand (`p`, `m`, `gap`) — never arbitrary pixel values
- 8px grid: `spacing(1)=8px`, `spacing(2)=16px`, `spacing(3)=24px`
- Card content: `p: 2.5` (20px)
- Form field gap: `spacing={2}` (Stack)
- Section gap: `spacing={3}` (Stack)
- Page padding: `p: 3` mobile → `p: 4` desktop

---

## Component Usage

**Buttons:**
- Primary action: `variant="contained"` — max one per section
- Secondary: `variant="outlined"`
- Tertiary / toolbar: `variant="text"`
- Danger: `color="error"`
- Loading: `disabled` + `startIcon={<CircularProgress size={16} />}`

**Forms:**
- Default: `size="small"`, `variant="outlined"` on all inputs
- Mobile: use default `size` to meet 44px touch target
- Validation: `mode: 'onBlur'` — not on every keystroke
- Exception: password confirmation and real-time fields may use `onChange`
- Error message: always via `helperText` prop, never floating toast

**Cards:**
- Use `elevation={1}` or `variant="outlined"` — pick one consistently per project
- No mixed elevation levels across the same page

**Tables:**
- Default `size="small"`
- Always wrap in `TableContainer` inside a `Paper` or `Card`
- Pagination required for > 20 rows

**Dialogs:**
- Always include accessible `DialogTitle`
- Actions right-aligned in `DialogActions`
- Destructive actions require confirmation dialog before execution

**Snackbar:**
- Position: bottom-right (`anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}`)
- Auto-hide: 5000ms success, 8000ms error
- Never use for form validation errors — use inline `helperText`

**Empty States:**
- Required elements: icon + title + description + action button (when applicable)
- Center with `py: 8`, icon `sx={{ fontSize: 48 }}` in muted color

**Skeleton:**
- Shape must match final content layout
- Container needs `aria-busy="true"` while loading

---

## Icons

Use **`@mui/icons-material`** only. Do not use any other icon library.

| Context | fontSize prop |
|---|---|
| Inline with body text | `small` (20px) |
| Buttons, nav items | `small` (20px) |
| Card header indicators | `medium` (24px) — default |
| Empty state | `sx={{ fontSize: 48 }}` |

```tsx
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

// In buttons
<Button startIcon={<AddIcon />}>Create</Button>

// Icon buttons always need aria-label
<IconButton aria-label="Delete item" size="small">
  <DeleteOutlineIcon fontSize="small" />
</IconButton>
```

**Standard icon mapping:**
- Delete → `DeleteOutlineIcon`
- Edit → `EditOutlinedIcon`
- Create → `AddIcon`
- Search → `SearchIcon`
- Row actions → `MoreHorizIcon`
- Loading → `CircularProgress`
- Close → `CloseIcon`
- Expand → `ExpandMoreIcon`
- Dark mode toggle → `DarkModeOutlinedIcon` / `LightModeOutlinedIcon`

Prefer **Outlined** variants over filled for lighter visual weight.

---

## Responsive Behavior

| Breakpoint | Sidebar | Layout |
|---|---|---|
| xs / sm (< 900px) | Temporary Drawer (overlay) | Single column |
| md (900–1199px) | Permanent Drawer, collapsed | 2 columns |
| lg+ (≥ 1200px) | Permanent Drawer, expanded | Full multi-column |

- KPI grid: `xs={12} sm={6} lg={3}`
- Forms: single column mobile, 2-column `md+`
- Dialog → consider `fullScreen` on xs

---

## Accessibility

1. Icon-only `IconButton` must have `aria-label`
2. Always provide `label` on form fields — never rely on placeholder alone
3. `Dialog` needs `aria-labelledby` pointing to `DialogTitle` id
4. Color is never the only status indicator — always pair with icon or text
5. Contrast: body text 4.5:1 min, UI components 3:1 min (WCAG AA)
6. All interactive elements reachable via Tab in logical DOM order
7. Minimum touch target 44×44px on mobile
8. Skeleton containers use `aria-busy="true"`

---

## What Claude Code Must Never Do

- ❌ Hardcode hex colors in components — always use `theme.palette.*`
- ❌ Use `palette.mode === 'dark'` checks — use `theme.applyStyles('dark', {...})`
- ❌ Use arbitrary spacing like `padding: '13px'` — use `theme.spacing()`
- ❌ Use font size below 12px (11px allowed only for table headers and overline)
- ❌ Show validation errors on every keystroke — use `mode: 'onBlur'`
- ❌ Leave empty states blank — always implement with icon + title + description
- ❌ Use any icon library other than `@mui/icons-material`
- ❌ Write `components` overrides in `createTheme` — use MUI defaults
- ❌ Mix `elevation` levels inconsistently on the same page
- ❌ Use Snackbar for form validation errors
