import Image from "next/image";
import { users, equipmentCategories, inCPUData, outCPUData, borrowReturnData } from "@/lib/data";

const Dashboard = () => {
    const totalInternalUsers = users.filter((user) => user.role === "internal").length;
    const totalExternalUsers = users.filter((user) => user.role === "external").length;
    const totalKaruphan = equipmentCategories.length;

    // สถิติครุภัณฑ์
    const totalInternalEquipment = inCPUData.length;
    const totalExternalEquipment = outCPUData.length;
    const totalAllEquipment = totalInternalEquipment + totalExternalEquipment;

    // สถิติสถานะครุภัณฑ์
    const normalEquipment = [...inCPUData, ...outCPUData].filter(item => item.status === "ปกติ").length;
    const borrowedEquipment = [...inCPUData, ...outCPUData].filter(item => item.status.includes("ยืมโดย")).length;
    const damagedEquipment = [...inCPUData, ...outCPUData].filter(item => item.status === "ชำรุด").length;

    // สถิติการยืม-คืน
    const pendingApproval = borrowReturnData.filter(item => item.status === "รออนุมัติ").length;
    const approved = borrowReturnData.filter(item => item.status === "อนุมัติแล้ว/รอคืน").length;
    const returned = borrowReturnData.filter(item => item.status === "คืนแล้ว").length;
    const notApproved = borrowReturnData.filter(item => item.status === "ไม่อนุมัติ").length;

    // มูลค่าครุภัณฑ์รวม
    const totalValue = [...inCPUData, ...outCPUData].reduce((sum, item) => sum + item.price, 0);

    // ข้อมูลสำหรับกราฟ (จำลองข้อมูลรายเดือน)
    const monthlyData = [
        { month: "มี.ค.-2025", value: 10, label: "10 รายการ" },
        { month: "เม.ย.-2025", value: 5, label: "5 รายการ" },
        { month: "พ.ค.-2025", value: 7, label: "7 รายการ" },
        { month: "มิ.ย.-2025", value: 4, label: "4 รายการ" },
        { month: "ก.ค.-2025", value: 1, label: "1 รายการ" },
    ];

    return (
        <main className="dashboard wrapper py-8 bg-gray-50 min-h-screen">
            <section className="flex flex-col gap-8">
                {/* Cards สำคัญด้านบน */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    <div className="rounded-xl shadow-lg p-6 text-left bg-gradient-to-br from-blue-400 to-blue-600 relative overflow-hidden">
                        <div className="absolute top-4 right-4 opacity-20">
                            <Image src="/data.png" alt="Equipment" width={48} height={48} />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">จำนวนครุภัณฑ์</h3>
                        <p className="text-3xl font-bold text-white">{totalAllEquipment}</p>

                    </div>

                    <div className="rounded-xl shadow-lg p-6 text-left bg-gradient-to-br from-green-400 to-green-600 relative overflow-hidden">
                        <div className="absolute top-4 right-4 opacity-20">
                            <Image src="/person.png" alt="Internal Users" width={48} height={48} />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">จำนวนพนักงานในแผนก</h3>
                        <p className="text-3xl font-bold text-white">{totalInternalUsers}</p>

                    </div>

                    <div className="rounded-xl shadow-lg p-6 text-left bg-gradient-to-br from-yellow-500 to-yellow-600 relative overflow-hidden">
                        <div className="absolute top-4 right-4 opacity-20">
                            <Image src="/person.png" alt="External Users" width={48} height={48} />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">จำนวนพนักงานนอกแผนก</h3>
                        <p className="text-3xl font-bold text-white">{totalExternalUsers}</p>

                    </div>
                </div>

                {/* รายงานจำนวนการยืมครุภัณฑ์ */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">รายงานจำนวนการยืมครุภัณฑ์</h2>
                            <p className="text-gray-600">จำนวนแยกตามเดือน</p>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600">
                            <Image src="/HamBmenu.png" alt="Menu" width={24} height={24} />
                        </button>
                    </div>

                    {/* พื้นที่กราฟแบบง่าย */}
                    <div className="relative">
                        <div className="flex items-end justify-between h-64 mb-4">
                            {monthlyData.map((data, index) => {
                                const colors = [
                                    "bg-blue-400",
                                    "bg-purple-500",
                                    "bg-green-500",
                                    "bg-orange-500",
                                    "bg-blue-600"
                                ];
                                const height = (data.value / 10) * 100;

                                return (
                                    <div key={index} className="flex flex-col items-center w-1/5">
                                        <div className="relative mb-2">
                                            <span className="text-sm font-semibold text-blue-600 mb-1 block">
                                                {data.label}
                                            </span>
                                            <div
                                                className={`w-16 ${colors[index]} rounded-t-md transition-all duration-1000 ease-out`}
                                                style={{ height: `${height}%`, minHeight: '20px' }}
                                            />
                                        </div>
                                        <span className="text-sm text-gray-600 font-medium">{data.month}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* แกน Y */}
                        <div className="absolute left-0 top-0 h-64 flex flex-col justify-between text-sm text-gray-500">
                            <span>15</span>
                            <span>10</span>
                            <span>5</span>
                            <span>0</span>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default Dashboard;
