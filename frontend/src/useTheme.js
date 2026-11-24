import { useSyncExternalStore } from 'react';
import { chartPalette, currentTheme, setTheme, subscribeTheme } from './theme';

// The current theme ("light" or "dark") and a function to change it.
export function useTheme() {
    const theme = useSyncExternalStore(subscribeTheme, currentTheme, () => 'light');
    return [theme, setTheme];
}

// Chart colours for the current theme; charts re-render when the theme changes.
export function useChartColors() {
    const [theme] = useTheme();
    return chartPalette(theme);
}
