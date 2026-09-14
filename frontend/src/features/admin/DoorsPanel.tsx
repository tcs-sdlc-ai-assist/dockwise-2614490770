/**
 * Doors panel: list a site's doors and add a single door.
 */
import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listDoors,
  createDoor,
  setDoorOutOfService,
  setDoorInService,
  type Door,
} from '../../api/sites';

/**
 * Render the doors panel for a site.
 *
 * Args:
 *   siteId: The site whose doors are managed.
 *
 * Returns:
 *   The doors panel element.
 */
export function DoorsPanel({ siteId }: { siteId: string }) {
  const queryClient = useQueryClient();
  const [number, setNumber] = useState('');
  const [type, setType] = useState<'dock-high' | 'grade-level'>('dock-high');
  const [error, setError] = useState<string | null>(null);

  const doorsQuery = useQuery({
    queryKey: ['doors', siteId],
    queryFn: () => listDoors(siteId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['doors', siteId] });

  const createMutation = useMutation({
    mutationFn: () => createDoor(siteId, { number, type }),
    onSuccess: () => {
      invalidate();
      setNumber('');
      setError(null);
    },
    onError: () => setError('Could not add the door (duplicate number?).'),
  });

  const toggleMutation = useMutation({
    mutationFn: (door: Door) =>
      door.status === 'in_service'
        ? setDoorOutOfService(door.id, 'Marked out of service')
        : setDoorInService(door.id),
    onSuccess: invalidate,
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!number) {
      setError('Door number is required.');
      return;
    }
    createMutation.mutate();
  }

  return (
    <section className="card">
      <h2>Doors</h2>
      <form onSubmit={onSubmit} className="door-form">
        <div className="field">
          <label htmlFor="door-number">Number</label>
          <input
            id="door-number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            aria-required="true"
          />
        </div>
        <div className="field">
          <label htmlFor="door-type">Type</label>
          <select
            id="door-type"
            value={type}
            onChange={(e) => setType(e.target.value as 'dock-high' | 'grade-level')}
          >
            <option value="dock-high">Dock-high</option>
            <option value="grade-level">Grade-level</option>
          </select>
        </div>
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={createMutation.isPending}
        >
          Add door
        </button>
      </form>

      {doorsQuery.isLoading && <p className="muted">Loading…</p>}
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Number</th>
            <th scope="col">Type</th>
            <th scope="col">Group</th>
            <th scope="col">Status</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {doorsQuery.data?.map((door) => (
            <tr key={door.id}>
              <td>{door.number}</td>
              <td>{door.type}</td>
              <td>{door.group}</td>
              <td>
                <span
                  className={`badge ${
                    door.status === 'in_service' ? 'badge-success' : 'badge-error'
                  }`}
                >
                  {door.status === 'in_service' ? 'In service' : 'Out of service'}
                </span>
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => toggleMutation.mutate(door)}
                >
                  {door.status === 'in_service' ? 'Take out of service' : 'Return to service'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
