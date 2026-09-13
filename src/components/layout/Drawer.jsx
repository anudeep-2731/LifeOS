import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import { db } from '../../db/database';
import FinanceSettingsSheet from '../ui/FinanceSettingsSheet';
import ImageCropperModal from '../ui/ImageCropperModal';
import { getSupabase, fetchUserProfileAvatar, updateUserProfileAvatar } from '../../lib/supabase';
import { compressImage } from '../../lib/imageUtils';

export default function Drawer({ isOpen, onClose }) {
  const [showFinanceSettings, setShowFinanceSettings] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedRawFile, setSelectedRawFile] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      const client = await getSupabase();
      if (client) {
        const { data: { session } } = await client.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setUserEmail(session.user.email || '');
          const metaName = session.user.user_metadata?.full_name;
          if (metaName) {
            setUserName(metaName);
          } else {
            const cachedName = await db.settings.get('user_full_name');
            setUserName(cachedName?.value || session.user.email?.split('@')[0] || 'User');
          }
        } else {
          setUser(null);
          setUserEmail('');
          setUserName('');
        }
      }

      const currentAvatar = await fetchUserProfileAvatar();
      if (currentAvatar) setAvatarUrl(currentAvatar);
    };
    if (isOpen) loadUser();
  }, [isOpen]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedRawFile(file);
    setShowCropper(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = async (croppedBlob) => {
    setShowCropper(false);
    setSelectedRawFile(null);
    setUploading(true);
    try {
      const compressed = await compressImage(croppedBlob);
      const newAvatarUrl = await updateUserProfileAvatar(compressed);
      setAvatarUrl(newAvatarUrl);
    } catch (err) {
      console.error('Failed to upload profile picture:', err);
      alert('Could not upload profile picture. Please try another image.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogOut = async () => {
    const client = await getSupabase();
    if (client) {
      await client.auth.signOut();
    }
    await Promise.all([
      db.tasks.clear(),
      db.routines.clear(),
      db.expenses.clear(),
      db.holdings.clear(),
      db.settings.clear(),
      db.userStats.clear(),
    ]);
    setUser(null);
    setUserName('');
    setUserEmail('');
    onClose();
    window.location.href = '/login';
  };

  if (!isOpen) return null;

  const initialLetter = userName ? userName[0].toUpperCase() : userEmail ? userEmail[0].toUpperCase() : 'G';

  return (
    <>
      {/* Hidden File Input for Avatar Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Content */}
      <div className="fixed top-0 left-0 h-full w-80 bg-surface-container-low z-[70] shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">

        {/* Header User Profile */}
        <div className="p-6 pt-12 flex items-center justify-between border-b border-outline-variant/10">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Interactive Avatar Button with Camera Badge */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="relative group w-12 h-12 rounded-full primary-gradient text-white flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0 overflow-hidden border-2 border-white/40 active:scale-95 transition-transform"
              title="Upload Profile Picture"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                initialLetter
              )}

              {/* Camera Hover Badge */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                {uploading ? (
                  <Icon name="sync" className="animate-spin text-sm" />
                ) : (
                  <Icon name="photo_camera" className="text-sm" />
                )}
              </div>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="font-headline font-bold text-base text-on-surface truncate">
                  {userName || (user ? 'Account User' : 'Guest User')}
                </h2>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary hover:text-primary-container text-[11px] font-bold underline shrink-0"
                >
                  Edit Photo
                </button>
              </div>
              <p className="text-xs text-outline truncate">
                {userEmail || 'Local Mode'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-outline hover:text-on-surface flex-shrink-0">
            <Icon name="close" size={24} />
          </button>
        </div>

        {/* Links / Options */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">

          <p className="text-[10px] font-bold text-outline uppercase tracking-widest ml-2 mb-2 pt-2">Menu & Preferences</p>

          <button
            onClick={() => {
              fileInputRef.current?.click();
            }}
            className="w-full p-3 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-high transition-colors flex items-center justify-between text-left shadow-xs border border-outline-variant/15"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon name="account_circle" size={20} />
              </div>
              <div>
                <p className="text-xs font-headline font-bold text-on-surface">Upload Profile Picture</p>
                <p className="text-[10px] text-outline">Change account avatar photo</p>
              </div>
            </div>
            <Icon name="chevron_right" size={18} className="text-outline" />
          </button>

          <button
            onClick={() => {
              onClose();
              setShowFinanceSettings(true);
            }}
            className="w-full p-3 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-high transition-colors flex items-center justify-between text-left shadow-xs border border-outline-variant/15"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                <Icon name="tune" size={20} />
              </div>
              <div>
                <p className="text-xs font-headline font-bold text-on-surface">Finance Settings</p>
                <p className="text-[10px] text-outline">Target budget & categories</p>
              </div>
            </div>
            <Icon name="chevron_right" size={18} className="text-outline" />
          </button>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/10 flex flex-col gap-2">
          {user ? (
            <button
              onClick={handleLogOut}
              className="w-full py-3 px-4 rounded-2xl bg-error-container/40 text-error hover:bg-error-container transition-colors font-headline font-bold text-xs flex items-center justify-center gap-2"
            >
              <Icon name="logout" size={18} />
              <span>Log Out</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onClose();
                navigate('/login');
              }}
              className="w-full py-3 px-4 rounded-2xl bg-primary text-on-primary font-headline font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
            >
              <Icon name="login" size={18} />
              <span>Log In / Sync</span>
            </button>
          )}
        </div>
      </div>

      <FinanceSettingsSheet
        isOpen={showFinanceSettings}
        onClose={() => setShowFinanceSettings(false)}
      />

      <ImageCropperModal
        isOpen={showCropper}
        imageFile={selectedRawFile}
        onClose={() => {
          setShowCropper(false);
          setSelectedRawFile(null);
        }}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
        circularCrop={true}
        title="Crop Profile Picture"
      />
    </>
  );
}
