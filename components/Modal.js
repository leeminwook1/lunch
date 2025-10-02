import { useEffect } from 'react';

const Modal = ({ modal, closeModal, confirmModal }) => {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };

        if (modal.isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [modal.isOpen, closeModal]);

    if (!modal.isOpen) return null;

    return (
        <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className={`modal-header ${modal.type}`}>
                    <h3>{modal.title}</h3>
                </div>
                <div className="modal-body">
                    <p>{modal.message}</p>
                </div>
                <div className="modal-footer">
                    {modal.type === 'confirm' ? (
                        <>
                            <button className="modal-btn cancel" onClick={closeModal}>
                                취소
                            </button>
                            <button className="modal-btn confirm" onClick={confirmModal}>
                                확인
                            </button>
                        </>
                    ) : (
                        <button className="modal-btn confirm" onClick={closeModal}>
                            확인
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Modal;