// Sidebar navigation, grouped as in docs/design-system.md section 11.
// Only pages that exist are listed: later rebuild steps add Transactions, Budgets, Analytics,
// Spend Forecasts, Import History, Export Reports and Bank Accounts as each page is built.
export const navigation = [
    {
        group: 'Manage',
        items: [{ to: '/overview', label: 'Overview', icon: 'overview' }],
    },
    {
        group: 'Plan and Analyze',
        items: [{ to: '/planning', label: 'Financial Planning', icon: 'planning' }],
    },
    {
        group: 'Data Management',
        items: [{ to: '/imports', label: 'Import Transactions', icon: 'imports' }],
    },
    {
        group: 'Account',
        items: [{ to: '/profile', label: 'My Profile', icon: 'profile' }],
    },
];

// Old addresses that keep working, so bookmarks and links still land somewhere.
export const redirects = [['/dashboard', '/overview']];

export const homePath = '/overview';

// The group and item for a URL path, or null if it is not a sidebar page.
export function findPage(pathname) {
    for (const { group, items } of navigation) {
        const item = items.find(({ to }) => pathname === to || pathname.startsWith(`${to}/`));
        if (item) return { group, item };
    }
    return null;
}
