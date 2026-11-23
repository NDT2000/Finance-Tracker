import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppLayout from './components/AppLayout';
import { redirects, homePath } from './navigation';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Imports from './pages/Imports';
import Planning from './pages/Planning';

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
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Layout route: every signed-in page renders inside the sidebar shell */}
                    <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
                        <Route path="/overview" element={<Dashboard />} />
                        <Route path="/planning" element={<Planning />} />
                        <Route path="/imports" element={<Imports />} />
                        <Route path="/profile" element={<Profile />} />
                    </Route>

                    {redirects.map(([from, to]) => <Route key={from} path={from} element={<Navigate to={to} replace />} />)}
                    {/* Unknown addresses go home; PrivateRoute sends signed-out visitors to sign in */}
                    <Route path="*" element={<Navigate to={homePath} replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
