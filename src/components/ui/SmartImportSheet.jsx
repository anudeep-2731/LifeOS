import { useState } from 'react';
import BottomSheet from './BottomSheet';
import Icon from './Icon';
import { parseAlert } from '../../lib/parser';
import { db, getTodayStr } from '../../db/database';
import { initGmail, authenticate, fetchBankEmails } from '../../lib/gmail';

export default function SmartImportSheet({ isOpen, onClose, onSave }) {
  const [isFetching, setIsFetching] = useState(false);
  const [foundEmails, setFoundEmails] = useState([]);
  const [importedIds, setImportedIds] = useState(new Set());
  const [statusMsg, setStatusMsg] = useState('');

  const handleGmailFetch = async () => {
    setIsFetching(true);
    setFoundEmails([]);
    setImportedIds(new Set());
    setStatusMsg('');
    try {
      const clientIdObj = await db.settings.get('gmailClientId');
      if (!clientIdObj) throw new Error('Gmail Client ID not set in Settings.');

      await initGmail(clientIdObj.value);
      await authenticate();
      const emails = await fetchBankEmails(7); // past 7 days
      if (emails.length === 0) {
        setStatusMsg('No bank alert emails found in the last 7 days.');
      } else {
        setFoundEmails(emails);
        setStatusMsg(`Found ${emails.length} alert(s). Tap one to import it.`);
      }
    } catch (err) {
      console.error(err);
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSelectEmail = async (email) => {
    if (importedIds.has(email.id)) return; // already imported

    const snippet = email.snippet;
    const result = parseAlert(snippet);

    if (!result || !result.amount) {
      setStatusMsg(`⚠️ Could not parse amount from: "${email.subject}". Skipping.`);
      return;
    }

    // Deduplication check
    const entryDate = result.date || getTodayStr();
    const existing = await db.expenses
      .where({ date: entryDate, amount: Number(result.amount) })
      .filter(e => e.description.toLowerCase() === result.description.trim().toLowerCase())
      .first();

    if (existing) {
      setStatusMsg(`Already imported: ₹${result.amount} – ${result.description} on ${entryDate}`);
      setImportedIds(prev => new Set([...prev, email.id]));
      return;
    }

    // Save to DB
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    await db.expenses.add({
      date: entryDate,
      timestamp,
      amount: Number(result.amount),
      category: result.category,
      description: result.description.trim(),
    });

    setImportedIds(prev => new Set([...prev, email.id]));
    setStatusMsg(`✅ Imported ₹${result.amount} – ${result.description}`);
    onSave();
  };

  const handleClose = () => {
    setFoundEmails([]);
    setImportedIds(new Set());
    setStatusMsg('');
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Import from Gmail">
      <div className="space-y-5">

        {/* Info Banner */}
        <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
          <p className="text-xs text-primary font-semibold mb-1 flex items-center gap-2">
            <Icon name="info" size={14} />
            How it works
          </p>
          <p className="text-xs text-outline leading-relaxed">
            Click the button below to connect Gmail and auto-fetch your bank debit alerts from the last 7 days. Tap any alert to instantly import it.
          </p>
        </div>

        {/* Fetch Button */}
        <button
          onClick={handleGmailFetch}
          disabled={isFetching}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:grayscale transition-all"
        >
          <Icon
            name={isFetching ? 'sync' : 'mail'}
            size={16}
            className={isFetching ? 'animate-spin' : ''}
          />
          {isFetching ? 'Connecting to Gmail…' : 'Import from Gmail'}
        </button>

        {/* Status message */}
        {statusMsg && (
          <p className="text-xs text-center text-outline">{statusMsg}</p>
        )}

        {/* Email list */}
        {foundEmails.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto rounded-2xl">
            {foundEmails.map(email => {
              const done = importedIds.has(email.id);
              return (
                <button
                  key={email.id}
                  onClick={() => handleSelectEmail(email)}
                  disabled={done}
                  className={`w-full text-left p-3 rounded-xl transition-all active:scale-[0.98] border ${
                    done
                      ? 'bg-surface-container border-transparent opacity-50 cursor-default'
                      : 'bg-surface-container-high border-transparent hover:border-primary/20 hover:bg-surface-container-highest'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-outline truncate">{email.subject}</p>
                      <p className="text-xs text-on-surface line-clamp-2 mt-0.5">{email.snippet}</p>
                    </div>
                    {done ? (
                      <Icon name="check_circle" size={16} className="text-primary shrink-0 mt-0.5" />
                    ) : (
                      <Icon name="download" size={16} className="text-outline-variant shrink-0 mt-0.5" />
                    )}
                  </div>
                  <p className="text-[9px] text-outline-variant mt-1 text-right">{email.date}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
