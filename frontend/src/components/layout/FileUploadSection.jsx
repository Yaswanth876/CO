import { ChevronDown, Upload, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { collapsibleVariants, cardVariants } from "../../lib/animations";
import {
  downloadReportFileByOutputId,
  getSubjectReports,
  processPhase1,
  processPhase2,
  uploadWorkspaceFile,
} from "../../lib/api";

const stageUploadFields = [
  {
    stage: "Early-sem",
    files: [
      { key: "CAT1_QP", label: "CAT 1 Question Paper (.docx)" },
      { key: "CAT1_MARKS", label: "CAT 1 Marksheet (.xlsx)" },
      { key: "ASS1", label: "Assignment 1 Marksheet (.xlsx)" },
    ],
  },
  {
    stage: "Mid-sem",
    files: [
      { key: "CAT2_QP", label: "CAT 2 Question Paper (.docx)" },
      { key: "CAT2_MARKS", label: "CAT 2 Marksheet (.xlsx)" },
      { key: "ASS2", label: "Assignment 2 Marksheet (.xlsx)" },
    ],
  },
  {
    stage: "End-sem",
    files: [
      { key: "TERMINAL_QP", label: "Terminal Question Paper (.docx)" },
      { key: "TERMINAL", label: "Terminal Marksheet (.xlsx)" },
    ],
  },
];

const uploadFields = stageUploadFields.flatMap((group) => group.files);

export default function FileUploadSection({
  isOpen,
  completed,
  onUploadChange,
  onToggle,
  uploadedFiles = {},
  user,
  subjectId,
  subjectCode,
}) {
  const [selectedFiles, setSelectedFiles] = useState({});
  const [uploadingKey, setUploadingKey] = useState("");
  const [generatingStage, setGeneratingStage] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  const uploadedCount = Object.values(uploadedFiles).filter(Boolean).length;
  const progressPercent = (uploadedCount / uploadFields.length) * 100;

  const earlyReady = ["CAT1_QP", "CAT1_MARKS", "ASS1"].every((key) => uploadedFiles?.[key]);
  const midReady = ["CAT2_QP", "CAT2_MARKS", "ASS2"].every((key) => uploadedFiles?.[key]);

  const handleUpload = async (key) => {
    if (!selectedFiles[key]) {
      setUploadMessage("Please choose a file before uploading.");
      return;
    }
    if (!subjectId || !subjectCode || !user?.email) {
      setUploadMessage("Subject context is not ready. Please refresh and try again.");
      return;
    }
    if (uploadedFiles[key]) {
      return;
    }

    setUploadingKey(key);
    setUploadMessage("");

    try {
      const response = await uploadWorkspaceFile(subjectId, subjectCode, key, selectedFiles[key]);
      const nextFiles = { ...uploadedFiles, [key]: true };
      onUploadChange?.(nextFiles);
      setUploadMessage(response.message || `${key} uploaded.`);
    } catch (error) {
      setUploadMessage(error.message || "Upload failed.");
    } finally {
      setUploadingKey("");
    }
  };

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

  function canGenerateStage(stage) {
    if (stage === "Early-sem") {
      return earlyReady && !!subjectId && generatingStage !== stage;
    }
    if (stage === "Mid-sem") {
      return earlyReady && midReady && !!subjectId && generatingStage !== stage;
    }
    return false;
  }

  async function handleGenerateStage(stage) {
    if (!subjectId || !subjectCode || !canGenerateStage(stage)) {
      return;
    }

    setGeneratingStage(stage);
    setUploadMessage("");

    try {
      if (stage === "Early-sem") {
        await processPhase1(subjectId);
        await downloadLatestReportByType("EARLY_SEM_REPORT", "EARLY_SEM_FEEDBACK");
        setUploadMessage("Early-sem feedback generated and downloaded.");
      } else if (stage === "Mid-sem") {
        await processPhase2(subjectId);
        await downloadLatestReportByType("MID_SEM_REPORT", "MID_SEM_REPORT");
        setUploadMessage("Mid-sem report generated and downloaded.");
      }
    } catch (error) {
      setUploadMessage(error.message || `Failed to generate ${stage} report.`);
    } finally {
      setGeneratingStage("");
    }
  }

  return (
    <motion.div variants={cardVariants}>
      <Card className="border-red-100/80 shadow-[0_16px_35px_-32px_rgba(15,23,42,0.65)] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-red-950">
              <Upload size={18} />
              File Upload Section
              <AnimatePresence>
                {completed && (
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
            <button
              type="button"
              className="h-8 w-8 p-0 rounded-md inline-flex items-center justify-center text-slate-600 hover:bg-red-50 hover:text-red-900 transition-colors focus-visible:ring-2 focus-visible:ring-red-400/40 outline-none"
              onClick={onToggle}
              aria-label="Toggle upload section"
            >
              <ChevronDown
                size={16}
                className={`section-chevron ${isOpen ? "open" : ""}`}
              />
            </button>
          </div>
        </CardHeader>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="upload-content"
              variants={collapsibleVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">Upload Progress</p>
                    <span className="text-xs font-semibold tabular-nums text-slate-500">
                      {uploadedCount} / {uploadFields.length}
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {stageUploadFields.map((group, groupIdx) => (
                    <div key={group.stage} className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {group.stage}
                      </p>
                      {group.files.map((item, idx) => {
                        const isDone = !!uploadedFiles[item.key];
                        const isUploading = uploadingKey === item.key;
                        const sequence = groupIdx * 3 + idx;

                        return (
                          <motion.div
                            key={item.key}
                            className={`upload-row grid gap-3 rounded-xl border p-4 shadow-sm md:grid-cols-[1.4fr_2fr_auto_auto] md:items-center ${
                              isDone ? "uploaded" : "border-slate-200 bg-white"
                            }`}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: sequence * 0.04, duration: 0.3 }}
                          >
                            <p className="text-sm font-medium text-slate-700">
                              Upload {item.label}
                            </p>

                            <Input
                              type="file"
                              className="input-focus-motion bg-slate-50 text-sm"
                              disabled={isDone}
                              onChange={(event) => {
                                const file = event.target.files?.[0] || null;
                                setSelectedFiles((prev) => ({ ...prev, [item.key]: file }));
                              }}
                            />

                            <Button
                              className="btn-press w-full md:w-auto"
                              onClick={() => handleUpload(item.key)}
                              disabled={isDone || isUploading || !selectedFiles[item.key]}
                            >
                              {isUploading ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 size={14} className="spinner" />
                                  Uploading
                                </span>
                              ) : (
                                "Upload"
                              )}
                            </Button>

                            <AnimatePresence mode="wait">
                              {isDone ? (
                                <motion.span
                                  key="done"
                                  className="flex items-center gap-1 text-xs font-semibold text-emerald-600"
                                  initial={{ opacity: 0, scale: 0.6 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.6 }}
                                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                                >
                                  <CheckCircle2 size={13} />
                                  Uploaded
                                </motion.span>
                              ) : (
                                <motion.span
                                  key="pending"
                                  className="text-xs font-medium text-slate-400"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                >
                                  Not Uploaded
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}

                      {group.stage !== "End-sem" ? (
                        <div className="flex items-center gap-3 pt-1 pb-3">
                          <Button
                            className="btn-press min-w-[220px]"
                            onClick={() => handleGenerateStage(group.stage)}
                            disabled={!canGenerateStage(group.stage)}
                          >
                            {generatingStage === group.stage ? (
                              <span className="flex items-center gap-2">
                                <Loader2 size={14} className="spinner" />
                                Generating...
                              </span>
                            ) : group.stage === "Early-sem" ? (
                              "Generate Early-sem Report"
                            ) : (
                              "Generate Mid-sem Report"
                            )}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                {uploadMessage ? <p className="text-xs text-slate-600">{uploadMessage}</p> : null}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
