import { redirect } from 'next/navigation';

export default function ScanRedirectPage() {
  redirect('/dashboard/events');
}
