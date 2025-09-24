"use client";

import React, { createContext, useContext, ReactNode } from "react";
import AlertModal from "@/components/Modal-Notification/AlertModal";
import ConfirmModal from "@/components/Modal-Notification/ConfirmModal";
import { useAlert, useConfirm } from "@/hooks/useModals";

interface ModalContextType {
    alert: {
        success: (message: string, title?: string) => void;
        error: (message: string, title?: string) => void;
        warning: (message: string, title?: string) => void;
        info: (message: string, title?: string) => void;
    };
    confirm: (message: string, onConfirm: () => void, options?: {
        title?: string;
        type?: "danger" | "warning" | "info";
        confirmText?: string;
        cancelText?: string;
    }) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

interface ModalProviderProps {
    children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
    const alert = useAlert();
    const confirm = useConfirm();

    const contextValue: ModalContextType = {
        alert: {
            success: (message: string, title?: string) => alert.success(message, { title }),
            error: (message: string, title?: string) => alert.error(message, { title }),
            warning: (message: string, title?: string) => alert.warning(message, { title }),
            info: (message: string, title?: string) => alert.info(message, { title }),
        },
        confirm: (message: string, onConfirm: () => void, options = {}) => {
            confirm.showConfirm(message, onConfirm, options);
        }
    };

    return (
        <ModalContext.Provider value={contextValue}>
            {children}

            {/* Alert Modal */}
            <AlertModal
                isOpen={alert.isOpen}
                onClose={alert.hideAlert}
                message={alert.message}
                title={alert.options.title}
                type={alert.options.type}
                confirmText={alert.options.confirmText}
            />

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirm.isOpen}
                onConfirm={confirm.handleConfirm}
                onCancel={confirm.hideConfirm}
                message={confirm.message}
                title={confirm.options.title}
                confirmText={confirm.options.confirmText}
                cancelText={confirm.options.cancelText}
                type={confirm.options.type}
            />
        </ModalContext.Provider>
    );
};

export const useModal = (): ModalContextType => {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error("useModal must be used within a ModalProvider");
    }
    return context;
};