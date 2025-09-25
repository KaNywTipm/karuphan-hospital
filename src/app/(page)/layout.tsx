import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";

export default function PageLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-screen flex">
            {/* Left Sidebar Menu */}
            <div className="w-[14%] md:w-[8%] lg:w-[16%] xl:w-[17%] p-4 bg-NavyBlue">
                <Menu />
            </div>

            {/* Main Content Area */}
            <div className="w-[86%] md:w-[92%] lg:w-[84%] xl:w-[86%] bg-[#F7F8FA] flex flex-col">
                {/* Top Navbar */}
                <Navbar />

                {/* Page Content */}
                <div className="flex-1 p-4 overflow-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}