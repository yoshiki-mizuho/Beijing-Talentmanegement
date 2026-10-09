import type { MemberDashboardViewModel } from "@/modules/dashboard/presentation/member-dashboard-view-model";

export function GrowthRadarChart({
  values
}: {
  values: MemberDashboardViewModel["radar"];
}) {
  if (values.length === 0) {
    return <p className="py-10 text-center text-sm text-[var(--muted-foreground)]">表示できるスキルカテゴリがありません。</p>;
  }
  const centerX = 200;
  const centerY = 125;
  const radius = 80;
  const points = values.map((value, index) =>
    pointAt(index, values.length, radius * (value.average / 5), centerX, centerY)
  );
  const ariaLabel = values.map((value) => `${value.name} ${value.average}`).join("、");

  return (
    <svg viewBox="0 0 400 260" role="img" aria-label={`カテゴリ別の平均レベル。${ariaLabel}`} className="mx-auto w-full max-w-md">
      {[1, 2, 3, 4, 5].map((level) => (
        <polygon
          key={level}
          points={values.map((_, index) => {
            const point = pointAt(index, values.length, radius * (level / 5), centerX, centerY);
            return `${point.x},${point.y}`;
          }).join(" ")}
          fill={level === 5 ? "#F8FAFC" : "none"}
          stroke="#CBD5E1"
          strokeWidth="1"
        />
      ))}
      {values.map((value, index) => {
        const axis = pointAt(index, values.length, radius, centerX, centerY);
        const label = pointAt(index, values.length, radius + 14, centerX, centerY);
        // 左右の軸のラベルは外側へ伸ばし、図形に重ならないようにする。
        const anchor =
          label.x > centerX + 5 ? "start" : label.x < centerX - 5 ? "end" : "middle";
        return (
          <g key={value.id}>
            <line x1={centerX} y1={centerY} x2={axis.x} y2={axis.y} stroke="#CBD5E1" />
            <text x={label.x} y={label.y} textAnchor={anchor} dominantBaseline="middle" className="fill-[var(--muted-foreground)] text-[10px]">
              {truncate(value.name)}
            </text>
            <title>{value.name}: 平均 Lv{value.average}</title>
          </g>
        );
      })}
      <polygon points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="#0F766E33" stroke="#0F766E" strokeWidth="2" />
      {points.map((point, index) => <circle key={values[index]!.id} cx={point.x} cy={point.y} r="3" fill="#0F766E" />)}
    </svg>
  );
}

function pointAt(index: number, count: number, radius: number, x: number, y: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
  return { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius };
}

function truncate(value: string) {
  const characters = Array.from(value);
  return characters.length > 12 ? `${characters.slice(0, 11).join("")}…` : value;
}
