import { CalendarDays, CircleCheck, Clock3, Download, FileSpreadsheet, Loader2 } from "lucide-react";
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
import { downloadReportFileByOutputId, getReports } from "../lib/api";

const statusStyles = {
  Generated: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
  Processing: "border-sky-200 bg-sky-50 text-sky-700",
};

async function handleDownloadReport(report) {
  if (!report.outputId) {
    throw new Error("No downloadable report is available for this subject.");
  }

  const { blob } = await downloadReportFileByOutputId(report.outputId, report.outputType || "report");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${report.subjectCode}_OFFICIAL_REPORT.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Reports({ user }) {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState("");

  useEffect(() => {
    async function loadReports() {
      if (!user) {
        return;
      }

      try {
        const data = await getReports();
        setReports(data || []);
      } catch (loadError) {
        setError(loadError.message || "Failed to load reports.");
      }
    }

    loadReports();
  }, [user]);

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
            <CardTitle className="text-2xl text-red-950">Reports</CardTitle>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              View and download generated CO attainment reports for your assigned subjects.
            </p>
          </CardHeader>
        </Card>
      </motion.div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <motion.div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {reports.map((report) => {
          const canDownload = report.status === "Generated";

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
                      {report.subjectCode}
                    </p>

                    <span
                      className={`status-badge inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${statusStyles[report.status] || statusStyles.Pending}`}
                    >
                      {report.status === "Generated" ? (
                        <CircleCheck size={12} />
                      ) : report.status === "Processing" ? (
                        <Loader2 size={12} className="spinner" />
                      ) : (
                        <Clock3 size={12} />
                      )}
                      {report.status}
                    </span>
                  </div>

                  <CardTitle className="text-lg leading-6 text-slate-900">
                    {report.subjectName}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm text-slate-600">
                    <p className="font-medium text-slate-700">{report.semester}</p>
                    <p className="flex items-center gap-2">
                      <CalendarDays size={14} className="text-slate-500" />
                      {report.generatedOn
                        ? `Generated: ${report.generatedOn}`
                        : "Generated: Not available yet"}
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    disabled={!canDownload || downloadingId === report.id}
                    onClick={async () => {
                      if (!user) {
                        setError("Please log in again.");
                        return;
                      }

                      setDownloadingId(report.id);
                      try {
                        await handleDownloadReport(report);
                      } catch (downloadError) {
                        setError(downloadError.message || "Failed to download report.");
                      } finally {
                        setDownloadingId("");
                      }
                    }}
                  >
                    <Download size={16} className="mr-2" />
                    {downloadingId === report.id ? "Downloading..." : "Download Report"}
                  </Button>

                  {report.status !== "Generated" && (
                    <p className="text-xs text-slate-500">
                      Report download is enabled once processing is completed.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div variants={sectionVariants}>
        <Card className="border-red-100/80 bg-red-50/50">
          <CardContent>
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <FileSpreadsheet size={16} className="text-red-700" />
              Reports are organized by subject and reflect the latest generated attainment status.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
