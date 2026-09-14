/**
 * My Appointments page: the caller's appointments with submit/cancel actions.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAppointments,
  submitAppointment,
  cancelAppointment,
} from '../../api/appointments';

/**
 * Render the caller's appointments.
 *
 * Returns:
 *   The appointments page element.
 */
export function MyAppointmentsPage() {
  const queryClient = useQueryClient();
  const appointmentsQuery = useQuery({
    queryKey: ['appointments'],
    queryFn: () => listAppointments(),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['appointments'] });

  const submitMutation = useMutation({
    mutationFn: submitAppointment,
    onSuccess: invalidate,
  });
  const cancelMutation = useMutation({
    mutationFn: cancelAppointment,
    onSuccess: invalidate,
  });

  return (
    <main className="app-page">
      <h1>My appointments</h1>
      {appointmentsQuery.isLoading && <p className="muted">Loading…</p>}
      {appointmentsQuery.data?.length === 0 && (
        <p className="muted">No appointments yet.</p>
      )}
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Code</th>
            <th scope="col">Window</th>
            <th scope="col">Activity</th>
            <th scope="col">Status</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {appointmentsQuery.data?.map((appt) => (
            <tr key={appt.id}>
              <td className="confirmation-code">{appt.confirmationCode}</td>
              <td>
                {new Date(appt.windowStart).toLocaleString()} –{' '}
                {new Date(appt.windowEnd).toLocaleTimeString()}
              </td>
              <td>{appt.activity}</td>
              <td>
                <span className="badge badge-info">{appt.status}</span>
              </td>
              <td>
                {appt.status === 'draft' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => submitMutation.mutate(appt.id)}
                  >
                    Submit
                  </button>
                )}{' '}
                {(appt.status === 'confirmed' ||
                  appt.status === 'requested' ||
                  appt.status === 'draft') && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => cancelMutation.mutate(appt.id)}
                  >
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
