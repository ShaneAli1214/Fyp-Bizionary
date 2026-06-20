import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AccessDenied from '../components/common/AccessDenied';

const ProtectedRoute = ({ children, requiredRole, forbiddenRoles, allowForcePasswordChange = false }) => {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) {
        // Redirect to login while saving the attempted URL
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user.requires_password_change && !allowForcePasswordChange) {
        // Forcefully redirect to the reset default password view
        return <Navigate to="/reset-default-password" replace />;
    }

    if (!user.requires_password_change && allowForcePasswordChange) {
        // Standard user trying to access reset-default-password -> redirect to dashboard
        return <Navigate to="/" replace />;
    }

    if (requiredRole && user.role_name !== requiredRole) {
        // Render 403 access denied if user does not have the required role
        return <AccessDenied />;
    }

    if (forbiddenRoles && forbiddenRoles.includes(user.role_name)) {
        // Render 403 access denied if user role is in forbidden list
        return <AccessDenied />;
    }

    return children;
};

export default ProtectedRoute;
