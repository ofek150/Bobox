import { Box, Typography } from "@mui/material";
import React from "react";


const PasswordStrengthIndicator: React.FC<{ password: string }> = ({ password }) => {
    const getPasswordStrength = (password: string): string => {
        if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}/.test(password)) {
            return "Strong";
        } else if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}/.test(password)) {
            return "Medium";
        } else {
            return "Weak";
        }
    };

    const passwordStrength = getPasswordStrength(password);

    const getStrengthBarColor = (strength: string): string => {
        switch (strength) {
            case "Strong":
                return "green";
            case "Medium":
                return "orange";
            case "Weak":
                return "red";
            default:
                return "transparent";
        }
    };

    const barColor = getStrengthBarColor(passwordStrength);

    return (
        <Box display="flex" flexDirection="column" alignItems="center" my={2}>
            <Typography sx={{ marginBottom: '1rem' }}>Password Strength: {passwordStrength}</Typography>
            <Box
                width="100%"
                height="10px"
                borderRadius="5px"
                sx={{
                    backgroundColor: "transparent",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                <Box
                    position="absolute"
                    top="0"
                    left="0"
                    height="100%"
                    width={passwordStrength === "Weak" ? "30%" : passwordStrength === "Medium" ? "60%" : "100%"}
                    borderRadius="5px"
                    sx={{ backgroundColor: barColor }}
                ></Box>
            </Box>
        </Box>
    );
};

export default React.memo(PasswordStrengthIndicator);