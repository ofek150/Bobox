import React, { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { acceptFileShareInvitation, acceptFolderShareInvitation } from "../services/firebase";
import NotFoundPage from "./NotFoundPage";
import Loading from "../components/Loading";
import { enqueueSnackbar } from "notistack";
import { Variant } from "../utils/types";

const AcceptInvitation: React.FC = () => {
    const [searchParams] = useSearchParams();
    const invitationId = searchParams.get("invitationId");
    const type = searchParams.get("type");
    const [notFound, setNotFound] = useState(false);
    const [loading, setLoading] = useState(true);

    const acceptShareInvitation = async (invitationId: string | null, type: string | null) => {
        if (!invitationId || !type) return { error: "Invalid invitationId or type" };
        if (type === "folder") return await acceptFolderShareInvitation(invitationId);
        else if (type === "file") return await acceptFileShareInvitation(invitationId);
        else return { error: "Invalid type" };
    }


    useEffect(() => {
        const acceptInvitation = async () => {
            const { error } = await acceptShareInvitation(invitationId, type);
            const message = error ? error : `You have successfully accepted the invitation to collab on ${type}!`;
            const variant: Variant = error ? 'error' : 'success';
            if (error) setNotFound(true);
            enqueueSnackbar(message, {
                variant: variant,
                preventDuplicate: true
            });
            setLoading(false);
        };

        acceptInvitation();
    }, [invitationId]);

    if (notFound) {
        return <NotFoundPage />;
    }

    if (loading) return <Loading />;

    return (
        <Navigate to="/user/folders/shared" replace={true} />
    );
}

export default AcceptInvitation;
