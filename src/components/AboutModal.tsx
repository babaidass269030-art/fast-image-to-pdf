import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Info,
  Heart,
  Mail,
  Star,
  ExternalLink,
  Lock,
  Smartphone,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { START_IO_CONFIG } from '../utils/startIoBridge';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'about' | 'privacy' | 'feedback';
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'about',
}) => {
  const [activeTab, setActiveTab] = useState<'about' | 'privacy' | 'feedback'>(defaultTab);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [rating, setRating] = useState<number | null>(null);

  if (!isOpen) return null;

  const appVersion = '1.0.0';
  const developerName = 'Fast PDF Team';
  const contactEmail = 'avijitdas58@gmail.com';

  const handleRate = (stars: number) => {
    setRating(stars);
  };

  const handleSendFeedbackEmail = () => {
    const subject = encodeURIComponent(`Feedback: Fast Image to PDF Converter v${appVersion}`);
    const body = encodeURIComponent(
      `Hello Fast PDF Team,\n\nHere is my feedback/suggestion:\n\n`
    );
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
    setFeedbackSent(true);
  };

  return (
    <div
      id="modal-about-privacy"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              {activeTab === 'privacy' ? (
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              ) : activeTab === 'feedback' ? (
                <Heart className="w-4 h-4 text-rose-500" />
              ) : (
                <Info className="w-4 h-4 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-none">
                {activeTab === 'privacy'
                  ? 'Privacy Policy'
                  : activeTab === 'feedback'
                  ? 'Rate & Feedback'
                  : 'About Fast PDF'}
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Version {appVersion}</p>
            </div>
          </div>

          <button
            id="btn-close-about-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="px-6 pt-3 pb-1 border-b border-gray-100 bg-white flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
              activeTab === 'about'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            About
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
              activeTab === 'privacy'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
              activeTab === 'feedback'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Feedback
          </button>
        </div>

        {/* Modal Scrollable Content Area */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-gray-700 leading-relaxed">
          {/* TAB 1: ABOUT */}
          {activeTab === 'about' && (
            <div className="space-y-5">
              <div className="text-center py-2">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white mx-auto flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-500/20 mb-3">
                  PDF
                </div>
                <h4 className="text-lg font-bold text-gray-900">Fast Image to PDF Converter</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                  A simple, fast, reliable, and private utility to convert photos and images into clean PDF documents directly on your device.
                </p>
              </div>

              {/* Key Highlights */}
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <Lock className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-900">100% On-Device Processing</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Your photos and generated PDFs never leave your phone. All image conversions happen purely locally inside the application.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <Smartphone className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-900">No Account Required</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Zero login, zero cloud databases, and zero artificial limits. Open the app, select images, create your PDF, and you are done.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <EyeOff className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-900">Non-Intrusive Experience</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      No deceptive buttons or full-screen interruptions during photo selection or PDF generation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Developer Metadata Box */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Developer</span>
                  <span className="font-bold text-gray-900">{developerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Version</span>
                  <span className="font-bold text-gray-900">{appVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Contact</span>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    {contactEmail}
                  </a>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-blue-100/60">
                  <span className="text-gray-500 font-medium">More Tools</span>
                  <a
                    href="https://quicktoolboxfree.blogspot.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span>Quick Toolbox</span>
                    <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-semibold">
                  Privacy First: Your files and photos never leave your device.
                </span>
              </div>

              <div>
                <h5 className="font-bold text-gray-900 text-sm mb-1">1. Image & File Handling</h5>
                <p className="text-gray-600 leading-relaxed">
                  Fast Image to PDF Converter processes all selected images (JPG, PNG, WebP) and generates PDF documents entirely on your local device. We do <strong>not</strong> upload, transmit, store, or analyze your images or PDFs on any external server or cloud storage.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-gray-900 text-sm mb-1">2. Android Permissions Used</h5>
                <ul className="list-disc pl-4 space-y-1 text-gray-600 mt-1">
                  <li>
                    <strong>Photos & Media (Storage Access):</strong> Used solely to allow you to select images from your gallery to include in your PDF document.
                  </li>
                  <li>
                    <strong>Internet & Network State:</strong> Used exclusively to deliver advertising through the Start.io mobile ad network.
                  </li>
                </ul>
              </div>

              <div>
                <h5 className="font-bold text-gray-900 text-sm mb-1">3. Advertising & Analytics</h5>
                <p className="text-gray-600 leading-relaxed">
                  To keep this utility free for everyone, this application integrates the official <strong>Start.io (formerly StartApp)</strong> SDK for non-intrusive banner advertisements. Start.io may collect standard technical device identifiers, general location (e.g. country/city IP), and app usage metrics in accordance with Start.io's Privacy Policy to serve relevant ads. Start.io does not have access to your photos, files, or document contents.
                </p>
                <p className="text-gray-500 mt-1">
                  You can learn more at Start.io's Privacy Policy at:{' '}
                  <a
                    href="https://www.start.io/policy/privacy-policy/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-medium"
                  >
                    start.io/policy/privacy-policy <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                </p>
              </div>

              <div>
                <h5 className="font-bold text-gray-900 text-sm mb-1">4. No Account or Personal Data Collection</h5>
                <p className="text-gray-600 leading-relaxed">
                  We do not require user registration, email logins, passwords, or personal identity information to use this app.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-gray-900 text-sm mb-1">5. Contact Information</h5>
                <p className="text-gray-600 leading-relaxed">
                  If you have questions about this Privacy Policy or your data, please contact the developer at:{' '}
                  <a href={`mailto:${contactEmail}`} className="text-blue-600 font-semibold hover:underline">
                    {contactEmail}
                  </a>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: FEEDBACK & RATING */}
          {activeTab === 'feedback' && (
            <div className="space-y-5 text-center">
              <div>
                <h4 className="text-base font-bold text-gray-900 mb-1">How is your experience?</h4>
                <p className="text-xs text-gray-500">
                  Your rating helps us improve Fast PDF for everyone.
                </p>
              </div>

              {/* Interactive Star Rating */}
              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRate(star)}
                    className="p-1 text-gray-300 hover:text-amber-400 transition-colors transform hover:scale-125 active:scale-95"
                    title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`w-8 h-8 ${
                        (rating !== null && star <= rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-300 hover:text-amber-400'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {rating !== null && (
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-900 text-xs font-semibold animate-in fade-in">
                  Thank you for rating {rating} / 5 stars! ⭐
                </div>
              )}

              {/* Direct Feedback Button */}
              <div className="pt-2 border-t border-gray-100">
                <button
                  id="btn-send-feedback-email"
                  type="button"
                  onClick={handleSendFeedbackEmail}
                  className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send Direct Feedback / Suggestion</span>
                </button>
                {feedbackSent && (
                  <p className="text-xs text-emerald-600 mt-2 font-medium">
                    Opening your email client...
                  </p>
                )}
                <p className="text-[11px] text-gray-400 mt-2">
                  Feedback is always optional. We never interrupt your workflow with forced review pop-ups.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            id="btn-close-about-bottom"
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-gray-900 hover:bg-black active:bg-gray-800 text-white font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
