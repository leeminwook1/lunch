import { useState, useCallback } from 'react';

export const useModal = () => {
    const [modal, setModal] = useState({ 
        isOpen: false, 
        type: '', 
        title: '', 
        message: '', 
        onConfirm: null 
    });

    const showModal = useCallback((type, title, message, onConfirm = null) => {
        setModal({ isOpen: true, type, title, message, onConfirm });
    }, []);

    const closeModal = useCallback(() => {
        setModal({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
    }, []);

    const confirmModal = useCallback(() => {
        if (modal.onConfirm) {
            modal.onConfirm();
        }
        closeModal();
    }, [modal.onConfirm, closeModal]);

    return {
        modal,
        showModal,
        closeModal,
        confirmModal
    };
};