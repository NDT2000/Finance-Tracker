// Copy for the public landing page (docs/design-system.md §21). Only features that exist today are
// described; tests/landingContent.test.js blocks unavailable features (AI chat) and invented claims.
// Screenshots are real captures of the app at 1440x900 @2x, using sample data.

const shot = (name, alt) => ({ src: `/landing/${name}.webp`, alt, width: 2880, height: 1800 });

export const hero = {
    title: 'Take control of your money. Build a better future.',
    text: 'Track income and expenses, understand spending patterns, forecast your monthly expenses and explore your financial future — all in one place.',
    image: shot('overview', 'Overview page showing monthly net cash flow, total income, net expenses and spending by category'),
};

export const features = [
    {
        id: 'tracking',
        title: 'Expense and income tracking',
        text: 'Record income, expenses and refunds, assign them to your accounts, and filter by month, currency, type or source. Download any month as CSV.',
        image: shot('transactions', 'Transactions page listing dated entries with type, category, account, source and amount'),
    },
    {
        id: 'budgets',
        title: 'Category budgets',
        text: 'Set a monthly limit for each category and see what is spent and what is left, with exact amounts in each currency.',
        image: shot('budgets', 'Budgets page with monthly limits, amounts spent and category budget cards'),
    },
    {
        id: 'forecasts',
        title: 'ML-powered spending forecasts',
        text: 'A machine-learning model estimates where each budgeted category will end the month and flags the ones projected to go over.',
    },
    {
        id: 'imports',
        title: 'Reliable transaction imports',
        text: 'Upload CSV exports from your bank. Rejected rows come with reasons, possible duplicates wait for your review, and nothing is counted until processing has finished.',
        image: shot('imports', 'Import page showing an uploaded CSV with added, revised and rejected row counts'),
    },
    {
        id: 'planning',
        title: 'Financial scenario planning',
        text: 'Explore what-if scenarios over 1 to 36 months with salary, spending, investment and loan events, kept apart from your actual transactions.',
        image: shot('planning', 'Financial planning page with a what-if scenario, projected cash and investments, and funding checks'),
    },
];

export const closing = {
    title: 'See where your money goes',
    text: 'Create an account, then add a transaction or import a CSV to get started.',
};
