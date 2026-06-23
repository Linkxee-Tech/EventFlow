'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Tier {
  tierId?: string;
  name: string;
  description: string;
  price: string;
  totalCapacity: string;
  maxPerOrder: string;
}

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState({ name: '', description: '', date: '', venue: '' });
  const [tiers, setTiers] = useState<Tier[]>([]);

  useEffect(() => {
    fetch(`/api/events/${params.id}`)
      .then((r) => r.json())
      .then((json) => {
        const ev = json.data;
        setDetails({
          name: ev.name,
          description: ev.description,
          date: ev.date?.slice(0, 16) ?? '',
          venue: ev.venue,
        });
        setTiers(
          (ev.tiers ?? []).map((t: any) => ({
            tierId: t.tierId,
            name: t.name,
            description: t.description ?? '',
            price: (t.price / 100).toFixed(2),
            totalCapacity: String(t.totalCapacity),
            maxPerOrder: String(t.maxPerOrder),
          }))
        );
      })
      .catch(() => toast.error('Could not load event data'))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...details,
          date: new Date(details.date).toISOString(),
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? 'Failed to save changes');
        return;
      }
      toast.success('Event updated successfully');
      router.push(`/dashboard/events/${params.id}`);
    } catch {
      toast.error('Network error. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading event…
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/events/${params.id}`}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-xl font-semibold">Edit Event</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="bg-[#1A1A2E] border border-white/8 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-medium text-slate-300">Event details</h2>

          <div className="space-y-1.5">
            <label className="block text-xs text-slate-400">Event name *</label>
            <input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })}
              className="w-full bg-[#0F0F1A] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              required />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-slate-400">Description *</label>
            <textarea value={details.description} onChange={(e) => setDetails({ ...details, description: e.target.value })}
              rows={5}
              className="w-full bg-[#0F0F1A] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs text-slate-400">Date & time *</label>
              <input type="datetime-local" value={details.date}
                onChange={(e) => setDetails({ ...details, date: e.target.value })}
                className="w-full bg-[#0F0F1A] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                required />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs text-slate-400">Venue *</label>
              <input value={details.venue} onChange={(e) => setDetails({ ...details, venue: e.target.value })}
                className="w-full bg-[#0F0F1A] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                required />
            </div>
          </div>
        </div>

        {/* Tiers — read-only display (tiers need separate API to update) */}
        {tiers.length > 0 && (
          <div className="bg-[#1A1A2E] border border-white/8 rounded-2xl p-6">
            <h2 className="text-sm font-medium text-slate-300 mb-3">Ticket tiers</h2>
            <p className="text-xs text-slate-500 mb-3">
              Tier capacities cannot be edited after creation to prevent inventory issues.
              Contact support to adjust capacities on live events.
            </p>
            <div className="space-y-2">
              {tiers.map((t, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 text-sm">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-slate-400">${t.price} · {t.totalCapacity} capacity</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Link href={`/dashboard/events/${params.id}`}
            className="flex-1 flex items-center justify-center bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 py-2.5 rounded-xl text-sm font-medium transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
