'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateQrHash } from '@/lib/utils';
import { formatEventDate } from '@/lib/utils';
import type { Ticket, Event } from '@/types';

interface Props {
  ticket: Ticket;
  event: Event;
  tierName: string;
  quantity: number;
}

export function QRTicket({ ticket, event, tierName, quantity }: Props) {
  const [qrData, setQrData] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  function updateQr() {
    setRefreshing(true);
    // QR encodes "ticketId:currentHash" — verified server-side
    const hash = generateQrHash(ticket.ticketId);
    setQrData(`${ticket.ticketId}:${hash}`);
    setTimeout(() => setRefreshing(false), 400);
  }

  useEffect(() => {
    updateQr();
    // Refresh every 30 seconds
    const interval = setInterval(updateQr, 30_000);
    return () => clearInterval(interval);
  }, [ticket.ticketId]);

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-primary px-6 py-5 text-center">
        <p className="text-xs text-white/60 mb-1">EventFlow Ticket</p>
        <h2 className="text-lg font-semibold text-white">{event.name}</h2>
        <p className="text-sm text-white/70 mt-0.5">
          {tierName} {quantity > 1 ? `× ${quantity}` : ''}
        </p>
      </div>

      {/* QR */}
      <div className="flex flex-col items-center py-6 px-8 gap-4">
        <div
          className={`bg-white p-3 rounded-xl transition-opacity ${
            refreshing ? 'qr-refreshing opacity-60' : 'opacity-100'
          }`}
        >
          {qrData && (
            <QRCodeSVG
              value={qrData}
              size={160}
              level="M"
              includeMargin={false}
            />
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Refreshes every 30s · #{ticket.ticketId.slice(-8).toUpperCase()}
        </p>

        {/* Info rows */}
        <div className="w-full space-y-0 divide-y divide-border">
          {[
            { key: 'Date', val: formatEventDate(event.date) },
            { key: 'Venue', val: event.venue },
            { key: 'Attendee', val: ticket.buyerName },
            { key: 'Tier', val: tierName },
          ].map(({ key, val }) => (
            <div key={key} className="flex justify-between py-2.5 text-sm">
              <span className="text-muted-foreground">{key}</span>
              <span className="font-medium text-right max-w-[60%]">{val}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-muted/40 text-center text-[10px] text-muted-foreground py-2.5 border-t">
        This QR code refreshes every 30 seconds to prevent fraud
      </div>
    </div>
  );
}
