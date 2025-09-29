"use client";

import React from "react";
import { useModal } from "@/components/Modal-Notification/ModalProvider";

/**
 * ตัวอย่างการใช้งาน Modal Notification System
 * 
 * Component นี้แสดงตัวอย่างการใช้งาน Modal แบบต่างๆ
 * สำหรับใช้เป็น Reference ในการพัฒนา
 */
export default function NotificationExamples() {
    const modal = useModal();

    const handleSuccess = () => {
        modal.alert.success(
            "การดำเนินการสำเร็จ! ข้อมูลได้ถูกบันทึกลงในระบบเรียบร้อยแล้ว",
            "บันทึกข้อมูลสำเร็จ"
        );
    };

    const handleError = () => {
        modal.alert.error(
            "เกิดข้อผิดพลาดในการเชื่อมต่อกับฐานข้อมูล กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่อีกครั้ง",
            "ข้อผิดพลาดการเชื่อมต่อ"
        );
    };

    const handleWarning = () => {
        modal.alert.warning(
            "กรุณาตรวจสอบข้อมูลให้ครบถ้วนก่อนดำเนินการต่อ บางช่องยังไม่ได้กรอกข้อมูล",
            "ข้อมูลไม่ครบถ้วน"
        );
    };

    const handleInfo = () => {
        modal.alert.info(
            "ระบบกำลังดำเนินการอัปเดตข้อมูล กรุณารอสักครู่และไม่ต้องรีเฟรชหน้าเว็บ",
            "กำลังประมวลผล"
        );
    };

    const handleConfirmDelete = () => {
        modal.confirm(
            "คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้",
            () => {
                modal.alert.success("ลบข้อมูลสำเร็จแล้ว", "ลบข้อมูล");
            },
            {
                title: "ยืนยันการลบข้อมูล",
                type: "danger",
                confirmText: "ลบ",
                cancelText: "ยกเลิก"
            }
        );
    };

    const handleConfirmSave = () => {
        modal.confirm(
            "คุณต้องการบันทึกการเปลี่ยนแปลงหรือไม่?",
            () => {
                modal.alert.success("บันทึกการเปลี่ยนแปลงสำเร็จ", "บันทึกข้อมูล");
            },
            {
                title: "บันทึกการเปลี่ยนแปลง",
                type: "info",
                confirmText: "บันทึก",
                cancelText: "ไม่บันทึก"
            }
        );
    };

    const handleApiExample = async () => {
        try {
            // ตัวอย่างการใช้กับ API Response
            const response = await fetch("/api/some-endpoint", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: "example" })
            });

            const result = await response.json();

            if (result.ok) {
                // กรณีสำเร็จ
                modal.alert.success(
                    result.message || "ดำเนินการสำเร็จ",
                    result.title || "สำเร็จ"
                );
            } else {
                // กรณีผิดพลาด - ใช้ type และ title จาก API
                const alertType = result.type || "error";
                const alertTitle = result.title || "เกิดข้อผิดพลาด";

                switch (alertType) {
                    case "success":
                        modal.alert.success(result.error, alertTitle);
                        break;
                    case "warning":
                        modal.alert.warning(result.error, alertTitle);
                        break;
                    case "info":
                        modal.alert.info(result.error, alertTitle);
                        break;
                    default:
                        modal.alert.error(result.error, alertTitle);
                }
            }
        } catch (error) {
            modal.alert.error(
                "เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์",
                "ข้อผิดพลาดการเชื่อมต่อ"
            );
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    ตัวอย่างการใช้งาน Modal Notification System
                </h1>
                <p className="text-gray-600 mb-8">
                    ระบบแจ้งเตือนที่สวยงามและใช้งานง่าย สำหรับแสดงข้อความต่างๆ ในแอปพลิเคชัน
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Alert Examples */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Alert Notifications</h2>

                        <button
                            onClick={handleSuccess}
                            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            Success Alert
                        </button>

                        <button
                            onClick={handleError}
                            className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            Error Alert
                        </button>

                        <button
                            onClick={handleWarning}
                            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            Warning Alert
                        </button>

                        <button
                            onClick={handleInfo}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            Info Alert
                        </button>
                    </div>

                    {/* Confirm Examples */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Confirm Dialogs</h2>

                        <button
                            onClick={handleConfirmDelete}
                            className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            Confirm Delete (Danger)
                        </button>

                        <button
                            onClick={handleConfirmSave}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            Confirm Save (Info)
                        </button>

                        <button
                            onClick={handleApiExample}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            API Response Example
                        </button>
                    </div>
                </div>

                {/* Usage Instructions */}
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">วิธีการใช้งาน</h3>
                    <div className="space-y-2 text-sm text-gray-700">
                        <p><strong>1. Import useModal hook:</strong></p>
                        <code className="block bg-white p-2 rounded border text-xs">
                            {`import { useModal } from "@/components/Modal-Notification/ModalProvider";`}
                        </code>

                        <p className="pt-2"><strong>2. ใช้งานใน Component:</strong></p>
                        <code className="block bg-white p-2 rounded border text-xs whitespace-pre-line">
                            {`const modal = useModal();
modal.alert.success("ข้อความ", "หัวข้อ");
modal.confirm("ข้อความ", () => { /* callback */ }, options);`}
                        </code>

                        <p className="pt-2"><strong>3. API Response Integration:</strong></p>
                        <code className="block bg-white p-2 rounded border text-xs whitespace-pre-line">
                            {`// API ควร return: { ok, message, title, type, error }
// ใช้ type: "success" | "error" | "warning" | "info"`}
                        </code>
                    </div>
                </div>
            </div>
        </div>
    );
}