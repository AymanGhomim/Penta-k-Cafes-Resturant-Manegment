import { Card, CardContent } from "@/components/ui/card";

export function ReportMetricGrid({ values }: { values: string[][] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {values.map(([label, value]) => (
        <Card key={label}>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <b className="text-xl">{value}</b>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ReportTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-right text-sm">
          <thead className="bg-muted/50">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t">
                {row.map((value, valueIndex) => (
                  <td key={valueIndex} className="px-4 py-3">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? (
          <p className="p-8 text-center text-muted-foreground">
            لا توجد بيانات كافية لهذا التقرير.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
