"use client";

import { useState, useCallback } from "react";

type AlertType = "success" | "error" | "warning" | "info";

interface AlertOptions {
    title?: string;
    type?: AlertType;
    confirmText?: string;
}

interface ConfirmOptions {
    title?: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
}

export const useAlert = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [options, setOptions] = useState<AlertOptions>({});

    const showAlert = useCallback((msg: string, opts: AlertOptions = {}) => {
        setMessage(msg);
        setOptions(opts);
        setIsOpen(true);
    }, []);

    const hideAlert = useCallback(() => {
        setIsOpen(false);
        setMessage("");
        setOptions({});
    }, []);

    // Shorthand methods
    const success = useCallback(
        (msg: string, opts?: Omit<AlertOptions, "type">) => {
            showAlert(msg, { ...opts, type: "success" });
        },
        [showAlert]
    );

    const error = useCallback(
        (msg: string, opts?: Omit<AlertOptions, "type">) => {
            showAlert(msg, { ...opts, type: "error" });
        },
        [showAlert]
    );

    const warning = useCallback(
        (msg: string, opts?: Omit<AlertOptions, "type">) => {
            showAlert(msg, { ...opts, type: "warning" });
        },
        [showAlert]
    );

    const info = useCallback(
        (msg: string, opts?: Omit<AlertOptions, "type">) => {
            showAlert(msg, { ...opts, type: "info" });
        },
        [showAlert]
    );

    return {
        isOpen,
        message,
        options,
        showAlert,
        hideAlert,
        success,
        error,
        warning,
        info,
    };
};

export const useConfirm = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [options, setOptions] = useState<ConfirmOptions>({});
    const [onConfirm, setOnConfirm] = useState<(() => void) | null>(null);

    const showConfirm = useCallback(
        (msg: string, confirmCallback: () => void, opts: ConfirmOptions = {}) => {
            setMessage(msg);
            setOptions(opts);
            setOnConfirm(() => confirmCallback);
            setIsOpen(true);
        },
        []
    );

    const hideConfirm = useCallback(() => {
        setIsOpen(false);
        setMessage("");
        setOptions({});
        setOnConfirm(null);
    }, []);

    const handleConfirm = useCallback(() => {
        onConfirm?.();
        hideConfirm();
    }, [onConfirm, hideConfirm]);

    return {
        isOpen,
        message,
        options,
        showConfirm,
        hideConfirm,
        handleConfirm,
    };
};
