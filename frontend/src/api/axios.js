import axios from 'axios';

// Detect if running in Docker (served on port 80) or local dev (port 5173)
const baseURL = (window.location.port === '' || window.location.port === '80')
    ? ''
    : 'http://127.0.0.1:8080';

const api = axios.create({
    baseURL: baseURL,
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle expired tokens globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
