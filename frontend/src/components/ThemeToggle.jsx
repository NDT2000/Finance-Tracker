import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../useTheme';

// Switches between the light and dark themes. One label with a pressed state, so screen readers
// announce "Dark theme, toggle button, pressed/not pressed". The choice is remembered on this device.
export default function ThemeToggle({ className = '' }) {
    const [theme, setTheme] = useTheme();
    const dark = theme === 'dark';
    return (
        <button type="button" className={`theme-toggle ${className}`} aria-pressed={dark} aria-label="Dark theme"
            title={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(dark ? 'light' : 'dark')}>
            {dark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
        </button>
    );
}
