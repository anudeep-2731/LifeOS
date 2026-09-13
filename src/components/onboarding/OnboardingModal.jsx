import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../ui/Icon';
import { saveCloudSetting, fetchUserProfileName } from '../../lib/supabase';
import { db } from '../../db/database';

const QUICK_BUDGET_CHIPS = [
  { daily: 300, label: '₹300/day', monthly: 9000 },
  { daily: 500, label: '₹500/day', monthly: 15000 },
  { daily: 1000, label: '₹1,000/day', monthly: 30000 },
  { daily: 1500, label: '₹1,500/day', monthly: 45000 },
];

export default function OnboardingModal({ isOpen, onClose, onCompleted }) {
  const [step, setStep] = useState(1); // 1: Tour, 2: Budget Setup, 3: Success
  const [dailyBudget, setDailyBudget] = useState(500);
  const [customInput, setCustomInput] = useState('500');
  const [userName, setUserName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      fetchUserProfileName().then(name => {
        if (name) setUserName(name);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectChip = (chip) => {
    setDailyBudget(chip.daily);
    setCustomInput(String(chip.daily));
  };

  const handleCustomChange = (e) => {
    const val = e.target.value;
    setCustomInput(val);
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      setDailyBudget(num);
    }
  };

  const handleFinishSetup = async () => {
    setIsSaving(true);
    try {
      const budgetNum = Number(dailyBudget) || 500;
      const monthlyNum = budgetNum * 30;

      await Promise.all([
        saveCloudSetting('dailyBudget', budgetNum),
        saveCloudSetting('monthlyBudget', monthlyNum),
        saveCloudSetting('has_onboarded', true),
        db.settings.put({ key: 'has_onboarded', value: true }),
        db.settings.put({ key: 'dailyBudget', value: budgetNum }),
        db.settings.put({ key: 'monthlyBudget', value: monthlyNum })
      ]);

      if (userName.trim()) {
        await db.settings.put({ key: 'user_full_name', value: userName.trim() });
      }

      setStep(3);
      setTimeout(() => {
        if (onCompleted) onCompleted();
        onClose();
      }, 1600);
    } catch (err) {
      console.error('Error saving onboarding data:', err);
      if (onCompleted) onCompleted();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="w-full max-w-lg bg-surface-container-lowest rounded-[32px] p-6 sm:p-8 shadow-2xl border border-outline-variant/30 flex flex-col gap-5 relative overflow-hidden"
        >
          {/* Top Step Progress Bar */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-primary' : 'bg-surface-container-high'
                }`}
              />
            ))}
          </div>

          {/* STEP 1: Animated App Introduction */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-4"
            >
              <div className="text-center space-y-1.5 pt-2">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-primary via-blue-600 to-indigo-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-primary/30 text-3xl">
                  🚀
                </div>
                <h2 className="font-headline text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
                  Welcome to LifeOS
                </h2>
                <p className="text-xs sm:text-sm text-outline max-w-sm mx-auto">
                  Your personal operating system for daily momentum, mindful spending, and squad accountability.
                </p>
              </div>

              {/* 3 Core Pillars Cards */}
              <div className="flex flex-col gap-2.5 my-1">
                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/15">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl shrink-0">
                    🌅
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-on-surface font-headline">Today's Cockpit &amp; Habits</h4>
                    <p className="text-[11px] text-outline">Build bulletproof morning routines and conquer top priorities daily.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/15">
                  <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center text-xl shrink-0">
                    👥
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-on-surface font-headline">Squad Accountability Circles</h4>
                    <p className="text-[11px] text-outline">Stay consistent with friends using live camera proof and scorecard factors.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/15">
                  <div className="w-10 h-10 rounded-xl bg-tertiary/15 text-tertiary flex items-center justify-center text-xl shrink-0">
                    💰
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-on-surface font-headline">Mindful Cashflow &amp; Envelopes</h4>
                    <p className="text-[11px] text-outline">Know exactly what is safe to spend today and track monthly burn with zero stress.</p>
                  </div>
                </div>
              </div>

              {/* Next Button */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold text-outline hover:text-on-surface transition-colors cursor-pointer px-3 py-2"
                >
                  Skip Tour
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white font-headline font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
                >
                  <span>Set Up My Budget</span>
                  <Icon name="arrow_forward" size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Key Information - Daily Budget */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <h3 className="font-headline text-xl sm:text-2xl font-black text-on-surface">
                    Set Your Daily Budget
                  </h3>
                </div>
                <p className="text-xs text-outline">
                  How much would you comfortably like to spend per day? We use this to compute your daily safe-to-spend pace.
                </p>
              </div>

              {/* Quick Chips */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-outline">
                  Popular Daily Targets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {QUICK_BUDGET_CHIPS.map((chip) => {
                    const isSelected = dailyBudget === chip.daily;
                    return (
                      <button
                        key={chip.daily}
                        type="button"
                        onClick={() => handleSelectChip(chip)}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer active:scale-95 ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-xs ring-2 ring-primary/20 scale-[1.02]'
                            : 'bg-surface-container-low text-on-surface border-outline-variant/20 hover:border-outline-variant/40'
                        }`}
                      >
                        <span className="font-mono text-sm font-bold block">{chip.label}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-outline'} block mt-0.5`}>
                          ₹{chip.monthly.toLocaleString('en-IN')}/mo
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Daily Budget Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-outline">
                  Or Custom Daily Target
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-lg font-bold text-primary font-mono">₹</span>
                  <input
                    type="number"
                    value={customInput}
                    onChange={handleCustomChange}
                    placeholder="500"
                    className="w-full h-12 pl-9 pr-24 rounded-2xl bg-surface-container-low text-primary font-mono text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary border border-outline-variant/20"
                  />
                  <span className="absolute right-3.5 text-xs text-outline font-semibold">
                    per day
                  </span>
                </div>
              </div>

              {/* Real-time Projection Card */}
              <div className="p-3.5 rounded-2xl bg-secondary-container/30 border border-secondary/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">💎</span>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-secondary tracking-wider block">
                      Estimated Monthly Budget
                    </span>
                    <span className="font-mono text-base font-black text-on-surface">
                      ₹{(dailyBudget * 30).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-outline font-medium">
                  30-day projection
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-outline hover:text-on-surface transition-colors cursor-pointer px-3 py-2"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinishSetup}
                  disabled={isSaving || !dailyBudget || dailyBudget <= 0}
                  className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white font-headline font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md active:scale-98 transition-all disabled:opacity-40 cursor-pointer"
                >
                  <span>{isSaving ? 'Configuring...' : 'Start Living with LifeOS'}</span>
                  <Icon name="check" size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Confetti & Ready Launch */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-10 text-center space-y-3"
            >
              <div className="w-20 h-20 rounded-full bg-secondary/15 text-secondary flex items-center justify-center mx-auto text-4xl shadow-inner animate-bounce">
                🎉
              </div>
              <h3 className="font-headline text-2xl font-black text-on-surface">
                You're Ready to Roll!
              </h3>
              <p className="text-xs text-outline max-w-xs mx-auto">
                Daily budget set to <strong className="text-primary font-mono">₹{dailyBudget}</strong>. Entering your cockpit...
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
