'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Wifi, WifiOff, SwitchCamera, Search, Users } from 'lucide-react';
import type { TicketTier } from '@/types';

interface PreloadedHash {
  ticketId: string;
  qrHash: string;
  buyerName: string;
  tierId: string;
}

interface Props {
  eventId: string;
  eventName: string;
  tiers: TicketTier[];
  preloadedHashes: PreloadedHash[];
  initialCheckedIn: number;
}

interface ScanResult {
  valid: boolean;
  attendeeName?: string;
  tierName?: string;
  message: string;
}

// ─── Audio feedback ───────────────────────────────────────────────────────────

function playBeep(type: 'success' | 'error') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    }
  } catch {
    // Audio not supported — silent fallback
  }
}

// ─── Service worker registration ─────────────────────────────────────────────

async function registerOfflineCache(eventId: string, hashes: PreloadedHash[]) {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    // Post the hashes to the service worker for offline storage
    reg.active?.postMessage({ type: 'CACHE_HASHES', eventId, hashes });
  } catch (e) {
    // SW not critical — log silently
    console.warn('[SW] Registration failed:', e);
  }
}

export function QRScannerWithOffline({ eventId, eventName, tiers, preloadedHashes, initialCheckedIn }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const [scanning, setScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [loading, setLoading] = useState(false);
  const [manualId, setManualId] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [flashColor, setFlashColor] = useState<'green' | 'red' | null>(null);

  // Track processed QR codes to prevent double-scan within 3 seconds
  const recentlyScanned = useRef<Set<string>>(new Set());

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => { setIsOnline(true); toast.success('Back online — live scanning restored'); };
    const onOffline = () => { setIsOnline(false); toast.warning('Offline — using cached ticket list'); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  useEffect(() => {
    registerOfflineCache(eventId, preloadedHashes);
  }, [eventId, preloadedHashes]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    cancelAnimationFrame(animRef.current);
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
    } catch {
      toast.error('Camera access denied. Use manual entry below.');
    }
  }, [facingMode]);

  useEffect(() => { return () => stopCamera(); }, [stopCamera]);

  // Flash screen on result
  useEffect(() => {
    if (!flashColor) return;
    const id = setTimeout(() => setFlashColor(null), 400);
    return () => clearTimeout(id);
  }, [flashColor]);

  const handleScan = useCallback(async (ticketId: string, qrHash: string) => {
    if (recentlyScanned.current.has(ticketId)) return;
    recentlyScanned.current.add(ticketId);
    setTimeout(() => recentlyScanned.current.delete(ticketId), 3000);

    setLoading(true);

    // ── Offline mode: check against preloaded hashes ──────────────────────
    if (!isOnline) {
      const match = preloadedHashes.find((h) => h.ticketId === ticketId);
      if (!match) {
        const r: ScanResult = { valid: false, message: 'Ticket not found in cached list' };
        setResult(r); playBeep('error'); setFlashColor('red');
        setLoading(false);
        return;
      }
      const tier = tiers.find((t) => t.tierId === match.tierId);
      const r: ScanResult = {
        valid: true,
        attendeeName: match.buyerName,
        tierName: tier?.name,
        message: `Welcome, ${match.buyerName}! (offline — will sync when reconnected)`,
      };
      setResult(r); playBeep('success'); setFlashColor('green');
      setCheckedIn((n) => n + 1);
      toast.success(`✓ ${match.buyerName} — offline check-in`);
      setLoading(false);
      setTimeout(() => { setResult(null); }, 2500);
      return;
    }

    // ── Online mode: call API ─────────────────────────────────────────────
    try {
      const res = await fetch('/api/tickets/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, eventId, qrHash }),
      });
      const json = await res.json();
      const scanResult: ScanResult = json.data;
      setResult(scanResult);

      if (scanResult.valid) {
        playBeep('success');
        setFlashColor('green');
        setCheckedIn((n) => n + 1);
        toast.success(`✓ ${scanResult.message}`);
      } else {
        playBeep('error');
        setFlashColor('red');
        toast.error(scanResult.message);
      }

      setTimeout(() => {
        setResult(null);
        animRef.current = requestAnimationFrame(scanFrame);
      }, 2500);
    } catch {
      toast.error('Scan failed — check your connection');
      animRef.current = requestAnimationFrame(scanFrame);
    } finally {
      setLoading(false);
    }
  }, [eventId, isOnline, preloadedHashes, tiers]);

  const scanFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Dynamically import jsQR to avoid SSR issues
    const jsQR = (await import('jsqr')).default;
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code?.data) {
      const [ticketId, qrHash] = code.data.split(':');
      if (ticketId && qrHash) {
        await handleScan(ticketId, qrHash);
        return;
      }
    }
    animRef.current = requestAnimationFrame(scanFrame);
  }, [handleScan]);

  useEffect(() => {
    if (scanning) animRef.current = requestAnimationFrame(scanFrame);
    return () => cancelAnimationFrame(animRef.current);
  }, [scanning, scanFrame]);

  function flipCamera() {
    stopCamera();
    setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'));
    setTimeout(startCamera, 200);
  }

  async function handleManualLookup() {
    if (!manualId.trim()) return;
    const parts = manualId.trim().split(':');
    await handleScan(parts[0], parts[1] ?? '');
    setManualId('');
  }

  const totalValid = preloadedHashes.length;

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 text-sm text-amber-300">
          <WifiOff className="h-4 w-4 shrink-0" />
          Offline mode — using {preloadedHashes.length} cached tickets
        </div>
      )}

      {/* Viewfinder */}
      <div className={`relative aspect-square rounded-2xl overflow-hidden border transition-colors ${
        flashColor === 'green' ? 'border-emerald-500 bg-emerald-500/5'
        : flashColor === 'red' ? 'border-red-500 bg-red-500/5'
        : 'border-white/10 bg-[#1A1A2E]'
      }`}>
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />

        {/* Corner guides */}
        {['top-4 left-4 border-t-2 border-l-2 rounded-tl', 'top-4 right-4 border-t-2 border-r-2 rounded-tr',
          'bottom-4 left-4 border-b-2 border-l-2 rounded-bl', 'bottom-4 right-4 border-b-2 border-r-2 rounded-br'
        ].map((cls, i) => (
          <div key={i} className={`absolute w-7 h-7 border-indigo-400 ${cls}`} />
        ))}

        {/* Scan line */}
        {scanning && !result && !loading && (
          <div className="absolute left-4 right-4 h-0.5 bg-indigo-400/70 scan-line-animated shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
        )}

        {/* Flash overlay */}
        {flashColor && (
          <div className={`absolute inset-0 transition-opacity ${
            flashColor === 'green' ? 'bg-emerald-500/20' : 'bg-red-500/20'
          }`} />
        )}

        {/* Not started */}
        {!scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0F0F1A]/80">
            <p className="text-slate-400 text-sm">Camera off</p>
            <button onClick={startCamera}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
              Start Camera
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0F0F1A]/60">
            <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button onClick={flipCamera}
          className="flex-1 flex items-center justify-center gap-1.5 bg-[#1A1A2E] border border-white/8 hover:bg-white/5 text-slate-300 text-sm py-2 rounded-xl transition-colors">
          <SwitchCamera className="h-4 w-4" /> Flip
        </button>
        <button onClick={scanning ? stopCamera : startCamera}
          className="flex-1 flex items-center justify-center gap-1.5 bg-[#1A1A2E] border border-white/8 hover:bg-white/5 text-slate-300 text-sm py-2 rounded-xl transition-colors">
          {scanning ? 'Pause' : 'Resume'}
        </button>
        <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
          {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {isOnline ? 'Live' : 'Offline'}
        </div>
      </div>

      {/* Scan result */}
      {result && (
        <div className={`rounded-xl p-4 flex items-start gap-3 border animate-in slide-in-from-bottom-2 ${
          result.valid ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
        }`}>
          {result.valid
            ? <CheckCircle className="h-8 w-8 text-emerald-400 shrink-0 mt-0.5" />
            : <XCircle className="h-8 w-8 text-red-400 shrink-0 mt-0.5" />
          }
          <div>
            <p className={`font-semibold text-sm ${result.valid ? 'text-emerald-300' : 'text-red-300'}`}>
              {result.valid ? '✓ Valid Ticket' : '✕ Invalid'}
            </p>
            {result.attendeeName && (
              <p className="text-sm text-white mt-0.5">{result.attendeeName}</p>
            )}
            {result.tierName && (
              <p className="text-xs text-slate-400">{result.tierName}</p>
            )}
            <p className="text-xs text-slate-500 mt-0.5">{result.message}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Checked in', value: checkedIn, color: 'text-indigo-400' },
          { label: 'Remaining', value: totalValid - checkedIn, color: 'text-white' },
          { label: 'Attendance', value: `${totalValid > 0 ? Math.round((checkedIn / totalValid) * 100) : 0}%`, color: 'text-amber-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#1A1A2E] border border-white/8 rounded-xl py-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Manual entry */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Manual ticket ID lookup</p>
        <div className="flex gap-2">
          <input
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
            placeholder="tk_abc123:hash or just ticket ID"
            className="flex-1 bg-[#1A1A2E] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button onClick={handleManualLookup} disabled={loading || !manualId}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-3 py-2 rounded-xl transition-colors">
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
