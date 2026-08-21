import { Search, ShieldCheck, UserCheck, Users } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const teachers = [
  {
    name: "Meera Patil",
    school: "ZP Primary School, Khed",
    state: "Maharashtra",
    plans: 14,
    last: "Today",
    status: "active"
  },
  {
    name: "Ananya Rao",
    school: "Government High School, Mysuru",
    state: "Karnataka",
    plans: 23,
    last: "Today",
    status: "active"
  },
  {
    name: "Rakesh Kumar",
    school: "Middle School, Gaya",
    state: "Bihar",
    plans: 19,
    last: "Yesterday",
    status: "active"
  },
  {
    name: "Sana Sheikh",
    school: "Municipal School, Nagpur",
    state: "Maharashtra",
    plans: 11,
    last: "2 days ago",
    status: "active"
  },
  {
    name: "Kavita Sharma",
    school: "Government School, Jaipur",
    state: "Rajasthan",
    plans: 7,
    last: "5 days ago",
    status: "invited"
  }
];

export function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const visible = teachers.filter((item) =>
    `${item.name} ${item.school} ${item.state}`.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <div>
      <PageHeader
        eyebrow="Demo administration"
        title="Teacher accounts"
        description="Aggregated account administration. Lesson content remains private to its teacher unless explicitly shared."
        actions={<Badge tone="purple">Simulated data</Badge>}
      />
      <Card className="overflow-hidden">
        <div className="border-b border-black/5 p-4">
          <label className="relative block max-w-md">
            <Search className="text-ink-500 absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search teachers or schools…"
              className="bg-paper h-11 w-full rounded-xl border border-black/10 pr-3 pl-9 text-sm"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-paper text-ink-500 text-[10px] font-black tracking-wider uppercase">
              <tr>
                <th className="px-5 py-3">Teacher</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Plans</th>
                <th className="px-5 py-3">Last active</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {visible.map((teacher) => (
                <tr key={teacher.name} className="hover:bg-moss-50/50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="bg-moss-100 text-moss-700 grid size-9 place-items-center rounded-full text-xs font-black">
                        {teacher.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")}
                      </span>
                      <div>
                        <p className="font-black">{teacher.name}</p>
                        <p className="text-muted text-xs">{teacher.school}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-muted px-5 py-4">{teacher.state}</td>
                  <td className="px-5 py-4 font-black">{teacher.plans}</td>
                  <td className="text-muted px-5 py-4">{teacher.last}</td>
                  <td className="px-5 py-4">
                    <Badge tone={teacher.status === "active" ? "green" : "amber"}>
                      {teacher.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <Users className="text-moss-700 size-5" />
          <p className="mt-4 text-2xl font-black">486</p>
          <p className="text-muted text-xs font-bold">Active teachers</p>
        </Card>
        <Card className="p-5">
          <UserCheck className="text-moss-700 size-5" />
          <p className="mt-4 text-2xl font-black">92%</p>
          <p className="text-muted text-xs font-bold">Onboarding complete</p>
        </Card>
        <Card className="p-5">
          <ShieldCheck className="text-moss-700 size-5" />
          <p className="mt-4 text-2xl font-black">0</p>
          <p className="text-muted text-xs font-bold">Student PII incidents</p>
        </Card>
      </div>
    </div>
  );
}
