import { useState } from 'react';
import BottomSheet from './BottomSheet';
import Icon from './Icon';
import { parseAlert } from '../../lib/parser';
import { db, getTodayStr } from '../../db/database';
import { initGmail, authenticate, fetchBankEmails } from '../../lib/gmail';
import { parseTransactionWithAI, askGemini } from '../../lib/ai';

export default function SmartImportSheet({ isOpen, onClose, onSave }) {
  const [isFetching, setIsFetching] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [importedRows, setImportedRows] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const handleGmailFetch = async () => {
    setIsFetching(true);
    setImportSummary(null);
    setImportedRows([]);
    setStatusMsg('Connecting to Gmail...');
    
    let imported = 0;
    let skipped = 0;
    let duplicates = 0;
    const rows = [];

    try {
      const clientIdObj = await db.settings.get('gmailClientId');
      if (!clientIdObj) throw new Error('Gmail Client ID not set in Settings.');

      await initGmail(clientIdObj.value);
      await authenticate();
      
      setStatusMsg('Fetching bank alerts for the current month...');
      const emails = await fetchBankEmails(50); 
      
      if (emails.length === 0) {
        setStatusMsg('No bank alert emails found for the current month.');
        return;
      }

      setStatusMsg(`Processing ${emails.length} emails...`);

      for (const email of emails) {
        let usedAI = false;

        // 1. Try regex parser first (uses snippet which is short and reliable)
        let result = parseAlert(email.snippet);
        
        // 2. If regex confidence is low, try AI with full body
        if (!result || result.confidence < 0.4) {
          const textToAnalyze = email.fullBody || email.snippet;
          const aiResult = await parseTransactionWithAI(textToAnalyze);
          if (aiResult && aiResult.amount) {
            result = { ...aiResult };
            usedAI = true;
          }
        }

        // 3. Skip if still no amount
        if (!result || !result.amount) {
          skipped++;
          continue;
        }

        // 3b. If description is missing/unknown, ask AI for merchant name
        if (!result.description || result.description.toLowerCase() === 'unknown') {
          const shortBody = (email.fullBody || email.snippet || '').substring(0, 300);
          const merchant = await askGemini(
            `Extract only the merchant/store name (2-4 words max) from this bank alert. Return just the name, nothing else: "${shortBody}"`
          );
          result.description = merchant?.trim().replace(/"/g, '').substring(0, 50) || 'Other Purchase';
          usedAI = true;
        }

        // 4. Use email date (most accurate) - email.internalDate is YYYY-MM-DD
        const entryDate = email.internalDate || getTodayStr();

        // 5. Deduplication
        const existing = await db.expenses
          .where({ date: entryDate, amount: Number(result.amount) })
          .filter(e => e.description?.toLowerCase() === (result.description || '').trim().toLowerCase())
          .first();

        if (existing) {
          duplicates++;
          continue;
        }

        // 6. Add to DB — include emailBody for validation
        const now = new Date();
        const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const emailBody = email.fullBody || email.snippet || '';

        const id = await db.expenses.add({
          date: entryDate,
          timestamp,
          amount: Number(result.amount),
          category: result.category || 'Other',
          description: (result.description || 'Other Purchase').trim(),
          emailBody: emailBody.substring(0, 800), // cap storage
        });
        
        rows.push({
          id,
          date: entryDate,
          amount: Number(result.amount),
          description: (result.description || 'Other Purchase').trim(),
          category: result.category || 'Other',
          emailBody: emailBody.substring(0, 300),
          subject: email.subject,
          usedAI,
        });
        imported++;
      }

      setImportedRows(rows);
      setImportSummary({ imported, skipped, duplicates, total: emails.length });
      setStatusMsg('Import complete!');
      onSave();
    } catch (err) {
      console.error(err);
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setIsFetching(false);
    }
  };

  const handleClose = () => {
    setImportSummary(null);
    setImportedRows([]);
    setStatusMsg('');
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Smart Gmail Import">
      <div className="space-y-5">
        {/* Info Banner */}
        <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
          <p className="text-xs text-primary font-semibold mb-1 flex items-center gap-2">
            <Icon name="auto_awesome" size={14} />
            AI-Enhanced Import
          </p>
          <p className="text-xs text-outline leading-relaxed">
            Scans Gmail for bank alerts from the current month. Saves the transaction date from the email and stores the original message for your validation.
          </p>
        </div>

        {/* Action Button */}
        {!importSummary ? (
          <button
            onClick={handleGmailFetch}
            disabled={isFetching}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 transition-all font-bold py-4 shadow-gradient"
          >
            <Icon
              name={isFetching ? 'sync' : 'google'}
              size={18}
              className={isFetching ? 'animate-spin' : ''}
            />
            {isFetching ? 'Importing...' : 'Start Month Import'}
          </button>
        ) : (
          <button onClick={handleClose} className="btn-primary w-full py-4 font-bold shadow-gradient">
            Done
          </button>
        )}

        {/* Status Tracker */}
        {statusMsg && (
          <div className="flex flex-col items-center gap-2 py-2">
            {isFetching && (
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
            <p className="text-sm font-medium text-on-surface text-center px-4">{statusMsg}</p>
          </div>
        )}

        {/* Results Summary */}
        {importSummary && (
          <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/30 space-y-4 shadow-card">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-black text-primary">{importSummary.imported}</p>
                <p className="text-[10px] font-bold text-outline uppercase">Imported</p>
              </div>
              <div className="text-center border-x border-outline-variant/30">
                <p className="text-2xl font-black text-secondary">{importSummary.duplicates}</p>
                <p className="text-[10px] font-bold text-outline uppercase">Duplicates</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-outline-variant">{importSummary.skipped}</p>
                <p className="text-[10px] font-bold text-outline uppercase">Skipped</p>
              </div>
            </div>
            <div className="pt-2 border-t border-outline-variant/30">
              <p className="text-[11px] text-center text-outline">
                Scanned <strong>{importSummary.total}</strong> emails from the current month.
              </p>
            </div>
          </div>
        )}

        {/* Imported Transactions Detail — for validation */}
        {importedRows.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-outline-variant px-1">
              Imported Transactions
            </p>
            {importedRows.map((row) => (
              <div key={row.id} className="bg-surface-container-lowest rounded-2xl shadow-card border border-outline-variant/10 overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 p-4 text-left"
                  onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-on-surface truncate">{row.description}</p>
                      {row.usedAI && (
                        <span className="flex-shrink-0 text-[9px] font-black text-primary bg-primary/10 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                          <Icon name="auto_awesome" size={9} /> AI
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-outline">{row.date} · {row.category}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-headline font-bold text-tertiary">–₹{row.amount.toLocaleString()}</span>
                    <Icon name={expandedId === row.id ? 'expand_less' : 'expand_more'} size={16} className="text-outline-variant" />
                  </div>
                </button>
                {expandedId === row.id && row.emailBody && (
                  <div className="px-4 pb-4">
                    <div className="bg-surface-container rounded-xl p-3 border border-outline-variant/20">
                      <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Original Email</p>
                      {row.subject && <p className="text-xs font-semibold text-on-surface mb-1">{row.subject}</p>}
                      <p className="text-[11px] text-outline font-mono leading-relaxed whitespace-pre-wrap break-words">{row.emailBody}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
