import { ChevronDown, Upload, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { collapsibleVariants, cardVariants } from "../../lib/animations";
import { uploadWorkspaceFile } from "../../lib/api";

const uploadFields = [
  { key: "CAT1_QP", label: "CAT 1 Question Paper (.docx)" },
  { key: "CAT1_MARKS", label: "CAT 1 Marks (.xlsx)" },
  { key: "CAT2_QP", label: "CAT 2 Question Paper (.docx)" },
  { key: "CAT2_MARKS", label: "CAT 2 Marks (.xlsx)" },
  { key: "ASS1", label: "Assignment 1 Marks (.xlsx)" },
  { key: "ASS2", label: "Assignment 2 Marks (.xlsx)" },
  { key: "TERMINAL", label: "Terminal Marks (.xlsx)" },
];

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
  const [uploadMessage, setUploadMessage] = useState("");

  const uploadedCount = Object.values(uploadedFiles).filter(Boolean).length;
  const progressPercent = (uploadedCount / uploadFields.length) * 100;

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

                <div className="space-y-2">
                  {uploadFields.map((item, idx) => {
                    const isDone = !!uploadedFiles[item.key];
                    const isUploading = uploadingKey === item.key;

                    return (
                      <motion.div
                        key={item.key}
                        className={`upload-row grid gap-3 rounded-xl border p-4 shadow-sm md:grid-cols-[1.4fr_2fr_auto_auto] md:items-center ${
                          isDone ? "uploaded" : "border-slate-200 bg-white"
                        }`}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04, duration: 0.3 }}
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
