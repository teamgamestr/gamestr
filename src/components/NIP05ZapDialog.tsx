import { useState, useEffect } from 'react';
import { Zap, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useWallet } from '@/hooks/useWallet';
import { useNIP05Zap } from '@/hooks/useNIP05Zap';
import { useNIP05Order, type NIP05Order } from '@/hooks/useNIP05';
import { useToast } from '@/hooks/useToast';
import QRCode from 'qrcode';

interface NIP05ZapDialogProps {
  order: NIP05Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NIP05ZapDialog({ order, open, onOpenChange, onSuccess }: NIP05ZapDialogProps) {
  const { webln } = useWallet();
  const { toast } = useToast();
  const { zap, isZapping, invoice, setInvoice, reset } = useNIP05Zap(webln, order?.id ?? null);
  const { data: orderData } = useNIP05Order(order?.id ?? null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const comment = order ? `NIP05:${order.id}` : '';

  useEffect(() => {
    if (open && order) {
      reset();
      setQrCodeUrl('');
      setCopied(false);
    }
  }, [open, order, reset]);

  useEffect(() => {
    if (orderData?.order.status === 'paid') {
      onSuccess();
    }
  }, [orderData, onSuccess]);

  useEffect(() => {
    let cancelled = false;
    if (invoice) {
      QRCode.toDataURL(invoice.toUpperCase(), { width: 512, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } })
        .then((url) => {
          if (!cancelled) setQrCodeUrl(url);
        })
        .catch((err) => console.error('QR generation failed', err));
    } else {
      setQrCodeUrl('');
    }
    return () => {
      cancelled = true;
    };
  }, [invoice]);

  const handlePay = async () => {
    await zap(comment);
  };

  const handleCopy = async () => {
    if (!invoice) return;
    await navigator.clipboard.writeText(invoice);
    setCopied(true);
    toast({ title: 'Invoice copied', description: 'Paste it into your Lightning wallet.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const openInWallet = () => {
    if (invoice) window.open(`lightning:${invoice}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        setInvoice(null);
        reset();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay 10,000 sats</DialogTitle>
          <DialogDescription>
            Send a zap to claim <span className="font-medium">{order?.name}@gamestr.me</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {invoice ? (
            <>
              <div className="flex justify-center">
                <Card className="p-3">
                  <CardContent className="p-0">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="Lightning invoice QR" className="w-48 h-48 object-contain" />
                    ) : (
                      <div className="w-48 h-48 bg-muted animate-pulse rounded" />
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nip05-invoice">Lightning Invoice</Label>
                <div className="flex gap-2">
                  <Input
                    id="nip05-invoice"
                    value={invoice}
                    readOnly
                    className="font-mono text-xs"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Button onClick={openInWallet} variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Wallet
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="text-3xl font-bold">10,000 sats</div>
              <p className="text-sm text-muted-foreground">One year of {order?.name}@gamestr.me</p>
              <Button onClick={handlePay} disabled={isZapping} className="w-full" size="lg">
                {isZapping ? (
                  'Creating invoice...'
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Pay with Lightning
                  </>
                )}
              </Button>
            </div>
          )}

          {orderData?.order.status === 'pending' && (
            <p className="text-xs text-center text-muted-foreground">
              Waiting for zap receipt... ({Math.max(0, orderData.order.expiresAt - Math.floor(Date.now() / 1000))}s left)
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
