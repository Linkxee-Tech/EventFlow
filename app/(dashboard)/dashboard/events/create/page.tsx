'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, Wand2, CheckCircle } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

interface Tier {
  name: string;
  description: string;
  price: string; // dollars, converted to cents on submit
  totalCapacity: string;
  maxPerOrder: string;
}

export default function CreateEventPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [generatingFlyer, setGeneratingFlyer] = useState(false);
  const [flyerCopy, setFlyerCopy] = useState('');
  const [flyerTagline, setFlyerTagline] = useState('');
  const [flyerStyle, setFlyerStyle] = useState('vibrant retro');
  const [captions, setCaptions] = useState<{ twitter?: string; linkedin?: string; instagram?: string } | null>(null);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);

  const [details, setDetails] = useState({
    name: '',
    description: '',
    date: '',
    venue: '',
  });

  const [tiers, setTiers] = useState<Tier[]>([
    { name: 'General Admission', description: '', price: '', totalCapacity: '100', maxPerOrder: '4' },
  ]);

  function addTier() {
    setTiers((t) => [
      ...t,
      { name: '', description: '', price: '', totalCapacity: '50', maxPerOrder: '4' },
    ]);
  }

  function removeTier(i: number) {
    setTiers((t) => t.filter((_, idx) => idx !== i));
  }

  function updateTier(i: number, field: keyof Tier, value: string) {
    setTiers((t) => t.map((tier, idx) => (idx === i ? { ...tier, [field]: value } : tier)));
  }

  async function generateFlyer() {
    if (!details.name) { toast.error('Enter an event name first'); return; }
    setGeneratingFlyer(true);
    try {
      const res = await fetch('/api/ai/generate-flyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: details.name,
          eventDate: details.date,
          venue: details.venue,
          style: flyerStyle,
          theme: flyerStyle,
        }),
      });
      const json = await res.json();
      setFlyerCopy(json.data?.copy ?? '');
      setFlyerTagline(json.data?.tagline ?? '');
      toast.success('Flyer generated!');
    } catch {
      toast.error('Generation failed. Try again.');
    } finally {
      setGeneratingFlyer(false);
    }
  }

  async function generateCaptions() {
    if (!details.name) { toast.error('Event name required'); return; }
    setGeneratingCaptions(true);
    try {
      const res = await fetch('/api/ai/generate-flyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: details.name,
          eventDate: details.date,
          venue: details.venue,
          style: flyerStyle,
          theme: flyerStyle,
          generateCaptions: true,
        }),
      });
      const json = await res.json();
      if (json.data?.captions) {
        setCaptions(json.data.captions);
        toast.success('Social captions generated!');
      }
    } catch { toast.error('Caption generation failed. Try again.'); }
    finally { setGeneratingCaptions(false); }
  }

  async function publish(asDraft = false) {
    setLoading(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...details,
          date: new Date(details.date).toISOString(),
          tiers: tiers.map((t) => ({
            name: t.name,
            description: t.description || undefined,
            price: Math.round(parseFloat(t.price) * 100),
            totalCapacity: parseInt(t.totalCapacity),
            maxPerOrder: parseInt(t.maxPerOrder),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error); return; }

      if (!asDraft) {
        await fetch(`/api/events/${json.data.id}/publish`, { method: 'POST' });
      }

      toast.success(asDraft ? 'Saved as draft' : 'Event published!');
      router.push('/dashboard/events');
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  const steps = ['Details', 'Tickets', 'Design', 'Publish'];

  return (
    <div className="p-7 max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Create Event</h1>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border transition-colors
                ${i + 1 < step ? 'bg-primary border-primary text-white'
                  : i + 1 === step ? 'border-primary text-primary bg-primary/10'
                  : 'border-border text-muted-foreground bg-card'}`}>
                {i + 1 < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-[10px] ${i + 1 === step ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mb-4 mx-1 ${i + 1 < step ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="space-y-4 bg-card border rounded-xl p-6">
          <div className="space-y-1.5">
            <Label>Event name *</Label>
            <Input placeholder="e.g. Lagos Tech Summit 2026"
              value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Textarea placeholder="Tell people what to expect..."
              rows={4} value={details.description}
              onChange={(e) => setDetails({ ...details, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date & time *</Label>
              <Input type="datetime-local" value={details.date}
                onChange={(e) => setDetails({ ...details, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Venue *</Label>
              <Input placeholder="123 Main St, Lagos"
                value={details.venue} onChange={(e) => setDetails({ ...details, venue: e.target.value })} />
            </div>
          </div>
          <Button onClick={() => setStep(2)} className="w-full">
            Next: Ticket Tiers →
          </Button>
        </div>
      )}

      {/* Step 2: Tickets */}
      {step === 2 && (
        <div className="space-y-4">
          {tiers.map((tier, i) => (
            <div key={i} className="bg-card border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary">Tier {i + 1}</span>
                {tiers.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeTier(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Tier name *</Label>
                  <Input placeholder="e.g. Early Bird, VIP" value={tier.name}
                    onChange={(e) => updateTier(i, 'name', e.target.value)} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Description (optional)</Label>
                  <Input placeholder="What's included?" value={tier.description}
                    onChange={(e) => updateTier(i, 'description', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Price ($) *</Label>
                  <Input type="number" min="0" step="0.01" placeholder="25.00" value={tier.price}
                    onChange={(e) => updateTier(i, 'price', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Capacity *</Label>
                  <Input type="number" min="1" value={tier.totalCapacity}
                    onChange={(e) => updateTier(i, 'totalCapacity', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Max per order</Label>
                  <Input type="number" min="1" max="20" value={tier.maxPerOrder}
                    onChange={(e) => updateTier(i, 'maxPerOrder', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full" onClick={addTier}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add Tier
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">← Back</Button>
            <Button onClick={() => setStep(3)} className="flex-1">Next: Design →</Button>
          </div>
        </div>
      )}

      {/* Step 3: AI Flyer */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-950 to-purple-950 border border-primary/20 rounded-xl p-8 text-center min-h-48 flex flex-col items-center justify-center gap-3">
            {flyerTagline ? (
              <>
                <span className="text-xs bg-amber-500/90 text-amber-950 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  ✦ Event
                </span>
                <h2 className="text-2xl font-bold text-white">{details.name}</h2>
                <p className="text-sm text-indigo-200 italic">"{flyerTagline}"</p>
                {flyerCopy && <p className="text-xs text-indigo-300 max-w-xs">{flyerCopy}</p>}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                Generate an AI flyer below ↓
              </p>
            )}
          </div>
          <div className="bg-card border rounded-xl p-5 space-y-3">
            <Label>Visual style prompt</Label>
            <Input placeholder="e.g. vibrant Afro-futurist neon, retro 80s synthwave"
              value={flyerStyle} onChange={(e) => setFlyerStyle(e.target.value)} />
            <Button onClick={generateFlyer} disabled={generatingFlyer} className="w-full" variant="outline">
              <Wand2 className="h-4 w-4 mr-2" />
              {generatingFlyer ? 'Generating...' : 'Generate with AI'}
            </Button>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">← Back</Button>
            <Button onClick={() => setStep(4)} className="flex-1">Next: Review →</Button>
          </div>
        </div>
      )}

      {/* Step 4: Publish */}
      {step === 4 && (
        <div className="space-y-4">
          {/* Event review */}
          <div className="bg-card border rounded-xl p-6 space-y-4">
            <h2 className="font-medium">Review your event</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Name</span><span className="font-medium">{details.name}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Date</span><span>{details.date}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Venue</span><span>{details.venue}</span></div>
              <div className="flex justify-between py-2"><span className="text-muted-foreground">Tiers</span><span>{tiers.length} ticket tier{tiers.length > 1 ? 's' : ''}</span></div>
            </div>
          </div>

          {/* AI Social Captions — Phase 7 */}
          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium">AI Social Captions</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Auto-generate Twitter, LinkedIn & Instagram posts</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={generateCaptions}
                disabled={generatingCaptions || !details.name}
                className="shrink-0"
              >
                {generatingCaptions ? (
                  <><span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin mr-1.5" />Generating…</>
                ) : (
                  <>✨ Generate</>
                )}
              </Button>
            </div>

            {captions ? (
              <div className="space-y-3">
                {[
                  { platform: '𝕏 Twitter', key: 'twitter', color: 'text-sky-400', bg: 'bg-sky-500/5 border-sky-500/20' },
                  { platform: 'LinkedIn', key: 'linkedin', color: 'text-blue-400', bg: 'bg-blue-500/5 border-blue-500/20' },
                  { platform: 'Instagram', key: 'instagram', color: 'text-pink-400', bg: 'bg-pink-500/5 border-pink-500/20' },
                ].map(({ platform, key, color, bg }) => {
                  const text = captions[key as keyof typeof captions];
                  if (!text) return null;
                  return (
                    <div key={key} className={`border rounded-xl p-3 ${bg}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-semibold ${color}`}>{platform}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(text); toast.success(`${platform} caption copied!`); }}
                          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{text}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-white/10 rounded-xl">
                <p className="text-xs text-muted-foreground">Click Generate to create social media captions for your event</p>
              </div>
            )}
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Pricing:</strong> EventFlow charges 2.5% + $0.30 per ticket sold.
            Organizers receive the rest instantly to their connected Stripe account.
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(3)} className="flex-1">← Back</Button>
            <Button variant="outline" onClick={() => publish(true)} disabled={loading} className="flex-1">Save Draft</Button>
            <Button onClick={() => publish(false)} disabled={loading} className="flex-1">
              {loading ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />Publishing…</> : '🚀 Publish Now'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
