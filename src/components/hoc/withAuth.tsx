import React, {useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../../context/AuthContext.tsx";

const withAuth = (WrappedComponent: React.ComponentType) => {
    return (props: any) => {
        const {isAuthenticated, checkAuthStatus} = useAuth();
        const navigate = useNavigate();

        useEffect(() => {
            const verifyAuth = async () => {
                const authStatus = await checkAuthStatus();
                if (!authStatus) {
                    navigate("/");
                }
            };

            verifyAuth().then(r => void 0).catch(error => {
                console.error("Error verifying authentication:", error);
            });
        }, [isAuthenticated, navigate, checkAuthStatus]);

        if (!isAuthenticated) {
            return null; // or a loading spinner
        }

        return <WrappedComponent {...props} />;
    };
};

export default withAuth;