import { CalendarDays, CircleCheck, Clock3, Download, FileSpreadsheet, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  pageVariants,
  containerVariants,
  cardVariants,
  sectionVariants,
} from "../lib/animations";
import { downloadReportFile, getFacultyReports, submitReportToAdmin, unsubmitReport } from "../lib/api";

const statusStyles = {
  Generated: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Submitted: "border-blue-200 bg-blue-50 text-blue-700",
  Approved: "border-emerald-300 bg-emerald-100 text-emerald-800",
  Rejected: "border-rose-300 bg-rose-50 text-rose-700",
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
};

export default function Reports({ user }) {
  const [reports, setReports] = useState([]);
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
  const [downloadingId, setDownloadingId] = useState("");
  const [submittingId, setSubmittingId] = useState("");

  const loadReports = async () => {
    if (!user) return;
    try {
      const data = await getFacultyReports();
      setReports(data || []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load reports.");
    }
  };

  useEffect(() => {
    loadReports();
  }, [user]);

  const handleDownload = async (report) => {
    setDownloadingId(report.id);
    try {
      const { blob } = await downloadReportFile(report.id, report.report_name);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.report_name}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.message || "Failed to download report.");
    } finally {
      setDownloadingId("");
    }
  };

  const handleSubmit = async (reportId) => {
    setSubmittingId(reportId);
    try {
      await submitReportToAdmin(reportId);
      setSuccess("Report submitted to admin successfully.");
      loadReports();
    } catch (submitError) {
      setError(submitError.message || "Failed to submit report.");
    } finally {
      setSubmittingId("");
    }
  };

  const handleUnsubmit = async (reportId) => {
    setSubmittingId(reportId);
    try {
      await unsubmitReport(reportId);
      setSuccess("Report unsubmitted successfully.");
      loadReports();
    } catch (unsubmitError) {
      setError(unsubmitError.message || "Failed to unsubmit report.");
    } finally {
      setSubmittingId("");
    }
  };

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
            <CardTitle className="text-2xl text-red-950">My Reports</CardTitle>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              View generated outcome attainment reports and submit them to the admin for review.
            </p>
          </CardHeader>
        </Card>
      </motion.div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="font-bold">&times;</button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess("")} className="font-bold">&times;</button>
        </div>
      )}

      <motion.div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {reports.map((report) => {
          return (
            <motion.div
              key={report.id}
              variants={cardVariants}
              whileHover={{ y: -4, transition: { duration: 0.22, ease: "easeOut" } }}
            >
              <Card className="card-hover h-full border-red-100/80 shadow-[0_18px_35px_-30px_rgba(30,41,59,0.35)]">
                <CardHeader className="space-y-3 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
                      {report.course?.subject_code}
                    </p>

                    <span
                      className={`status-badge inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${statusStyles[report.status] || statusStyles.Pending}`}
                    >
                      <CircleCheck size={12} />
                      {report.status}
                    </span>
                  </div>

                  <CardTitle className="text-lg leading-6 text-slate-900">
                    {report.course?.subject_name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm text-slate-600">
                    <p className="font-medium text-slate-700">Semester {report.course?.semester}</p>
                    <p className="flex items-center gap-2">
                      <CalendarDays size={14} className="text-slate-500" />
                      Generated: {new Date(report.generated_at).toLocaleDateString()}
                    </p>
                    {report.submitted_at && (
                      <p className="flex items-center gap-2">
                        <Clock3 size={14} className="text-slate-500" />
                        Submitted: {new Date(report.submitted_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={downloadingId === report.id}
                      onClick={() => handleDownload(report)}
                    >
                      <Download size={16} className="mr-2" />
                      {downloadingId === report.id ? "..." : "Download"}
                    </Button>

                    {report.status === "Generated" && (
                      <Button
                        className="flex-1"
                        disabled={submittingId === report.id}
                        onClick={() => handleSubmit(report.id)}
                      >
                        <Send size={16} className="mr-2" />
                        {submittingId === report.id ? "..." : "Submit"}
                      </Button>
                    )}

                    {report.status === "Submitted" && (
                      <Button
                        variant="outline"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                        disabled={submittingId === report.id}
                        onClick={() => handleUnsubmit(report.id)}
                      >
                        Unsubmit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div variants={sectionVariants}>
        <Card className="border-red-100/80 bg-red-50/50">
          <CardContent className="pt-6 md:pt-8">
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <FileSpreadsheet size={16} className="text-red-700 shrink-0" />
              <span>Submit generated reports so that the course coordinator or auditor can approve them.</span>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
