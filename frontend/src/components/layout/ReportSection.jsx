import { FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { cardVariants } from "../../lib/animations";
import {
  downloadReportFileByOutputId,
  getSubjectReports,
} from "../../lib/api";

export default function ReportSection({
  completed,
  subjectId,
  subjectCode,
  templatePath,
  onTemplatePathChange,
}) {
  const [message, setMessage] = useState("");
  const hasTemplatePath = Boolean(templatePath?.trim());

  async function downloadLatestReportByType(outputType, fallbackName) {
    const reports = await getSubjectReports(subjectId);
    const target = reports.find((report) => report.type === outputType);

    if (!target?.id) {
      throw new Error(`No ${fallbackName} is available for download yet.`);
    }

    const { blob } = await downloadReportFileByOutputId(target.id, outputType);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${subjectCode}_${fallbackName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleDownloadOnly(outputType, fallbackName) {
    if (!subjectId || !subjectCode) {
      setMessage("Please log in again.");
      return;
    }

    try {
      await downloadLatestReportByType(outputType, fallbackName);
      setMessage(`${fallbackName.replaceAll("_", " ")} downloaded.`);
    } catch (error) {
      setMessage(error.message || "Download failed.");
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
              {completed && (
                <motion.span
                  className="ml-2 flex items-center gap-1 text-xs text-red-700"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 280, damping: 20 }}
                >
                  <CheckCircle2 size={13} className="text-red-700" />
                  Completed
                </motion.span>
              )}
            </AnimatePresence>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <AnimatePresence mode="wait">
            <motion.p
              key={String(hasTemplatePath)}
              className="text-sm text-slate-500"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              Generate actions are available inside each semester upload block.
              Use this section for template path and downloading generated reports.
            </motion.p>
          </AnimatePresence>

          <div className="space-y-5">
            <div className="space-y-3 rounded-lg border border-red-100 p-4">
              <p className="text-sm font-semibold text-slate-800">Early-sem</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadOnly("EARLY_SEM_REPORT", "EARLY_SEM_FEEDBACK")}
                >
                  Download Early-sem Feedback
                </Button>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-red-100 p-4">
              <p className="text-sm font-semibold text-slate-800">Mid-sem</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadOnly("MID_SEM_REPORT", "MID_SEM_REPORT")}
                >
                  Download Mid-sem Report
                </Button>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-red-100 p-4">
              <p className="text-sm font-semibold text-slate-800">End-sem</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadOnly("EARLY_SEM_REPORT", "EARLY_SEM_REPORT")}
                >
                  Download CAT 1 Report
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownloadOnly("MID_SEM_REPORT", "MID_SEM_REPORT")}
                >
                  Download CAT 2 Report
                </Button>
              </div>
            </div>
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
            {!hasTemplatePath ? <p className="text-xs text-red-600">Template path is required for Mid-sem report generation.</p> : null}
          </div>

          {message ? <p className="text-xs text-slate-600">{message}</p> : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
