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
            <div className="w-[60px] md:w-[220px] lg:w-[260px] xl:w-[280px] 2xl:w-[300px] p-2 md:p-4 bg-NavyBlue flex-shrink-0 transition-all duration-300">
                <Menu />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-[#F7F8FA] flex flex-col min-w-0">
                {/* Top Navbar */}
                <Navbar />

                {/* Page Content */}
                <div className="flex-1 p-3 md:p-4 lg:p-6 overflow-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}