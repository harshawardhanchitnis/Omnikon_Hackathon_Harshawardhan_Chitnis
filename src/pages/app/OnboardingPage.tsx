import { ArrowRight, Check, School, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { saveProfileRemote } from "@/services/activity-repository";
import { useAppStore } from "@/store/app-store";

export function OnboardingPage() {
  const profile = useAppStore((state) => state.profile);
  const setProfile = useAppStore((state) => state.setAuthenticatedProfile);
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.fullName ?? "");
  const [school, setSchool] = useState(profile?.schoolName ?? "");
  const [district, setDistrict] = useState(profile?.district ?? "");
  const [stateName, setStateName] = useState(profile?.state ?? "");
  const [language, setLanguage] = useState(profile?.preferredLanguage ?? "English");
  if (!profile) return null;
  const complete = async () => {
    const completedProfile = {
      ...profile,
      fullName: name.trim() || profile.fullName,
      schoolName: school.trim(),
      district: district.trim(),
      state: stateName.trim(),
      preferredLanguage: language,
      onboardingComplete: true,
      lastActiveAt: new Date().toISOString()
    };
    setProfile(completedProfile);
    await saveProfileRemote(completedProfile).catch(() => undefined);
    navigate("/dashboard");
  };
  return (
    <main id="main-content" className="paper-grid min-h-screen px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="bg-moss-100 text-moss-700 mx-auto grid size-14 place-items-center rounded-2xl">
            <School className="size-6" />
          </span>
          <p className="text-moss-700 mt-5 text-xs font-black tracking-wider uppercase">
            One-minute setup
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Teach where you are.</h1>
          <p className="text-muted mt-3 text-sm leading-6">
            These defaults help ChalkBox avoid generic plans. You can change them anytime.
          </p>
        </div>
        <Card className="mt-8 p-5 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <Input
              label="School / organisation"
              value={school}
              onChange={(event) => setSchool(event.target.value)}
              placeholder="e.g. ZP Primary School"
            />
            <Input
              label="District"
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
            />
            <Input
              label="State"
              value={stateName}
              onChange={(event) => setStateName(event.target.value)}
            />
            <Select
              label="Preferred teaching language"
              value={language}
              onChange={(event) => setLanguage(event.target.value as typeof language)}
            >
              <option>English</option>
              <option>Hindi</option>
              <option>Marathi</option>
            </Select>
          </div>
          <div className="bg-moss-50 mt-6 rounded-2xl p-4">
            <p className="text-moss-900 flex gap-2 text-sm font-bold">
              <Check className="size-5" />
              No student information is requested.
            </p>
          </div>
          <Button size="lg" className="mt-6 w-full" onClick={() => void complete()}>
            <Sparkles className="size-4" />
            Set up my workspace <ArrowRight className="size-4" />
          </Button>
        </Card>
      </div>
    </main>
  );
}
