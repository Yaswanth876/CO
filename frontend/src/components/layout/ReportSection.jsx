import { FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { cardVariants } from "../../lib/animations";
import {
  downloadReportFileByOutputId,
  getReports,
  processPhase1,
  processPhase2,
  processPhase3,
} from "../../lib/api";

export default function ReportSection({
  completed,
  uploadedFiles,
  parametersCompleted,
  onGenerated,
  subjectId,
  subjectCode,
  templatePath,
  onTemplatePathChange,
}) {
  const requiredFiles = 7;
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [message, setMessage] = useState("");

  const uploadedCount = Object.values(uploadedFiles || {}).filter(Boolean).length;
  const allUploaded = uploadedCount === requiredFiles;
  const hasTemplatePath = Boolean(templatePath?.trim());
  const canGenerate =
    allUploaded &&
    parametersCompleted &&
    hasTemplatePath &&
    !isGenerating &&
    !generated &&
    !!subjectId;

  const statusMessage = generated
    ? "Report generated successfully and downloaded."
    : canGenerate
    ? "Upload and parameter steps are complete. You can generate the report."
    : !allUploaded
    ? `Upload all files to enable report generation (${uploadedCount}/7 uploaded)`
    : !hasTemplatePath
    ? "Enter the Stage 3 template path to enable report generation."
    : "Complete the parameter section to enable report generation.";

  async function handleGenerate() {
    if (!canGenerate) {
      return;
    }
    if (!subjectId || !subjectCode) {
      setMessage("Please log in again.");
      return;
    }

    setIsGenerating(true);
    setMessage("");

    try {
      await processPhase1(subjectId);
      await processPhase2(subjectId, templatePath);
      await processPhase3(subjectId);

      const reports = await getReports();
      const subjectReport = reports.find((report) => report.subjectId === subjectId);
      if (!subjectReport?.outputId) {
        throw new Error("Final report was generated but could not be located for download.");
      }

      const { blob } = await downloadReportFileByOutputId(subjectReport.outputId, subjectReport.outputType);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${subjectCode}_OFFICIAL_REPORT.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setGenerated(true);
      setMessage("Report generated and downloaded.");
      onGenerated?.();
    } catch (error) {
      setMessage(error.message || "Failed to generate report.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <motion.div variants={cardVariants}>
      <Card className="border-red-100/80 shadow-[0_16px_35px_-32px_rgba(15,23,42,0.65)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-950">
            <FileSpreadsheet size={18} />
            Report Generation Section
            <AnimatePresence>
              {(completed || generated) && (
                <motion.span
                  className="ml-2 flex items-center gap-1 text-xs text-emerald-700"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 280, damping: 20 }}
                >
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  Completed
                </motion.span>
              )}
            </AnimatePresence>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <AnimatePresence mode="wait">
            <motion.p
              key={statusMessage}
              className={`text-sm ${
                generated ? "text-emerald-700 font-medium" : "text-slate-500"
              }`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              {statusMessage}
            </motion.p>
          </AnimatePresence>

          <AnimatePresence>
            {isGenerating && (
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 size={14} className="spinner text-red-700" />
                  Processing files and computing CO attainment...
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-400"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.6, ease: "easeInOut" }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Generate CO Attainment Report
              </p>
              <p className="text-xs text-slate-500">
                This will process uploaded files and compute final CO attainment.
              </p>
            </div>

            <motion.div whileTap={canGenerate ? { scale: 0.97 } : {}}>
              <Button
                className="btn-press min-w-[200px]"
                onClick={handleGenerate}
                disabled={!canGenerate}
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="spinner" />
                    Generating...
                  </span>
                ) : generated ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={14} />
                    Report Generated
                  </span>
                ) : (
                  "Generate Report"
                )}
              </Button>
            </motion.div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Stage 3 template path
            </p>
            <Input
              placeholder="Example: D:/CO/templates/CO_ATTAINMENT_TEMPLATE.xlsx"
              value={templatePath || ""}
              onChange={(event) => onTemplatePathChange?.(event.target.value)}
              className="input-focus-motion"
            />
            {!hasTemplatePath ? (
              <p className="text-xs text-red-600">Template path is required for Phase 2 processing.</p>
            ) : null}
          </div>

          {message ? <p className="text-xs text-slate-600">{message}</p> : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
