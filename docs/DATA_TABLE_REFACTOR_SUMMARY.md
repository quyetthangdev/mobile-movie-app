# DataTable Refactor Summary

## 1. What Was Removed and Why

### Removed: `components/ui/data-table.tsx` (old, ~600 lines)
- **Why:** Single monolithic file mixing UI and business logic (TanStack Table, sorting/filtering inline, `useSearchParams` from react-router-dom). Not mobile-first (HTML-like patterns). Duplicated responsibilities that belong in a hook and presentational components.

### Removed: `components/ui/utils/data-table.utils.ts`
- **Why:** Only used by the old DataTable (e.g. `timeChange` for date range). New architecture does not embed date-range logic in the table; screens handle filters and pass filtered data or use hook config.

### Removed: entire `components/data-table/` folder
- **Why:** Logic and UI were duplicated between `components/data-table/` and the old `components/ui/data-table.tsx`. Consolidated into a single source of truth under `components/ui/data-table/`.

### Not removed (kept)
- **`components/ui/table.tsx`** – Kept as generic table primitives (View-based). Not used by the new DataTable (new implementation uses its own header/row/cell). Can be used by other table UIs if needed.
- **`components/ui/dropdown-menu.tsx`** – Re-exports from dropdown; used by other features, not tied to the old DataTable.

---

## 2. New Folder Structure

```
components/ui/data-table/
  types.ts              # Column config, SortDirection, UseDataTableConfig, UseDataTableReturn, DataTableRef
  use-data-table.ts     # Headless hook: sort, filter, selection, pagination (no UI, no API, no store)
  data-table-context.tsx # React context for compound components
  data-table.tsx        # Root (controlled/uncontrolled), composes header + body
  data-table-header.tsx # Sticky header row, sort indicators
  data-table-row.tsx    # Single row (presentational)
  data-table-cell.tsx   # Single cell (presentational)
  data-table-body.tsx   # FlatList body (virtualization)
  data-table-toolbar.tsx   # Optional filter inputs
  data-table-pagination.tsx # Optional pagination controls
  data-table-empty.tsx  # Empty state
  data-table-loading.tsx # Loading state
  index.ts              # Public API + compound DataTable (Toolbar, Pagination, Empty, Loading)
```

---

## 3. Architecture

- **UI components:** Presentational only. They receive state and callbacks via context (or props). No sorting/filtering/API logic inside.
- **`useDataTable<T>`:** Holds all logic: 3-state sort (asc → desc → none), multi-column text filter (debounced 300ms), optional selection, optional client-side pagination. No global store, no API calls.
- **FlatList:** Used in `data-table-body.tsx` for virtualization; scales to 300–500+ rows.
- **Horizontal scroll:** One `ScrollView` horizontal wrapping header + body; `totalWidth` from context.
- **Column config:** Single shape: `{ key, title, sortable?, filterable?, width?, render? }`.

---

## 4. API (Ergonomic)

**Column example:**
```ts
{
  key: "name",
  title: "Name",
  sortable: true,
  filterable: true,
  width: 140,
  render?: (row) => ReactNode
}
```

**Uncontrolled usage:**
```tsx
<DataTable
  data={data}
  columns={columns}
  config={{ pagination: true, pageSize: 10, filterDebounceMs: 300 }}
  rowKey="id"
  onRowPress={(row) => {}}
  emptyComponent={<DataTable.Empty message="No data" />}
  loadingComponent={<DataTable.Loading />}
>
  <DataTable.Toolbar />
  <DataTable.Pagination />
</DataTable>
```

**Controlled (e.g. server-side):**
```tsx
const state = useDataTable(data, columns, { mode: 'server', serverRows, serverTotalRows, onSortChange, onFiltersChange, onPaginationChange })
<DataTable rows={state.rows} resolvedColumns={state.columns} sortKey={state.sortKey} ... />
```

**Hook:** `useDataTable(data, columns, config)` – same hook is used internally by uncontrolled DataTable or by the screen for controlled mode.

---

## 5. Performance Improvements

| Before | After |
|--------|--------|
| TanStack Table + DOM-like table | FlatList for body → only visible rows mounted |
| Inline sort/filter in screen or in one big component | Memoized derived state in `useDataTable` (useMemo for clientRows, resolvedColumns) |
| No keyExtractor / generic keys | Stable `keyExtractor` from `getRowId(row, index)` (rowKey or index) |
| Wrapper components and duplicate state | Single hook + context; no duplicate state |
| Debounce ad hoc or in screen | Centralized 300ms debounce in hook for filters |
| Re-renders from inline callbacks | useCallback for toggleSort, setFilter, renderItem, keyExtractor |

- **FlatList:** `removeClippedSubviews`, `maxToRenderPerBatch={20}`, `windowSize={11}`, `initialNumToRender={15}` to keep 300–500 rows smooth.
- **Minimal state in UI:** Header/row/cell only read from context and render; no local state for logic.

---

## 6. Example Usage in a Screen

See **`app/profile/loyalty-point.tsx`**: uses `DataTable` from `@/components/ui/data-table`, `useLoyaltyPointTransactionColumns()` for column defs, `config={{ pagination: true, pageSize: 10 }}`, `DataTable.Toolbar`, `DataTable.Pagination`, `DataTable.Empty`, `DataTable.Loading`, and `onRowPress` for detail dialog.

See **`app/data-table-example.tsx`**: uncontrolled and controlled examples with `useDataTable` and compound components.

---

## 7. Constraints Respected

- No global store for table state.
- No API calls inside DataTable or hook (data passed in; server mode uses callbacks).
- Mobile-first: View/ScrollView/FlatList/Pressable, NativeWind.
- Single, clear API: column config, optional pagination/filter/selection, ref (`reset`, `clearFilters`).
