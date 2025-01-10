import React, {createContext, ReactNode, useContext, useEffect, useState} from "react";
import axios from "axios";
import Snackbar from '@mui/joy/Snackbar';
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";

import {api_base_url} from "../main.tsx";

interface AuthContextType {
    isAuthenticated: boolean;
    checkAuthStatus: () => Promise<boolean>;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [logOutsnackbar, setLogOutsnackbar] = useState(false);
    const [authInternalServerError, setAuthInternalServerError] = useState(false);
    const [errorVerifyingAuthSnackbar, setErrorVerifyingAuthSnackbar] = useState(false);
    const [authUnauthorizedSnackbar, setAuthUnauthorizedSnackbar] = useState(false);

    const checkAuthStatus = async () => {
        try {
            const res = await axios.get(api_base_url + "/auth/google/status", {withCredentials: true});

            console.log("Check auth status response:", res.status, res.data.isAuthenticated);
            switch (res.status) {
                case 401:
                    setAuthInternalServerError(true);
                    break;
                case 403:
                    setAuthUnauthorizedSnackbar(true);
                    break;
                case 500:
                    setAuthInternalServerError(true);
                    break;
                default:
                    break;
            }

            setIsAuthenticated(res.data.isAuthenticated || false);
            return res.data.isAuthenticated;
        } catch (error) {
            setIsAuthenticated(false);
            setErrorVerifyingAuthSnackbar(true);
            return false;
        }
    };

    const logout = async () => {
        try {
            const res = await axios.post(api_base_url + "/auth/logout", {}, {withCredentials: true})

            console.log("Logout response:", res.status, res.data.isAuthenticated);
            switch (res.status) {
                case 401:
                    setAuthInternalServerError(true);
                    break;
                case 403:
                    setAuthUnauthorizedSnackbar(true);
                    break;
                case 500:
                    setAuthInternalServerError(true);
                    break;
                default:
                    break;
            }

            setIsAuthenticated(false);
            setLogOutsnackbar(true);
        } catch (error) {
            console.error("Logout failed", error);
            setAuthInternalServerError(true);
        }
    };

    useEffect(() => {
        checkAuthStatus().then(() => void 0).catch(error => {
            console.error("Error verifying authentication:", error);
            setErrorVerifyingAuthSnackbar(true);
        });
    }, []);

    return (
        <AuthContext.Provider value={{isAuthenticated, checkAuthStatus, logout}}>
            {children}
            <Snackbar
                open={logOutsnackbar}
                anchorOrigin={{vertical: "top", horizontal: "center"}}
                color="success"
                variant="soft"
                size="lg"
                onClose={() => setLogOutsnackbar(false)}
                autoHideDuration={5000}
                endDecorator={<LogoutRoundedIcon />}
            >
                Logout successful!
            </Snackbar>
            <Snackbar
                open={authInternalServerError}
                anchorOrigin={{vertical: "top", horizontal: "center"}}
                color="danger"
                variant="soft"
                size="lg"
                onClose={() => setAuthInternalServerError(false)}
                autoHideDuration={5000}
                endDecorator={<ErrorOutlineRoundedIcon />}
            >
                An internal server error has occurred.
            </Snackbar>
            <Snackbar
                open={authUnauthorizedSnackbar}
                anchorOrigin={{vertical: "top", horizontal: "center"}}
                color="danger"
                variant="solid"
                size="lg"
                onClose={() => setAuthUnauthorizedSnackbar(false)}
                autoHideDuration={5000}
                endDecorator={<ErrorOutlineRoundedIcon />}
            >
                You are not authorized to access this protected page.
            </Snackbar>
            <Snackbar
                open={errorVerifyingAuthSnackbar}
                anchorOrigin={{vertical: "top", horizontal: "center"}}
                color="danger"
                variant="soft"
                size="lg"
                onClose={() => setErrorVerifyingAuthSnackbar(false)}
                autoHideDuration={5000}
                endDecorator={<ErrorOutlineRoundedIcon />}
            >
                An error has occurred while verifying authentication.
            </Snackbar>
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};