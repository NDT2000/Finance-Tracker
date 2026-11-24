import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../api/axios';

// Loads the scenario list, and for the selected scenario its details, events and the backend's
// projection (with the recorded month used for comparison). Responses for a scenario or comparison
// month the user has already left are ignored.
export default function usePlanningData(planId, baselineMonth) {
    const [plans, setPlans] = useState({ list: [], loaded: false, error: '' });
    const [detail, setDetail] = useState({ plan: null, events: [], projection: null, loadedFor: null, error: '' });
    const latest = useRef(0);

    const loadPlans = useCallback(async () => {
        try {
            const { data } = await api.get('/api/plans');
            setPlans({ list: data, loaded: true, error: '' });
            return data;
        } catch (err) {
            setPlans(previous => ({ ...previous, loaded: true, error: err.response?.data?.message || 'Your scenarios could not be loaded.' }));
            return null;
        }
    }, []);

    const loadDetail = useCallback(async () => {
        const request = ++latest.current;
        if (!planId) {
            setDetail({ plan: null, events: [], projection: null, loadedFor: null, error: '' });
            return;
        }
        const key = `${planId}|${baselineMonth}`;
        try {
            const [plan, events, projection] = await Promise.all([
                api.get(`/api/plans/${planId}`),
                api.get(`/api/plans/${planId}/events`),
                api.get(`/api/plans/${planId}/projection`, { params: { baselineMonth } }),
            ]);
            if (request !== latest.current) return;
            setDetail({ plan: plan.data, events: events.data, projection: projection.data, loadedFor: key, error: '' });
        } catch (err) {
            if (request !== latest.current) return;
            setDetail(previous => ({ ...previous, error: err.response?.data?.message || 'This scenario could not be loaded.' }));
        }
    }, [planId, baselineMonth]);

    useEffect(() => { loadPlans(); }, [loadPlans]);
    useEffect(() => { loadDetail(); }, [loadDetail]);

    // Reload both after a change, so the list and the projection always match what the server stored
    const reload = useCallback(async () => { await Promise.all([loadPlans(), loadDetail()]); }, [loadPlans, loadDetail]);
    const isCurrent = detail.loadedFor === `${planId}|${baselineMonth}`;

    return { plans, detail, isCurrent, reload };
}
