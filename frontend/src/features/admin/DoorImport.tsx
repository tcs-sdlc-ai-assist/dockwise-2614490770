/**
 * Door CSV import: paste CSV rows (number,type,group) and import them.
 */
import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importDoors, type CreateDoorInput } from '../../api/sites';

/**
 * Parse CSV text into door inputs.
 *
 * Args:
 *   text: CSV with one door per line: number,type[,group].
 *
 * Returns:
 *   Parsed door inputs; malformed lines are skipped.
 */
export function parseDoorsCsv(text: string): CreateDoorInput[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [number, type, group] = line.split(',').map((s) => s.trim());
      return {
        number,
        type: type === 'grade-level' ? 'grade-level' : 'dock-high',
        ...(group ? { group } : {}),
      } as CreateDoorInput;
    })
    .filter((d) => d.number.length > 0);
}

/**
 * Render the door CSV import panel.
 *
 * Args:
 *   siteId: The site to import doors into.
 *
 * Returns:
 *   The import panel element.
 */
export function DoorImport({ siteId }: { siteId: string }) {
  const queryClient = useQueryClient();
  const [csv, setCsv] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: (doors: CreateDoorInput[]) => importDoors(siteId, doors),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['doors', siteId] });
      setMessage(
        `Imported ${result.created.length} door(s); skipped ${result.skipped} duplicate(s).`,
      );
      setCsv('');
    },
    onError: () => setMessage('Import failed.'),
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const doors = parseDoorsCsv(csv);
    if (doors.length === 0) {
      setMessage('No valid rows. Use one door per line: number,type[,group].');
      return;
    }
    importMutation.mutate(doors);
  }

  return (
    <section className="card">
      <h2>Import doors (CSV)</h2>
      <p className="muted">One door per line: number,type[,group]</p>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="doors-csv">CSV rows</label>
          <textarea
            id="doors-csv"
            rows={5}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={'11,dock-high\n12,grade-level,pool'}
          />
        </div>
        {message && (
          <p role="status" className="muted">
            {message}
          </p>
        )}
        <button
          type="submit"
          className="btn btn-secondary"
          disabled={importMutation.isPending}
        >
          {importMutation.isPending ? 'Importing…' : 'Import'}
        </button>
      </form>
    </section>
  );
}
