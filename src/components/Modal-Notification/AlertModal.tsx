"use client";

import React, { useEffect } from "react";
import Image from "next/image";

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
    type?: "success" | "error" | "warning" | "info";
    confirmText?: string;
}

export default function AlertModal({
    isOpen,
    onClose,
    title,
    message,
    type = "info",
    confirmText = "ตกลง"
}: AlertModalProps) {
    useEffect(() => {
        if (isOpen) {
            // ป้องกันการ scroll ของ body เมื่อโมดอลเปิด
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        // Cleanup เมื่อ component unmount
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    // ปิดโมดอลเมื่อกด ESC
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const getTypeStyles = () => {
        switch (type) {
            case "success":
                return {
                    bgColor: "bg-green-50",
                    borderColor: "border-green-200",
                    iconBg: "bg-green-100",
                    iconColor: "text-green-600",
                    buttonColor: "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                };
            case "error":
                return {
                    bgColor: "bg-red-50",
                    borderColor: "border-red-200",
                    iconBg: "bg-red-100",
                    iconColor: "text-red-600",
                    buttonColor: "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                };
            case "warning":
                return {
                    bgColor: "bg-yellow-50",
                    borderColor: "border-yellow-200",
                    iconBg: "bg-yellow-100",
                    iconColor: "text-yellow-600",
                    buttonColor: "bg-yellow-400 hover:bg-yellow-600 focus:ring-yellow-500"
                };
            default:
                return {
                    bgColor: "bg-blue-50",
                    borderColor: "border-blue-200",
                    iconBg: "bg-blue-100",
                    iconColor: "text-blue-600",
                    buttonColor: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                };
        }
    };

    const getIcon = () => {
        switch (type) {
            case "success":
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                );
            case "error":
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                );
            case "warning":
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };

    const styles = getTypeStyles();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={`relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 ${styles.borderColor} border-2 transform transition-all duration-300`}>
                {/* Header with Icon */}
                <div className={`${styles.bgColor} px-6 py-4 rounded-t-xl border-b ${styles.borderColor}`}>
                    <div className="flex items-center space-x-3">
                        <div className={`flex-shrink-0 ${styles.iconBg} ${styles.iconColor} p-2 rounded-full`}>
                            {getIcon()}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            {title || (
                                type === "success" ? "สำเร็จ" :
                                    type === "error" ? "เกิดข้อผิดพลาด" :
                                        type === "warning" ? "คำเตือน" : "แจ้งเตือน"
                            )}
                        </h3>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4">
                    <p className="text-gray-700 text-sm leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className={`${styles.buttonColor} text-white px-6 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
                        autoFocus
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}