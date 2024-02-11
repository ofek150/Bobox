import React, { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { acceptFileShareInvitation } from "../services/firebase";
import NotFoundPage from "./NotFoundPage";

const AcceptInvitation: React.FC = () => {
    const [searchParams] = useSearchParams();
    const invitationId = searchParams.get("invitationId");
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const acceptInvitation = async () => {
            if (invitationId) {
                try {
                    await acceptFileShareInvitation(invitationId);
                } catch (error) {
                    console.error("Error accepting invitation:", error);
                    setNotFound(true);
                }
            } else {
                setNotFound(true);
            }
        };

        acceptInvitation();
    }, [invitationId]);

    if (notFound) {
        return <NotFoundPage />;
    }

    return (
        <Navigate to="/user/folders/shared" replace={true} />
    );
}

export default AcceptInvitation;
