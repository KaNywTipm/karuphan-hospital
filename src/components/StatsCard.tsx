type StatsCardProps = {
  headerTitle: string;
  total: number;
  bgColor?: string;
};

export const StatsCard = ({
  headerTitle,
  total,
  bgColor = "bg-White",
}: StatsCardProps) => {
  return (
    <div className={`rounded-lg shadow-md p-6 text-left ${bgColor}`}>
      <h3 className="text-lg font-semibold capitalize text-White">{headerTitle}</h3>
      <p className={"text-2xl font-bold text-White"}>{total}</p>
    </div>
  );
};
