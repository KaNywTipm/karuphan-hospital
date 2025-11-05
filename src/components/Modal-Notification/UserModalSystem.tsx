"use client";

import React, { useState, useEffect } from "react";

// Types for modal states
interface AlertState {
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "warning" | "info";
    title?: string;
}

interface ConfirmState {
    isOpen: boolean;
    message: string;
    type: "danger" | "warning" | "info";
    title?: string;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
}

// Alert Modal Component
const UserAlertModal: React.FC<{
    alertState: AlertState;
    onClose: () => void;
}> = ({ alertState, onClose }) => {
    if (!alertState.isOpen) return null;

    const getIconAndColors = (type: AlertState["type"]) => {
        switch (type) {
            case "success":
                return {
                    icon: "✓",
                    iconBg: "bg-green-100",
                    iconColor: "text-green-600",
                    buttonBg: "bg-green-600 hover:bg-green-700",
                };
            case "error":
                return {
                    icon: "✕",
                    iconBg: "bg-red-100",
                    iconColor: "text-red-600",
                    buttonBg: "bg-red-600 hover:bg-red-700",
                };
            case "warning":
                return {
                    icon: "!",
                    iconBg: "bg-yellow-100",
                    iconColor: "text-yellow-600",
                    buttonBg: "bg-yellow-600 hover:bg-yellow-700",
                };
            case "info":
            default:
                return {
                    icon: "i",
                    iconBg: "bg-blue-100",
                    iconColor: "text-blue-600",
                    buttonBg: "bg-blue-600 hover:bg-blue-700",
                };
        }
    };

    const { icon, iconBg, iconColor, buttonBg } = getIconAndColors(alertState.type);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                    <div className="flex items-center">
                        <div className={`flex-shrink-0 w-10 h-10 ${iconBg} rounded-full flex items-center justify-center mr-4`}>
                            <span className={`text-lg font-bold ${iconColor}`}>{icon}</span>
                        </div>
                        <div className="flex-1">
                            {alertState.title && (
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    {alertState.title}
                                </h3>
                            )}
                            <p className="text-sm text-gray-600">{alertState.message}</p>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end">
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 text-white text-sm font-medium rounded-md ${buttonBg} focus:outline-none focus:ring-2 focus:ring-offset-2`}
                    >
                        ตกลง
                    </button>
                </div>
            </div>
        </div>
    );
};

// Confirm Modal Component
const UserConfirmModal: React.FC<{
    confirmState: ConfirmState;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ confirmState, onConfirm, onCancel }) => {
    if (!confirmState.isOpen) return null;

    const getIconAndColors = (type: ConfirmState["type"]) => {
        switch (type) {
            case "danger":
                return {
                    icon: "⚠",
                    iconBg: "bg-red-100",
                    iconColor: "text-red-600",
                    confirmBg: "bg-red-600 hover:bg-red-700",
                };
            case "warning":
                return {
                    icon: "!",
                    iconBg: "bg-yellow-100",
                    iconColor: "text-yellow-600",
                    confirmBg: "bg-yellow-600 hover:bg-yellow-700",
                };
            case "info":
            default:
                return {
                    icon: "?",
                    iconBg: "bg-blue-100",
                    iconColor: "text-blue-600",
                    confirmBg: "bg-blue-600 hover:bg-blue-700",
                };
        }
    };

    const { icon, iconBg, iconColor, confirmBg } = getIconAndColors(confirmState.type);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                    <div className="flex items-center">
                        <div className={`flex-shrink-0 w-10 h-10 ${iconBg} rounded-full flex items-center justify-center mr-4`}>
                            <span className={`text-lg font-bold ${iconColor}`}>{icon}</span>
                        </div>
                        <div className="flex-1">
                            {confirmState.title && (
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    {confirmState.title}
                                </h3>
                            )}
                            <p className="text-sm text-gray-600">{confirmState.message}</p>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-700 text-sm font-medium rounded-md bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                        {confirmState.cancelText || "ยกเลิก"}
                    </button>
                    <button
                        onClick={() => {
                            confirmState.onConfirm?.();
                            onConfirm();
                        }}
                        className={`px-4 py-2 text-white text-sm font-medium rounded-md ${confirmBg} focus:outline-none focus:ring-2 focus:ring-offset-2`}
                    >
                        {confirmState.confirmText || "ยืนยัน"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Hook for managing user modals
export const useUserModals = () => {
    const [alertState, setAlertState] = useState<AlertState>({
        isOpen: false,
        message: "",
        type: "info",
    });

    const [confirmState, setConfirmState] = useState<ConfirmState>({
        isOpen: false,
        message: "",
        type: "info",
    });

    // Alert functions
    const showAlert = (message: string, type: AlertState["type"] = "info", title?: string) => {
        setAlertState({
            isOpen: true,
            message,
            type,
            title,
        });
    };

    const closeAlert = () => {
        setAlertState(prev => ({ ...prev, isOpen: false }));
    };

    // Confirm functions
    const showConfirm = (
        message: string,
        onConfirm: () => void,
        options: {
            type?: ConfirmState["type"];
            title?: string;
            confirmText?: string;
            cancelText?: string;
        } = {}
    ) => {
        setConfirmState({
            isOpen: true,
            message,
            type: options.type || "info",
            title: options.title,
            onConfirm,
            confirmText: options.confirmText,
            cancelText: options.cancelText,
        });
    };

    const closeConfirm = () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    };

    const handleConfirm = () => {
        confirmState.onConfirm?.();
        closeConfirm();
    };

    // Alert shorthand methods
    const success = (message: string, title?: string) => showAlert(message, "success", title);
    const error = (message: string, title?: string) => showAlert(message, "error", title);
    const warning = (message: string, title?: string) => showAlert(message, "warning", title);
    const info = (message: string, title?: string) => showAlert(message, "info", title);

    return {
        // Alert methods
        alert: {
            success,
            error,
            warning,
            info,
        },
        // Confirm methods
        confirm: {
            show: showConfirm,
        },
        // Modal components
        AlertModal: () => (
            <UserAlertModal alertState={alertState} onClose={closeAlert} />
        ),
        ConfirmModal: () => (
            <UserConfirmModal
                confirmState={confirmState}
                onConfirm={handleConfirm}
                onCancel={closeConfirm}
            />
        ),
    };
};