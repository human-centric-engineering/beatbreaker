import { SHORTCUTS } from '@/components/app/shell/shortcuts';

/**
 * Every key the Studio answers to, as a table: drawn by the `?` sheet and by
 * `/help`, from the table the key handler walks (E15, task 8.7). Not a client
 * module, so the public page renders it on the server.
 */
export function ShortcutsTable() {
  return (
    <table className="w-full text-sm">
      <tbody>
        {SHORTCUTS.map((s) => (
          <tr key={s.keys} className="border-b last:border-0">
            <th
              scope="row"
              className="py-1.5 pr-4 text-left font-mono font-medium whitespace-nowrap"
            >
              {s.keys}
            </th>
            <td className="text-muted-foreground py-1.5">{s.does}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
