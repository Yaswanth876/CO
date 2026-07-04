import { Building2, IdCard, Mail, ShieldCheck, UserRound, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { getProfile, updateFacultyProfile } from "../lib/api";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    async function loadProfile() {
      if (!user?.email) return;

      try {
        const data = await getProfile(user.email);
        setFacultyProfile(data);
        setEditName(data.name);
      } catch {
        setFacultyProfile((prev) => ({ ...prev, email: user.email }));
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
      setSuccess("Profile updated successfully");
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { label: "Email", icon: Mail, value: facultyProfile.email },
    { label: "Department", icon: Building2, value: facultyProfile.department },
    { label: "Role", icon: ShieldCheck, value: facultyProfile.role },
    { label: "Employee ID", icon: IdCard, value: facultyProfile.employeeId },
  ];

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <AnimatePresence mode="popLayout">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-red-50 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center border border-red-100 shadow-sm"
          >
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError("")} className="hover:bg-red-100 p-1.5 rounded-full transition-colors flex items-center justify-center">
              <span className="text-lg leading-none">&times;</span>
            </button>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg flex justify-between items-center border border-emerald-100 shadow-sm"
          >
            <span className="text-sm font-medium">{success}</span>
            <button onClick={() => setSuccess("")} className="hover:bg-emerald-100 p-1.5 rounded-full transition-colors flex items-center justify-center">
              <span className="text-lg leading-none">&times;</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="border-slate-100 shadow-sm overflow-hidden bg-white/70 backdrop-blur-md">
          <CardHeader className="border-b border-slate-100/60 bg-slate-50/50 pb-8 pt-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <motion.div
                className="relative grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-red-950/10 text-red-950 shadow-sm border border-red-950/20"
                whileHover={{ scale: 1.05, rotate: -3 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <UserRound size={36} className="opacity-90" />
              </motion.div>
              <div className="text-center sm:text-left space-y-1.5 mt-2 sm:mt-1">
                <CardTitle className="text-2xl text-slate-900 font-bold tracking-tight">
                  {facultyProfile.name}
                </CardTitle>
                <p className="text-sm text-slate-500 font-medium">
                  {facultyProfile.role} • {facultyProfile.department}
                </p>
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-xs font-semibold border border-green-100 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Active Account
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-8">
            <motion.form variants={itemVariants} onSubmit={handleUpdateProfile} className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">
                Display Name
              </label>
              <div className="flex gap-3">
                <Input
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="bg-white max-w-md transition-all focus-visible:ring-red-950/20 shadow-sm h-11"
                />
                <Button
                  type="submit"
                  disabled={saving || editName === facultyProfile.name}
                  className="btn-press min-w-[110px] h-11 shadow-sm group"
                >
                  <AnimatePresence mode="wait">
                    {saving ? (
                      <motion.span
                        key="saving"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="text-sm"
                      >
                        Saving...
                      </motion.span>
                    ) : (
                      <motion.span
                        key="save"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex items-center gap-2 text-sm"
                      >
                        Save
                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </div>
            </motion.form>

            <motion.div variants={itemVariants} className="grid sm:grid-cols-2 gap-4">
              {fields.map((field) => (
                <motion.div
                  key={field.label}
                  whileHover={{ y: -2 }}
                  className="rounded-xl border border-slate-100 bg-white p-4 transition-all hover:bg-red-950/5 hover:border-red-950/20 hover:shadow-sm group cursor-default"
                >
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 group-hover:text-red-950 transition-colors">
                    <field.icon size={14} />
                    {field.label}
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium text-slate-800 truncate">
                    {field.value || "—"}
                  </dd>
                </motion.div>
              ))}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

