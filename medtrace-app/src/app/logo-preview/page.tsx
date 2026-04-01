"use client";

export default function LogoPreviewPage() {
  return (
    <div className="min-h-screen bg-[#0C0F0E] p-12">
      <h1 className="text-2xl font-bold text-[#F0FDF4] mb-2">MedTrace Logo Options</h1>
      <p className="text-sm text-[#6B7280] mb-12">Select your preferred logo. Each shown at multiple sizes on dark and light backgrounds.</p>

      <div className="grid grid-cols-1 gap-16">

        {/* === LOGO 1: Heartbeat Shield === */}
        <div>
          <h2 className="text-lg font-semibold text-[#D1D5DB] mb-1">Option 1 — Heartbeat Shield</h2>
          <p className="text-xs text-[#6B7280] mb-4">A shield shape with an integrated EKG heartbeat line. Represents protection + vital monitoring.</p>
          <div className="flex items-end gap-6">
            {[64, 48, 36].map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="14" fill="url(#g1)" />
                  <path d="M24 6C16 6 8 12 8 22C8 34 24 44 24 44C24 44 40 34 40 22C40 12 32 6 24 6Z" fill="white" fillOpacity="0.12" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
                  <path d="M12 24 L18 24 L20 18 L24 32 L28 16 L30 24 L36 24" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="24" cy="11" r="2.5" fill="#4ADE80" />
                  <path d="M22.5 10 L24 8 L25.5 10" stroke="white" strokeWidth="1" strokeLinecap="round" />
                  <defs><linearGradient id="g1" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#166534"/><stop offset="1" stopColor="#14532D"/></linearGradient></defs>
                </svg>
                <span className="text-[9px] text-[#6B7280]">{s}px</span>
              </div>
            ))}
            <div className="bg-white rounded-xl p-4 flex gap-4">
              <svg width={48} height={48} viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="14" fill="url(#g1b)" />
                <path d="M24 6C16 6 8 12 8 22C8 34 24 44 24 44C24 44 40 34 40 22C40 12 32 6 24 6Z" fill="white" fillOpacity="0.12" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
                <path d="M12 24 L18 24 L20 18 L24 32 L28 16 L30 24 L36 24" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="24" cy="11" r="2.5" fill="#4ADE80" />
                <path d="M22.5 10 L24 8 L25.5 10" stroke="white" strokeWidth="1" strokeLinecap="round" />
                <defs><linearGradient id="g1b" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#166534"/><stop offset="1" stopColor="#14532D"/></linearGradient></defs>
              </svg>
              <span className="text-xs text-gray-400 self-center">on light</span>
            </div>
          </div>
        </div>

        {/* === LOGO 2: Pulse M (current refined) === */}
        <div>
          <h2 className="text-lg font-semibold text-[#D1D5DB] mb-1">Option 2 — Pulse M</h2>
          <p className="text-xs text-[#6B7280] mb-4">The letter M formed by a heartbeat pulse line with a medical cross. Clean and modern.</p>
          <div className="flex items-end gap-6">
            {[64, 48, 36].map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="12" fill="url(#g2)" />
                  <path d="M10 26 L15 26 L19 12 L24 36 L29 12 L33 26 L38 26" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="21" y="5" width="6" height="2.5" rx="1.25" fill="#4ADE80" />
                  <rect x="22.75" y="3.5" width="2.5" height="6" rx="1.25" fill="#4ADE80" />
                  <defs><linearGradient id="g2" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#166534"/><stop offset="1" stopColor="#14532D"/></linearGradient></defs>
                </svg>
                <span className="text-[9px] text-[#6B7280]">{s}px</span>
              </div>
            ))}
            <div className="bg-white rounded-xl p-4 flex gap-4">
              <svg width={48} height={48} viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="12" fill="url(#g2b)" />
                <path d="M10 26 L15 26 L19 12 L24 36 L29 12 L33 26 L38 26" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="21" y="5" width="6" height="2.5" rx="1.25" fill="#4ADE80" />
                <rect x="22.75" y="3.5" width="2.5" height="6" rx="1.25" fill="#4ADE80" />
                <defs><linearGradient id="g2b" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#166534"/><stop offset="1" stopColor="#14532D"/></linearGradient></defs>
              </svg>
              <span className="text-xs text-gray-400 self-center">on light</span>
            </div>
          </div>
        </div>

        {/* === LOGO 3: Stethoscope Circle === */}
        <div>
          <h2 className="text-lg font-semibold text-[#D1D5DB] mb-1">Option 3 — Stethoscope Ring</h2>
          <p className="text-xs text-[#6B7280] mb-4">A minimalist stethoscope forming a circular shape with a heartbeat inside. Premium medical feel.</p>
          <div className="flex items-end gap-6">
            {[64, 48, 36].map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="14" fill="url(#g3)" />
                  <circle cx="24" cy="25" r="13" stroke="white" strokeWidth="2" strokeOpacity="0.25" />
                  <path d="M18 10 C18 10 18 18 18 20 C18 24 20 26 24 26" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <path d="M30 10 C30 10 30 18 30 20 C30 24 28 26 24 26" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="24" cy="26" r="2" fill="#4ADE80" />
                  <path d="M24 28 L24 34" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="24" cy="36" r="2.5" stroke="#4ADE80" strokeWidth="1.5" fill="none" />
                  <path d="M16 25 L20 25 L22 21 L24 29 L26 21 L28 25 L32 25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6" />
                  <defs><linearGradient id="g3" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#166534"/><stop offset="1" stopColor="#14532D"/></linearGradient></defs>
                </svg>
                <span className="text-[9px] text-[#6B7280]">{s}px</span>
              </div>
            ))}
            <div className="bg-white rounded-xl p-4 flex gap-4">
              <svg width={48} height={48} viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="14" fill="url(#g3b)" />
                <circle cx="24" cy="25" r="13" stroke="white" strokeWidth="2" strokeOpacity="0.25" />
                <path d="M18 10 C18 10 18 18 18 20 C18 24 20 26 24 26" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M30 10 C30 10 30 18 30 20 C30 24 28 26 24 26" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <circle cx="24" cy="26" r="2" fill="#4ADE80" />
                <path d="M24 28 L24 34" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="24" cy="36" r="2.5" stroke="#4ADE80" strokeWidth="1.5" fill="none" />
                <path d="M16 25 L20 25 L22 21 L24 29 L26 21 L28 25 L32 25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6" />
                <defs><linearGradient id="g3b" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#166534"/><stop offset="1" stopColor="#14532D"/></linearGradient></defs>
              </svg>
              <span className="text-xs text-gray-400 self-center">on light</span>
            </div>
          </div>
        </div>

        {/* === LOGO 4: DNA Helix Cross === */}
        <div>
          <h2 className="text-lg font-semibold text-[#D1D5DB] mb-1">Option 4 — DNA Cross</h2>
          <p className="text-xs text-[#6B7280] mb-4">A DNA double helix intertwined with a medical cross. Represents genomics + clinical care fusion.</p>
          <div className="flex items-end gap-6">
            {[64, 48, 36].map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="12" fill="url(#g4)" />
                  {/* Cross */}
                  <rect x="20" y="8" width="8" height="32" rx="4" fill="white" fillOpacity="0.15" />
                  <rect x="8" y="20" width="32" height="8" rx="4" fill="white" fillOpacity="0.15" />
                  {/* DNA helix strands */}
                  <path d="M16 10 C20 14 28 14 32 10 C28 18 20 18 16 22 C20 26 28 26 32 22 C28 30 20 30 16 34 C20 38 28 38 32 34" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" fill="none" />
                  <path d="M16 10 C20 14 28 14 32 10" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" strokeOpacity="0.5" />
                  {/* Cross bars (DNA rungs) */}
                  <line x1="19" y1="12" x2="29" y2="12" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
                  <line x1="18" y1="18" x2="30" y2="18" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
                  <line x1="18" y1="24" x2="30" y2="24" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
                  <line x1="18" y1="30" x2="30" y2="30" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
                  <line x1="19" y1="36" x2="29" y2="36" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
                  <defs><linearGradient id="g4" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#166534"/><stop offset="1" stopColor="#14532D"/></linearGradient></defs>
                </svg>
                <span className="text-[9px] text-[#6B7280]">{s}px</span>
              </div>
            ))}
            <div className="bg-white rounded-xl p-4 flex gap-4">
              <svg width={48} height={48} viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="12" fill="url(#g4b)" />
                <rect x="20" y="8" width="8" height="32" rx="4" fill="white" fillOpacity="0.15" />
                <rect x="8" y="20" width="32" height="8" rx="4" fill="white" fillOpacity="0.15" />
                <path d="M16 10 C20 14 28 14 32 10 C28 18 20 18 16 22 C20 26 28 26 32 22 C28 30 20 30 16 34 C20 38 28 38 32 34" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" fill="none" />
                <line x1="19" y1="12" x2="29" y2="12" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
                <line x1="18" y1="18" x2="30" y2="18" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
                <line x1="18" y1="24" x2="30" y2="24" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
                <line x1="18" y1="30" x2="30" y2="30" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
                <line x1="19" y1="36" x2="29" y2="36" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
                <defs><linearGradient id="g4b" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#166534"/><stop offset="1" stopColor="#14532D"/></linearGradient></defs>
              </svg>
              <span className="text-xs text-gray-400 self-center">on light</span>
            </div>
          </div>
        </div>

        {/* === LOGO 5: Heart + Leaf === */}
        <div>
          <h2 className="text-lg font-semibold text-[#D1D5DB] mb-1">Option 5 — Heart Leaf</h2>
          <p className="text-xs text-[#6B7280] mb-4">A heart shape with a leaf/organic element. Represents care, life, and natural healing. Warm and approachable.</p>
          <div className="flex items-end gap-6">
            {[64, 48, 36].map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="14" fill="url(#g5)" />
                  {/* Heart */}
                  <path d="M24 38 C24 38 10 28 10 19 C10 14 14 10 19 10 C21.5 10 23.5 11.5 24 13 C24.5 11.5 26.5 10 29 10 C34 10 38 14 38 19 C38 28 24 38 24 38Z" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.5" />
                  {/* Leaf inside heart */}
                  <path d="M24 18 C24 18 20 22 20 27 C20 30 22 32 24 32 C26 32 28 30 28 27 C28 22 24 18 24 18Z" fill="#4ADE80" fillOpacity="0.8" />
                  {/* Leaf vein */}
                  <path d="M24 19 L24 31" stroke="white" strokeWidth="0.8" strokeOpacity="0.6" />
                  <path d="M22 24 L24 26 L26 23" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" />
                  {/* Small pulse at bottom */}
                  <path d="M18 34 L21 34 L22.5 32 L24 36 L25.5 32 L27 34 L30 34" stroke="#4ADE80" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <defs><linearGradient id="g5" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#166534"/><stop offset="1" stopColor="#14532D"/></linearGradient></defs>
                </svg>
                <span className="text-[9px] text-[#6B7280]">{s}px</span>
              </div>
            ))}
            <div className="bg-white rounded-xl p-4 flex gap-4">
              <svg width={48} height={48} viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="14" fill="url(#g5b)" />
                <path d="M24 38 C24 38 10 28 10 19 C10 14 14 10 19 10 C21.5 10 23.5 11.5 24 13 C24.5 11.5 26.5 10 29 10 C34 10 38 14 38 19 C38 28 24 38 24 38Z" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.5" />
                <path d="M24 18 C24 18 20 22 20 27 C20 30 22 32 24 32 C26 32 28 30 28 27 C28 22 24 18 24 18Z" fill="#4ADE80" fillOpacity="0.8" />
                <path d="M24 19 L24 31" stroke="white" strokeWidth="0.8" strokeOpacity="0.6" />
                <path d="M22 24 L24 26 L26 23" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" />
                <path d="M18 34 L21 34 L22.5 32 L24 36 L25.5 32 L27 34 L30 34" stroke="#4ADE80" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <defs><linearGradient id="g5b" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#166534"/><stop offset="1" stopColor="#14532D"/></linearGradient></defs>
              </svg>
              <span className="text-xs text-gray-400 self-center">on light</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
