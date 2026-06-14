import { Building2, IdCard, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { pageVariants, containerVariants, cardVariants, sectionVariants } from "../lib/animations";
import { getProfile, updateFacultyProfile } from "../lib/api";

export default function Profile({ user }) {
  const [facultyProfile, setFacultyProfile] = useState({
    name: user?.full_name || "Staff User",
    email: user?.email || "",
    department: "Computer Science and Engineering",
    role: user?.role || "Staff",
    employeeId: "TCE-FAC-0000",
  });

  const [editName, setEditName] = useState(user?.full_name || "Staff User");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user?.email) {
        return;
      }

      try {
        const data = await getProfile(user.email);
        setFacultyProfile(data);
        setEditName(data.name);
      } catch {
        setFacultyProfile((prev) => ({
          ...prev,
          email: user.email,
        }));
      }
    }

    loadProfile();
  }, [user?.email]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const data = await updateFacultyProfile(editName);
      setFacultyProfile(prev => ({ ...prev, name: data.user.full_name }));
      localStorage.setItem("coas-user", JSON.stringify(data.user));
      localStorage.setItem("userName", data.user.full_name || "");
      setSuccess("Profile name updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { label: "Email", icon: Mail, value: facultyProfile.email, span: false },
    { label: "Department", icon: Building2, value: facultyProfile.department, span: false },
    { label: "Role", icon: ShieldCheck, value: facultyProfile.role, span: false },
    { label: "Employee ID", icon: IdCard, value: facultyProfile.employeeId, span: false },
  ];

  return (
    <motion.div
      className="space-y-6 p-4 md:p-6"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div variants={sectionVariants}>
        <Card className="border-red-100/80 shadow-[0_18px_45px_-35px_rgba(127,29,29,0.45)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl text-red-950">Profile</CardTitle>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              View your faculty account details and update your display name.
            </p>
          </CardHeader>
        </Card>
      </motion.div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between max-w-4xl mx-auto">
          <span>{error}</span>
          <button onClick={() => setError("")} className="font-bold">&times;</button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex justify-between max-w-4xl mx-auto">
          <span>{success}</span>
          <button onClick={() => setSuccess("")} className="font-bold">&times;</button>
        </div>
      )}

      <motion.div variants={cardVariants}>
        <Card className="mx-auto w-full max-w-4xl border-red-100/80 shadow-[0_18px_35px_-30px_rgba(30,41,59,0.35)]">
          <CardHeader className="pb-5">
            <div className="flex items-center gap-4">
              <motion.div
                className="grid h-14 w-14 place-items-center rounded-full bg-red-100 text-red-800 shadow-sm"
                whileHover={{ scale: 1.08, rotate: 3 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
              >
                <UserRound size={26} />
              </motion.div>
              <CardTitle className="flex items-center gap-2 text-xl text-red-950">
                Faculty Information
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleUpdateProfile} className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">Edit Display Name</h3>
              <div className="flex gap-4">
                <Input
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="bg-white"
                />
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Name"}
                </Button>
              </div>
            </form>

            <motion.dl
              className="grid gap-4 sm:grid-cols-2"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {fields.map((field) => (
                <motion.div
                  key={field.label}
                  variants={cardVariants}
                  className={`rounded-lg border border-slate-200 bg-slate-50/70 p-4 transition-colors hover:border-red-100 hover:bg-red-50/30 ${
                    field.span ? "sm:col-span-2" : ""
                  }`}
                >
                  <dt className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                    {field.icon && <field.icon size={13} />}
                    {field.label}
                  </dt>
                  <dd className="mt-2 text-sm font-medium text-slate-900">{field.value}</dd>
                </motion.div>
              ))}
            </motion.dl>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
