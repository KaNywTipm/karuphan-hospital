import { StatsCard } from "@/components/StatsCard";
import { users, equipmentCategories } from "@/lib/data";

const Dashboard = () => {
    const totalInternalUsers = users.filter((user) => user.role === "internal").length;
    const totalExternalUsers = users.filter((user) => user.role === "external").length;
    const totalKaruphan = equipmentCategories.length;

    return (
        <main className="dashboard wrapper py-8">
            <section className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    <StatsCard
                        total={totalKaruphan}
                        headerTitle="จำนวนครุภัณฑ์"
                        bgColor="bg-BlueLight"
                    />
                    <StatsCard
                        total={totalInternalUsers}
                        headerTitle="จำนวนพนักงานในแผนก"
                        bgColor="bg-Green"
                    />
                    <StatsCard
                        total={totalExternalUsers}
                        headerTitle="จำนวนพนักงานนอกแผนก"
                        bgColor="bg-Green"
                    />
                </div>
            </section>
        </main>
    );
};

export default Dashboard;
