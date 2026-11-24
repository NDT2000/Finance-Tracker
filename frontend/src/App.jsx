import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppLayout from './components/AppLayout';
import { redirects, homePath } from './navigation';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Overview from './pages/Overview';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Profile from './pages/Profile';
import Imports from './pages/Imports';
import BankAccounts from './pages/BankAccounts';
import Planning from './pages/Planning';

// Component gallery for reviewing shared components. import.meta.env.DEV is false in production
// builds, so Vite drops this import and the gallery never ships.
const ComponentGallery = import.meta.env.DEV ? lazy(() => import('./pages/dev/ComponentGallery')) : null;

function PrivateRoute({ children }) {
    const { token, loading } = useAuth();
    if (loading) return <p>Loading session…</p>;
    return token ? children : <Navigate to="/login" />;
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Layout route: every signed-in page renders inside the sidebar shell */}
                    <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
                        <Route path="/overview" element={<Overview />} />
                        <Route path="/transactions" element={<Transactions />} />
                        <Route path="/budgets" element={<Budgets />} />
                        <Route path="/planning" element={<Planning />} />
                        <Route path="/imports" element={<Imports />} />
                        <Route path="/accounts" element={<BankAccounts />} />
                        <Route path="/profile" element={<Profile />} />
                    </Route>

                    {ComponentGallery && <Route path="/dev/components" element={
                        <Suspense fallback={<p>Loading gallery…</p>}><ComponentGallery /></Suspense>
                    } />}

                    {redirects.map(([from, to]) => <Route key={from} path={from} element={<Navigate to={to} replace />} />)}
                    {/* Unknown addresses go home; PrivateRoute sends signed-out visitors to sign in */}
                    <Route path="*" element={<Navigate to={homePath} replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
