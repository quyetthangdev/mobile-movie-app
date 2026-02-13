# DataTable – Kiến trúc & API

## Tổng quan

DataTable là hệ thống bảng dữ liệu cho React Native, thiết kế theo triết lý **shadcn**: headless + composable, tách bạch logic (hook) và UI (components).

## Cấu trúc thư mục (sau refactor)

```
components/ui/data-table/
  index.ts                 # Public API + compound DataTable (Toolbar, Pagination, Empty, Loading)
  types.ts                 # Shared TypeScript types
  use-data-table.ts        # Headless hook: sort, filter, selection, pagination (trong cùng folder)
  data-table-context.tsx   # React context cho compound components
  data-table.tsx           # Root component (controlled / uncontrolled)
  data-table-header.tsx    # Header row (sort)
  data-table-body.tsx      # FlatList body (virtualization)
  data-table-row.tsx       # Một dòng dữ liệu
  data-table-cell.tsx      # Một ô
  data-table-toolbar.tsx   # Thanh filter (debounced)
  data-table-pagination.tsx # Phân trang
  data-table-empty.tsx     # Empty state
  data-table-loading.tsx   # Loading state

hooks/
  use-data-table.ts        # Re-export từ @/components/ui/data-table (giữ tương thích)
```

## Nguyên tắc kiến trúc

1. **Headless hook**  
   `useDataTable(data, columns, config)` chứa toàn bộ logic: sort (asc/desc/none), filter (debounce 300ms), selection, pagination. Không gọi API, không truy cập store.

2. **UI chỉ hiển thị**  
   Các component DataTable chỉ nhận state/handlers từ context hoặc props, không tự gọi API hay đọc store.

3. **Generic & type-safe**  
   Mọi API đều dùng `<T>` theo kiểu dòng dữ liệu. Column definition có `key`, `accessor?`, `render?` để type-safe.

4. **Compound components**  
   DataTable làm root, các phần con (Toolbar, Pagination, Empty, Loading) là compound components, dùng chung context.

5. **Controlled & uncontrolled**  
   - **Uncontrolled**: truyền `data`, `columns`, `config` → DataTable dùng `useDataTable` nội bộ.  
   - **Controlled**: parent gọi `useDataTable`, truyền `rows`, `resolvedColumns`, `sortKey`, `sortDirection`, … → DataTable chỉ render.

## Hook API: useDataTable

```ts
const {
  rows,              // Dòng đã filter/sort/paginate (client) hoặc serverRows (server)
  columns,           // Cột đã resolve visibility & width
  setColumnVisibility,
  setColumnWidth,
  sortKey,
  sortDirection,
  toggleSort,        // (key) => void
  filters,
  setFilter,         // (key, value) => void
  setFilters,
  selectedRows,
  toggleRowSelection,
  selectAll,         // (rowIds) => void
  clearSelection,
  pagination,        // { pageIndex, pageSize, totalRows, setPageIndex, nextPage, ... } | null
  isLoading,
  setIsLoading,
  reset,             // Clear sort, filters, selection, page 0
  clearFilters,
} = useDataTable(data, columns, config)
```

**Config (UseDataTableConfig):**

- `mode: 'client' | 'server'`
- `selectable`, `pagination`, `pageSize`, `filterDebounceMs`
- `initialSortKey`, `initialSortDirection`, `initialColumnVisibility`, `initialColumnWidths`
- Server: `onSortChange`, `onFiltersChange`, `onPaginationChange`, `serverTotalRows`, `serverRows`

## Column definition

```ts
{
  key: string
  title: string
  sortable?: boolean
  filterable?: boolean
  width?: number
  minWidth?: number
  maxWidth?: number
  visible?: boolean
  render?: (row: T, value: unknown) => ReactNode
  accessor?: (row: T) => unknown
}
```

## Performance

- **FlatList** cho body → virtualization, scale 500+ dòng.
- **useMemo / useCallback** trong hook và components để giảm re-render.
- **Debounce filter** 300ms mặc định.
- **Horizontal scroll** một ScrollView bọc header + body (cùng `totalWidth`).

## Ref API (uncontrolled)

```ts
const ref = useRef<DataTableRef>(null)
// ref.current.reset()      → clear sort, filters, selection; page 0
// ref.current.clearFilters()
```

## Ví dụ dùng (uncontrolled)

```tsx
const columns: DataTableColumn<Order>[] = [
  { key: 'id', title: 'ID', width: 80, sortable: true },
  { key: 'name', title: 'Name', width: 160, sortable: true, filterable: true },
  { key: 'amount', title: 'Amount', width: 100, sortable: true, render: (row) => formatMoney(row.amount) },
]

<DataTable
  data={orders}
  columns={columns}
  config={{ pagination: true, selectable: true }}
  rowKey="id"
  onRowPress={(row) => router.push(`/order/${row.id}`)}
  emptyComponent={<DataTable.Empty message="No orders" />}
  loadingComponent={<DataTable.Loading />}
  ref={tableRef}
>
  <DataTable.Toolbar />
  <DataTable.Pagination />
</DataTable>
```

## Ví dụ controlled (server-side)

```tsx
const { rows, columns, sortKey, sortDirection, toggleSort, filters, setFilter, pagination } =
  useDataTable(fetchedRows, columns, {
    mode: 'server',
    serverTotalRows: totalFromApi,
    serverRows: fetchedRows,
    onSortChange: (key, dir) => fetchPage({ sort: key, order: dir }),
    onFiltersChange: (f) => fetchPage({ filters: f }),
    onPaginationChange: (page, size) => fetchPage({ page, size }),
  })

<DataTable
  rows={rows}
  resolvedColumns={columns}
  sortKey={sortKey}
  sortDirection={sortDirection}
  onToggleSort={toggleSort}
  filters={filters}
  onSetFilter={setFilter}
  pagination={pagination}
/>
```
