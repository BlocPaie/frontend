import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { InvoiceStatus } from '@/data/mock';

export default function StatusBadge({ status }: { status: InvoiceStatus }) {
  if (status === 'pending') {
    return (
      <span className="badge badge-pending">
        <Clock size={10} />
        Pending
      </span>
    );
  }
  if (status === 'executed') {
    return (
      <span className="badge badge-executed">
        <CheckCircle2 size={10} />
        Executed
      </span>
    );
  }
  return (
    <span className="badge badge-cancelled">
      <XCircle size={10} />
      Cancelled
    </span>
  );
}
