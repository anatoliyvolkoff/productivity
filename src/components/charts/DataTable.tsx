/** Collapsible table view — every chart's values stay readable without hovering. */
export function DataTable({ caption, columns, rows }: { caption: string; columns: string[]; rows: Array<Array<string | number>> }) {
  return (
    <details className="mt-3 text-[12.5px]">
      <summary className="cursor-pointer text-fg-subtle select-none hover:text-fg-muted">Show data</summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-md border border-outline">
        <table className="w-full border-collapse">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-surface-3">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-3 py-1.5 text-left font-medium text-fg-muted">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-outline/70">
                {r.map((v, j) => (
                  <td key={j} className="tabular px-3 py-1.5">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
