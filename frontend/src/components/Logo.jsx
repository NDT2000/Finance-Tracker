import './Logo.css';

// The icon: navy rounded square, white wallet, emerald ascending bars and an upward arrow.
// onDark: on a navy background the tile switches to Navy Slate with an outline so it stays visible.
export function LogoMark({ size = 32, onDark = false }) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
            <rect x="0.5" y="0.5" width="47" height="47" rx="12"
                fill={onDark ? '#1E293B' : '#0F172A'} stroke={onDark ? '#334155' : 'none'} />
            {/* Card peeking out of the wallet */}
            <path d="M12 18 L29 12.6 Q31.4 11.9 32.2 14.2 L33.4 18 Z" fill="#34D399" />
            {/* Wallet body and clasp */}
            <rect x="9" y="18" width="30" height="20" rx="4" fill="#FFFFFF" />
            <rect x="30" y="24" width="9" height="8" rx="2.5" fill="#E2E8F0" />
            <circle cx="34" cy="28" r="1.5" fill="#0F172A" />
            {/* Ascending bars */}
            <rect x="13" y="30" width="3" height="4" rx="0.75" fill="#059669" />
            <rect x="17.5" y="27.5" width="3" height="6.5" rx="0.75" fill="#059669" />
            <rect x="22" y="25" width="3" height="9" rx="0.75" fill="#059669" />
            {/* Upward arrow */}
            <path d="M12.5 26 L18 22 L21.5 23.5 L27 19 M23.8 19 H27 V22.2" fill="none"
                stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// The full logo. variant "light" for white backgrounds, "dark" for navy ones; compact shows the icon only.
export default function Logo({ variant = 'light', size = 32, compact = false }) {
    return (
        <span className={`logo logo-${variant}`}>
            <LogoMark size={size} onDark={variant === 'dark'} />
            {compact ? (
                <span className="sr-only">Finance Tracker</span>
            ) : (
                <span className="logo-word" style={{ fontSize: size * 0.66 }}>
                    <span className="logo-finance">Finance</span>{' '}
                    <span className="logo-tracker">Tracker</span>
                </span>
            )}
        </span>
    );
}
