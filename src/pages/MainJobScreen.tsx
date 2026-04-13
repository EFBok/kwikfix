import { useState, useRef, useEffect } from 'react';
import { Company, Job } from '@/types/kwikfix';
import { getCompany, saveJob } from '@/store/kwikfix-store';
import { toast } from 'sonner';
import SharePanel from '@/components/SharePanel';
import QuotePreview from '@/components/QuotePreview';

export default function MainJobScreen() {
  const MAX_RECORDING_MS = 20000;
  const company = getCompany() as Company;
  const [photo, setPhoto] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [description, setDescription] = useState('');
  const [labour, setLabour] = useState('');
  const [parts, setParts] = useState('');
  const [lineItems, setLineItems] = useState<Array<{ name: string; price: string }>>([]);
  const [location, setLocation] = useState('Detecting location...');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingRemainingMs, setRecordingRemainingMs] = useState(MAX_RECORDING_MS);
  const [lastSentJob, setLastSentJob] = useState<Job | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const voiceRunCounterRef = useRef(0);
  const recognitionStartedAtRef = useRef<number>(0);
  const stopTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const lineItemsTotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
  const total = (parseFloat(labour) || 0) + (parseFloat(parts) || 0) + lineItemsTotal;
  const recordingProgressPercent = Math.max(0, Math.min(100, ((MAX_RECORDING_MS - recordingRemainingMs) / MAX_RECORDING_MS) * 100));

  const extractCustomerNameFromTranscript = (text: string): string | null => {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const patterns = [
      /\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/,
      /\bcustomer\s+(?:name\s+is\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/,
      /\bclient\s+(?:name\s+is\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/,
      /\bname\s+is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/,
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match?.[1]) return match[1].trim();
    }

    return null;
  };

  const extractCostsFromTranscript = (text: string): { labour: string; parts: string; labourFound: boolean; partsFound: boolean } => {
    const normalized = text.replace(/,/g, '');
    const amount = '(\\d+(?:\\.\\d{1,2})?)';
    const labourPatterns = [
      new RegExp(`\\b(?:labou?r|labou?r\\s+cost)\\s*(?:is|of|:)?\\s*(?:r|zar|\\$)?\\s*${amount}\\b`, 'i'),
      new RegExp(`\\b${amount}\\s*(?:r|zar|\\$)?\\s*(?:for\\s+)?labou?r\\b`, 'i'),
    ];
    const partsPatterns = [
      new RegExp(`\\b(?:parts?|parts?\\s+cost)\\s*(?:is|of|:)?\\s*(?:r|zar|\\$)?\\s*${amount}\\b`, 'i'),
      new RegExp(`\\b${amount}\\s*(?:r|zar|\\$)?\\s*(?:for\\s+)?parts?\\b`, 'i'),
    ];

    const labourMatch = labourPatterns.map(pattern => normalized.match(pattern)).find(Boolean);
    const partsMatch = partsPatterns.map(pattern => normalized.match(pattern)).find(Boolean);

    return {
      labour: labourMatch?.[1] ?? '',
      parts: partsMatch?.[1] ?? '',
      labourFound: Boolean(labourMatch?.[1]),
      partsFound: Boolean(partsMatch?.[1]),
    };
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
            );
            const data = await res.json();
            setLocation(data.display_name?.split(',').slice(0, 3).join(',') || 'Location found');
          } catch {
            setLocation('Location detected');
          }
        },
        () => setLocation('Location unavailable')
      );
    }
  }, []);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleVoice = () => {
    const runId = `voice-run-${++voiceRunCounterRef.current}`;
    // #region agent log
    fetch('http://127.0.0.1:7312/ingest/14ce2c14-fd66-4878-a71b-a45b979fdbf5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'614225'},body:JSON.stringify({sessionId:'614225',runId,hypothesisId:'N5',location:'MainJobScreen.tsx:handleVoice:entry',message:'Voice button pressed with browser context',data:{isRecording,userAgent:navigator.userAgent,online:navigator.onLine},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }

    if (isRecording) {
      // #region agent log
      fetch('http://127.0.0.1:7312/ingest/14ce2c14-fd66-4878-a71b-a45b979fdbf5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'614225'},body:JSON.stringify({sessionId:'614225',runId,hypothesisId:'N10',location:'MainJobScreen.tsx:handleVoice:manual-stop',message:'User manually stopped recording',data:{remainingMs:recordingRemainingMs},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const rawResult = event?.results?.[event?.resultIndex ?? 0]?.[0];
      const text = typeof rawResult?.transcript === 'string' ? rawResult.transcript : '';
      // #region agent log
      fetch('http://127.0.0.1:7312/ingest/14ce2c14-fd66-4878-a71b-a45b979fdbf5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'614225'},body:JSON.stringify({sessionId:'614225',runId,hypothesisId:'N7',location:'MainJobScreen.tsx:recognition:onresult',message:'Recognition result event received',data:{resultIndex:event?.resultIndex ?? -1,hasResults:Boolean(event?.results),resultsLength:event?.results?.length ?? 0,textLength:text.length,textPreview:text.slice(0,80)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setDescription(text);
      const extractedName = extractCustomerNameFromTranscript(text);
      const extractedCosts = extractCostsFromTranscript(text);
      // #region agent log
      fetch('http://127.0.0.1:7312/ingest/14ce2c14-fd66-4878-a71b-a45b979fdbf5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'614225'},body:JSON.stringify({sessionId:'614225',runId,hypothesisId:'N13',location:'MainJobScreen.tsx:recognition:field-extraction',message:'Extracted fields from transcript',data:{customerNameBefore:customerName,extractedName,labourFound:extractedCosts.labourFound,partsFound:extractedCosts.partsFound,labourValue:extractedCosts.labour,partsValue:extractedCosts.parts},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setCustomerName(extractedName ?? '');
      if (extractedCosts.labourFound) {
        setLabour(extractedCosts.labour);
      } else {
        setLabour('');
      }
      if (extractedCosts.partsFound) {
        setParts(extractedCosts.parts);
      } else {
        setParts('');
      }
      setIsRecording(false);
    };

    recognition.onnomatch = () => {
      // #region agent log
      fetch('http://127.0.0.1:7312/ingest/14ce2c14-fd66-4878-a71b-a45b979fdbf5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'614225'},body:JSON.stringify({sessionId:'614225',runId,hypothesisId:'N7',location:'MainJobScreen.tsx:recognition:onnomatch',message:'Recognition no-match event fired',data:{},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    };

    recognition.onerror = (event: any) => {
      // #region agent log
      fetch('http://127.0.0.1:7312/ingest/14ce2c14-fd66-4878-a71b-a45b979fdbf5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'614225'},body:JSON.stringify({sessionId:'614225',runId,hypothesisId:'N9',location:'MainJobScreen.tsx:recognition:onerror',message:'Speech recognition error',data:{error:event?.error ?? 'unknown',message:event?.message ?? '',online:navigator.onLine,visibility:document.visibilityState,sinceStartMs: recognitionStartedAtRef.current ? Date.now() - recognitionStartedAtRef.current : -1},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setIsRecording(false);
      toast.error('Could not capture voice. Try again.');
    };

    recognition.onstart = () => {
      // #region agent log
      fetch('http://127.0.0.1:7312/ingest/14ce2c14-fd66-4878-a71b-a45b979fdbf5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'614225'},body:JSON.stringify({sessionId:'614225',runId,hypothesisId:'N6',location:'MainJobScreen.tsx:recognition:onstart',message:'Recognition onstart fired',data:{},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    };

    recognition.onaudiostart = () => {
      // #region agent log
      fetch('http://127.0.0.1:7312/ingest/14ce2c14-fd66-4878-a71b-a45b979fdbf5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'614225'},body:JSON.stringify({sessionId:'614225',runId,hypothesisId:'N6',location:'MainJobScreen.tsx:recognition:onaudiostart',message:'Recognition audio capture started',data:{},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    };

    recognition.onspeechstart = () => {
      // #region agent log
      fetch('http://127.0.0.1:7312/ingest/14ce2c14-fd66-4878-a71b-a45b979fdbf5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'614225'},body:JSON.stringify({sessionId:'614225',runId,hypothesisId:'N6',location:'MainJobScreen.tsx:recognition:onspeechstart',message:'Recognition speech start detected',data:{},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    };

    recognition.onend = () => {
      // #region agent log
      fetch('http://127.0.0.1:7312/ingest/14ce2c14-fd66-4878-a71b-a45b979fdbf5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'614225'},body:JSON.stringify({sessionId:'614225',runId,hypothesisId:'N6',location:'MainJobScreen.tsx:recognition:onend',message:'Speech recognition ended',data:{descriptionLengthAtEnd:description.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (stopTimeoutRef.current) {
        window.clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setRecordingRemainingMs(MAX_RECORDING_MS);
      setIsRecording(false);
    };

    recognition.start();
    recognitionStartedAtRef.current = Date.now();
    setRecordingRemainingMs(MAX_RECORDING_MS);
    stopTimeoutRef.current = window.setTimeout(() => {
      // #region agent log
      fetch('http://127.0.0.1:7312/ingest/14ce2c14-fd66-4878-a71b-a45b979fdbf5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'614225'},body:JSON.stringify({sessionId:'614225',runId,hypothesisId:'N10',location:'MainJobScreen.tsx:handleVoice:auto-stop',message:'Auto-stop timeout reached',data:{maxMs:MAX_RECORDING_MS},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      recognitionRef.current?.stop();
    }, MAX_RECORDING_MS);
    countdownIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - recognitionStartedAtRef.current;
      const remaining = Math.max(0, MAX_RECORDING_MS - elapsed);
      setRecordingRemainingMs(remaining);
    }, 100);
    // #region agent log
    fetch('http://127.0.0.1:7312/ingest/14ce2c14-fd66-4878-a71b-a45b979fdbf5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'614225'},body:JSON.stringify({sessionId:'614225',runId,hypothesisId:'N6',location:'MainJobScreen.tsx:handleVoice:start',message:'Speech recognition start called',data:{continuous:recognition.continuous,interimResults:recognition.interimResults,lang:recognition.lang},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    setIsRecording(true);
  };

  const handleSend = (asInvoice: boolean) => {
    const normalizedLineItems = lineItems
      .map(item => ({ name: item.name.trim(), price: parseFloat(item.price) || 0 }))
      .filter(item => item.name && item.price > 0);
    const job: Job = {
      id: crypto.randomUUID(),
      photo,
      voiceText: description,
      customerName: customerName || 'Customer',
      description,
      labourAmount: parseFloat(labour) || 0,
      partsAmount: parseFloat(parts) || 0,
      lineItems: normalizedLineItems,
      total,
      location,
      status: 'Sent',
      type: asInvoice ? 'invoice' : 'quote',
      createdAt: new Date().toISOString(),
    };
    saveJob(job);
    setLastSentJob(job);
    toast.success(asInvoice ? 'Invoice created!' : 'Quote sent!');
  };

  const resetForm = () => {
    setLastSentJob(null);
    setPhoto(null);
    setCustomerName('');
    setDescription('');
    setLabour('');
    setParts('');
    setLineItems([]);
  };

  // After sending — show preview + share
  if (lastSentJob) {
    const docType = lastSentJob.type === 'invoice' ? 'Invoice' : 'Quote';
    return (
      <div className="min-h-screen bg-background px-4 py-6 pb-24">
        <h2 className="text-2xl font-black text-foreground mb-1 text-center">✅ {docType} Created!</h2>
        <p className="text-muted-foreground text-center mb-5">Share it with your customer</p>

        <QuotePreview job={lastSentJob} />

        <div className="mt-6">
          <p className="text-lg font-bold text-foreground mb-3">Send via</p>
          <SharePanel job={lastSentJob} />
        </div>

        <button
          onClick={resetForm}
          className="w-full h-16 rounded-2xl bg-muted text-foreground text-xl font-bold mt-5 active:scale-[0.96] transition-transform"
        >
          ← New Job
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-24">
      <input type="file" accept="image/*" capture="environment" ref={fileRef} className="hidden" onChange={handlePhoto} />

      {/* Photo Button */}
      <button
        onClick={() => fileRef.current?.click()}
        className="w-full h-24 rounded-2xl bg-card border border-input flex items-center justify-center gap-3 active:scale-[0.97] transition-transform mb-4"
      >
        {photo ? (
          <img src={photo} alt="Job" className="h-20 w-20 rounded-xl object-cover" />
        ) : (
          <>
            <span className="text-4xl">📸</span>
            <span className="text-xl font-bold text-foreground">Snap Photo of Job</span>
          </>
        )}
      </button>

      {/* Voice Button */}
      <button
        onClick={handleVoice}
        className={`w-full h-20 rounded-2xl flex items-center justify-center gap-3 active:scale-[0.97] transition-all mb-4 ${
          isRecording
            ? 'text-destructive-foreground'
            : 'bg-primary text-primary-foreground'
        }`}
        style={isRecording ? { background: `linear-gradient(to right, hsl(var(--destructive)) ${recordingProgressPercent}%, hsl(var(--muted)) ${recordingProgressPercent}%)` } : undefined}
      >
        <span className="text-3xl">{isRecording ? '⏹' : '🎤'}</span>
        <span className="text-xl font-bold">{isRecording ? `Listening... ${Math.ceil(recordingRemainingMs / 1000)}s` : 'Speak Now'}</span>
      </button>

      {/* Location */}
      <p className="text-sm text-muted-foreground mb-4 text-center">📍 {location}</p>

      {/* Fields */}
      <div className="space-y-3 mb-5">
        <input
          type="text"
          placeholder="Customer Name"
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
          className="w-full h-14 rounded-2xl border border-input bg-card px-4 text-lg font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <textarea
          placeholder="Job Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-2xl border border-input bg-card px-4 py-3 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <div className="space-y-3">
          <input
            type="number"
            placeholder="Labour R"
            value={labour}
            onChange={e => setLabour(e.target.value)}
            className="w-full h-14 rounded-2xl border border-input bg-card px-4 text-lg font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="number"
            placeholder="Parts R"
            value={parts}
            onChange={e => setParts(e.target.value)}
            className="w-full h-14 rounded-2xl border border-input bg-card px-4 text-lg font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="rounded-2xl border border-input bg-card p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Line Items</p>
            <button
              onClick={() => setLineItems(prev => [...prev, { name: '', price: '' }])}
              className="px-3 py-1 rounded-lg bg-muted text-sm font-bold text-foreground"
            >
              + Add Item
            </button>
          </div>
          {lineItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">Add optional items under labour and parts.</p>
          ) : (
            <div className="space-y-2">
              {lineItems.map((item, idx) => (
                <div key={`line-item-${idx}`} className="grid grid-cols-[1fr_120px_34px] gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Item name"
                    value={item.name}
                    onChange={e => setLineItems(prev => prev.map((entry, entryIdx) => entryIdx === idx ? { ...entry, name: e.target.value } : entry))}
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={item.price}
                    onChange={e => setLineItems(prev => prev.map((entry, entryIdx) => entryIdx === idx ? { ...entry, price: e.target.value } : entry))}
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  />
                  <button
                    onClick={() => setLineItems(prev => prev.filter((_, entryIdx) => entryIdx !== idx))}
                    className="h-10 rounded-xl bg-destructive/10 text-destructive text-sm font-black"
                  >
                    ×
                  </button>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold pt-1">
                <span className="text-muted-foreground">Line items total</span>
                <span className="text-foreground">R {lineItemsTotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="text-right text-2xl font-black text-foreground pr-2">
          Total: R {total.toFixed(2)}
        </div>
      </div>

      {/* Live Quote Preview */}
      <QuotePreview job={{
        id: '',
        photo,
        voiceText: description,
        customerName: customerName || 'Customer',
        description: description || 'Job description...',
        labourAmount: parseFloat(labour) || 0,
        partsAmount: parseFloat(parts) || 0,
        lineItems: lineItems
          .map(item => ({ name: item.name.trim(), price: parseFloat(item.price) || 0 }))
          .filter(item => item.name && item.price > 0),
        total,
        location,
        status: 'Draft',
        type: 'quote',
        createdAt: new Date().toISOString(),
      }} />

      {/* Action Buttons */}
      <div className="flex gap-3 mt-5">
        <button
          onClick={() => handleSend(false)}
          className="flex-1 h-16 rounded-2xl bg-secondary text-secondary-foreground text-xl font-black active:scale-[0.96] transition-transform"
        >
          Send Quote
        </button>
        <button
          onClick={() => handleSend(true)}
          className="flex-1 h-16 rounded-2xl bg-primary text-primary-foreground text-xl font-black active:scale-[0.96] transition-transform"
        >
          Turn into Invoice
        </button>
      </div>
    </div>
  );
}
