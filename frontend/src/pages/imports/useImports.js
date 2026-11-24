import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import { currentMonth } from '../../format';
import { shouldPoll } from './importRules';

const POLL_MS = 2000;

// Loads import history, the selected import with one page of its rows, and import freshness.
// Polls only while an import is queued or processing; a finished import never changes on its own.
export default function useImports({ batchId, historyOffset, rowOffset, rejectedOnly }) {
    const [state, setState] = useState({ history: null, batch: null, rows: [], freshness: null, error: '', batchError: '' });
    const request = useRef(0);

    const load = useCallback(async () => {
        const id = ++request.current;
        const current = () => id === request.current;
        try {
            const [history, summary] = await Promise.all([
                api.get(`/api/imports?offset=${historyOffset}`),
                // Freshness counts cover all imports; the month and currency here don't affect them
                api.get(`/api/analytics/monthly?month=${currentMonth()}&currency=USD`).catch(() => null),
            ]);
            let batch = null;
            let rows = [];
            let batchError = '';
            if (batchId) {
                try {
                    const [detail, page] = await Promise.all([
                        api.get(`/api/imports/${batchId}`),
                        api.get(`/api/imports/${batchId}/rows?offset=${rowOffset}${rejectedOnly ? '&rejectedOnly=true' : ''}`),
                    ]);
                    batch = detail.data;
                    rows = page.data;
                } catch (err) {
                    batchError = err.response?.status === 404 || err.response?.status === 400
                        ? 'That import was not found.'
                        : 'This import could not be loaded.';
                }
            }
            if (!current()) return;
            setState({ history: history.data, batch, rows, freshness: summary?.data?.imports ?? null, error: '', batchError });
        } catch {
            if (current()) setState(s => ({ ...s, error: 'Import history could not be loaded.' }));
        }
    }, [batchId, historyOffset, rowOffset, rejectedOnly]);

    useEffect(() => {
        load();
    }, [load]);

    const polling = shouldPoll(state.history ?? [], state.batch);
    useEffect(() => {
        if (!polling) return undefined;
        const timer = setInterval(load, POLL_MS);
        return () => clearInterval(timer);
    }, [polling, load]);

    return { ...state, polling, reload: load };
}
