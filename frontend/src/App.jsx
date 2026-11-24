import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppLayout from './components/AppLayout';
import { redirects, homePath } from './navigation';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

// Signed-in pages load on demand, so the landing and sign-in pages don't download the charts library
// and every other page. AppLayout shows a placeholder while a page loads.
const Overview = lazy(() => import('./pages/Overview'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Profile = lazy(() => import('./pages/Profile'));
const Imports = lazy(() => import('./pages/Imports'));
const BankAccounts = lazy(() => import('./pages/BankAccounts'));
const Planning = lazy(() => import('./pages/Planning'));

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
