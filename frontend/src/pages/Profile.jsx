import { Building2, IdCard, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { pageVariants, containerVariants, cardVariants, sectionVariants } from "../lib/animations";
import { getProfile } from "../lib/api";

export default function Profile({ user }) {
  const [facultyProfile, setFacultyProfile] = useState({
    name: "Staff User",
    email: user?.email || "",
    department: "Computer Science and Engineering",
    role: user?.role || "Staff",
    employeeId: "TCE-FAC-0000",
  });

  useEffect(() => {
    async function loadProfile() {
      if (!user?.email) {
        return;
      }

      try {
        const data = await getProfile(user.email);
        setFacultyProfile(data);
      } catch {
        setFacultyProfile((prev) => ({
          ...prev,
          email: user.email,
        }));
      }
    }

    loadProfile();
  }, [user?.email]);

  const fields = [
    { label: "Name", icon: null, value: facultyProfile.name, span: false },
    { label: "Email", icon: Mail, value: facultyProfile.email, span: false },
    { label: "Department", icon: Building2, value: facultyProfile.department, span: false },
    { label: "Role", icon: ShieldCheck, value: facultyProfile.role, span: false },
    { label: "Employee ID", icon: IdCard, value: facultyProfile.employeeId, span: true },
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
              View your faculty account details used across the CO Attainment Automation System.
            </p>
          </CardHeader>
        </Card>
      </motion.div>

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

          <CardContent>
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
