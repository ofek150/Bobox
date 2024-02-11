import React, { useEffect } from 'react';
import { closeSnackbar, useSnackbar } from 'notistack';
import { Variant } from '../../utils/types';

const Notification: React.FC<{ message: string, variant: Variant }> = ({ message, variant }) => {
    const { enqueueSnackbar } = useSnackbar();


    // const action = (snackbarId: string) => (
    //     <>
    //         <button onClick={() => { closeSnackbar(snackbarId) }}>
    //             Dismiss
    //         </button>
    //     </>
    // );


    useEffect(() => {
        const timeoutId = setTimeout(() => {
            enqueueSnackbar(message, {
                variant: variant,
                autoHideDuration: 3000, // 5 seconds
            });
        }, 0); // Enqueue the snackbar after a short delay (0 ms)

        return () => clearTimeout(timeoutId);
    }, [enqueueSnackbar, message]);

    return null; // Notification component doesn't render anything directly
};

export default Notification;
