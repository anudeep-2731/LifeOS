import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../ui/Icon';
import { saveCloudSetting } from '../../lib/supabase';
import { db } from '../../db/database';

export default function OnboardingModal({ isOpen, onClose, onCompleted }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = async (event) => {
      if (event.data && event.data.type === 'LIFEOS_ONBOARDING_SKIP') {
        onClose();
        return;
      }

      if (event.data && event.data.type === 'LIFEOS_ONBOARDING_COMPLETE') {
        const daily = Number(event.data.dailyBudget) || 850;
        const monthly = daily * 30;

        try {
          await Promise.all([
            saveCloudSetting('dailyBudget', daily),
            saveCloudSetting('monthlyBudget', monthly),
            saveCloudSetting('has_onboarded', true),
            db.settings.put({ key: 'has_onboarded', value: true }),
            db.settings.put({ key: 'dailyBudget', value: daily }),
            db.settings.put({ key: 'monthlyBudget', value: monthly })
          ]);
        } catch (err) {
          console.error('Error saving onboarding completion:', err);
        }

        setTimeout(() => {
          if (onCompleted) onCompleted();
          onClose();
        }, 600);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, onClose, onCompleted]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-lg">
        {/* Embedded Game Experience Frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="w-full h-full max-w-[430px] sm:max-h-[890px] sm:rounded-[40px] overflow-hidden shadow-2xl relative bg-[#eef3fb]"
        >
          <iframe
            src="/onboarding.html"
            title="LifeOS Awakening Experience"
            className="w-full h-full border-0"
            allow="autoplay"
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
