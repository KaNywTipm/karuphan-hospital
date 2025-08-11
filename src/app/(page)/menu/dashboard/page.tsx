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
                            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">จำนวนครุภัณฑ์</h3>
                        <p className="text-3xl font-bold text-white">{totalAllEquipment}</p>
                        <div className="mt-4">
                            <span className="text-sm text-blue-100 bg-blue-500 bg-opacity-30 px-2 py-1 rounded-full">
                                More info →
                            </span>
                        </div>
                    </div>

                    <div className="rounded-xl shadow-lg p-6 text-left bg-gradient-to-br from-green-400 to-green-600 relative overflow-hidden">
                        <div className="absolute top-4 right-4 opacity-20">
                            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">จำนวนพนักงานในแผนก</h3>
                        <p className="text-3xl font-bold text-white">{totalInternalUsers}</p>
                        <div className="mt-4">
                            <span className="text-sm text-green-100 bg-green-500 bg-opacity-30 px-2 py-1 rounded-full">
                                More info →
                            </span>
                        </div>
                    </div>

                    <div className="rounded-xl shadow-lg p-6 text-left bg-gradient-to-br from-green-500 to-green-700 relative overflow-hidden">
                        <div className="absolute top-4 right-4 opacity-20">
                            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">จำนวนพนักงานนอกแผนก</h3>
                        <p className="text-3xl font-bold text-white">{totalExternalUsers}</p>
                        <div className="mt-4">
                            <span className="text-sm text-green-100 bg-green-600 bg-opacity-30 px-2 py-1 rounded-full">
                                More info →
                            </span>
                        </div>
                    </div>
                </div>

                {/* กราฃารยงานจำนวนการยืมครุภัณฑ์ */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">รายงานจำนวนการยืมครุภัณฑ์</h2>
                            <p className="text-gray-600">จำนวนแยกตามเดือน</p>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
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

                {/* สถิติเพิ่มเติม */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">รออนุมัติ</h3>
                        <p className="text-3xl font-bold text-blue-600">{pendingApproval}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">อนุมัติแล้ว</h3>
                        <p className="text-3xl font-bold text-green-600">{approved}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">ชำรุด</h3>
                        <p className="text-3xl font-bold text-red-600">{damagedEquipment}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">คืนแล้ว</h3>
                        <p className="text-3xl font-bold text-purple-600">{returned}</p>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default Dashboard;
