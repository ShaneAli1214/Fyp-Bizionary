import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) {
        // Redirect to login while saving the attempted URL
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRole && user.role !== requiredRole) {
        // Redirect to dashboard if user does not have the required role
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
