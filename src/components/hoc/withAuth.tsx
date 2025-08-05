import React, {useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../../context/AuthContext.tsx";
import {Button, CircularProgress} from "@mui/joy";

const withAuth = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
    return (props: P) => {
        const {isAuthenticated, checkAuthStatus} = useAuth();
        const navigate = useNavigate();

        useEffect(() => {
            const verifyAuth = async () => {
                const authStatus = await checkAuthStatus();
                if (!authStatus) {
                    navigate("/");
                }
            };

            verifyAuth().then(() => void 0).catch(error => {
                console.error("Error verifying authentication:", error);
            });
        }, [isAuthenticated, navigate, checkAuthStatus]);

        if (!isAuthenticated) {
            return (
                <div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100vh"}}>
                    <Button size={"lg"} variant={"plain"} startDecorator={<CircularProgress size="lg" variant="solid" />}>Verifying...</Button>
                </div>
            );
        }

        return <WrappedComponent {...props} />;
    };
};

export default withAuth;